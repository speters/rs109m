// RS-109M WebSerial protocol layer

const MAX_RETRIES = 3;
const READ_TIMEOUT_MS = 3000;
const PASSWORD_DEFAULT = '000000';
const PASSWORD_MAXLEN = 6;

export class RS109Protocol {
    constructor() {
        this._port = null;
        this._reader = null;
        this._writer = null;
    }

    get isConnected() { return this._port !== null; }

    async connect() {
        this._port = await navigator.serial.requestPort();
        await this._port.open({
            baudRate: 115200, dataBits: 8, parity: 'none', stopBits: 1,
            bufferSize: 4096, flowControl: 'none',
        });

        // RTS toggle to wake/reset device (hardware signal on manufacturer cable)
        await this._port.setSignals({ requestToSend: false });
        await this._port.setSignals({ requestToSend: true });

        // Drain any stale data
        await this._readWithTimeout(4096, 500).catch(() => {});
    }

    async disconnect() {
        if (this._reader) {
            await this._reader.cancel().catch(() => {});
            this._reader.releaseLock();
            this._reader = null;
        }
        if (this._writer) {
            this._writer.releaseLock();
            this._writer = null;
        }
        if (this._port) {
            await this._port.close().catch(() => {});
            this._port = null;
        }
    }

    async _write(bytes) {
        const writer = this._port.writable.getWriter();
        try {
            await writer.write(new Uint8Array(bytes));
        } finally {
            writer.releaseLock();
        }
    }

    async _readWithTimeout(count, timeoutMs = READ_TIMEOUT_MS) {
        const reader = this._port.readable.getReader();
        const result = new Uint8Array(count);
        let offset = 0;

        try {
            const deadline = Date.now() + timeoutMs;
            while (offset < count) {
                const remaining = deadline - Date.now();
                if (remaining <= 0) break;

                const { value, done } = await Promise.race([
                    reader.read(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('timeout')), remaining)
                    ),
                ]).catch(() => ({ value: null, done: true }));

                if (done || !value) break;
                const chunk = Math.min(value.length, count - offset);
                result.set(value.subarray(0, chunk), offset);
                offset += chunk;
            }
        } finally {
            reader.releaseLock();
        }
        return { data: result.subarray(0, offset), count: offset };
    }

    async _flushInput() {
        await this._readWithTimeout(4096, 100).catch(() => {});
    }

    async sendCommand(txBytes, expectedPrefix, readExtra = 0) {
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            await this._flushInput();
            await this._write(txBytes);

            const prefixLen = expectedPrefix.length;
            const { data: header, count } = await this._readWithTimeout(prefixLen);

            if (count === prefixLen && header.every((b, i) => b === expectedPrefix[i])) {
                if (readExtra > 0) {
                    const { data: extra, count: extraCount } = await this._readWithTimeout(readExtra);
                    if (extraCount === readExtra) {
                        const full = new Uint8Array(prefixLen + readExtra);
                        full.set(header);
                        full.set(extra, prefixLen);
                        return full;
                    }
                    // Got prefix but not enough extra data, retry
                    continue;
                }
                return header;
            }
        }
        return null;
    }

    _preparePassword(password) {
        const pw = (password || PASSWORD_DEFAULT).padEnd(PASSWORD_MAXLEN, '0').slice(0, PASSWORD_MAXLEN);
        return new Uint8Array(Array.from(pw).map(c => c.charCodeAt(0)));
    }

    async authenticate(password = null) {
        let cmd;
        if (password !== null && password !== '') {
            const pwBytes = this._preparePassword(password);
            cmd = new Uint8Array([0x59, 0x01, 0x42, PASSWORD_MAXLEN, ...pwBytes]);
        } else {
            // Zero-length password bypass
            cmd = new Uint8Array([0x59, 0x01, 0x42, 0x00]);
        }

        let r = await this.sendCommand(cmd, [0x95, 0x20]);
        if (!r && password !== null && password !== '') {
            // Fallback: zero-length password seems to work even with a password set on some devices
            r = await this.sendCommand(new Uint8Array([0x59, 0x01, 0x42, 0x00]), [0x95, 0x20]);
        }
        return r !== null;
    }

    async readConfig() {
        const r = await this.sendCommand(new Uint8Array([0x51, 0x40]), [0x25, 0x40], 0x40);
        if (r && r.length === 2 + 0x40) return r.subarray(2);
        return null;
    }

    async writeConfig(configBytes) {
        const cmd = new Uint8Array(2 + 0x40);
        cmd[0] = 0x55;
        cmd[1] = 0x40;
        cmd.set(configBytes.subarray(0, 0x40), 2);
        const r = await this.sendCommand(cmd, [0x75, 0x40]);
        return r !== null;
    }

    async clearPassword(password) {
        const pwBytes = this._preparePassword(password);
        const cmd = new Uint8Array([0x59, 0x02, 0x42, PASSWORD_MAXLEN, ...pwBytes]);
        return (await this.sendCommand(cmd, [0x95, 0x20])) !== null;
    }

    async setPassword(oldPassword, newPassword) {
        const oldPw = this._preparePassword(oldPassword);
        const newPw = this._preparePassword(newPassword);
        const cmd = new Uint8Array([0x59, 0x03, 0x42, PASSWORD_MAXLEN, ...oldPw, ...newPw]);
        return (await this.sendCommand(cmd, [0x95, 0x20])) !== null;
    }
}
