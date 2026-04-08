// RS-109M Config encoding/decoding - port of rs109m.py RS109_config class

export function fromXBit(ba, x = 6, digitalAlphaEncoding = true) {
    if (x < 1 || x > 7) throw new Error("BitLen must be between 1 and 7");
    if (ba.length < 1) throw new Error("Must supply non-empty array");

    const n = Math.floor(ba.length * 8 / x);
    const b = new Uint8Array(n);

    for (let i = 0; i < n; i++) {
        const pos = Math.floor(i * x / 8);
        const shift = (i * x) % 8;

        b[i] = (ba[pos] >> shift) & ((1 << x) - 1);
        const remaining = shift + x - 8;
        if (remaining > 0 && pos + 1 < ba.length) {
            b[i] |= (ba[pos + 1] << (8 - shift)) & ((1 << x) - 1);
        }
        if (digitalAlphaEncoding && (b[i] & 0x20) !== 0x20 && b[i] !== 0) {
            b[i] = (b[i] & 0x1f) | 0x40;
        }
    }
    return b;
}

export function toXBit(str, x = 6, digitalAlphaEncoding = true) {
    if (str.length < 1) return new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);

    let ba;
    if (digitalAlphaEncoding) {
        ba = new Uint8Array(Array.from(str.toUpperCase()).map(c => c.charCodeAt(0)));
    } else {
        ba = new Uint8Array(Array.from(str).map(c => c.charCodeAt(0)));
    }

    let n = Math.floor(ba.length * x / 8);
    if ((ba.length * x) % 8 > 0) n += 1;
    if (n === 0) n = 1;
    const b = new Uint8Array(n);

    for (let i = 0; i < ba.length; i++) {
        const pos = Math.floor(i * x / 8);
        const shift = (i * x) % 8;
        ba[i] = ba[i] & ((1 << x) - 1);
        b[pos] |= (ba[i] << shift) & 0xff;
        const remaining = shift + x - 8;
        if (remaining > 0) {
            b[pos + 1] |= (ba[i] >> (8 - shift));
        }
    }
    return b;
}

const DEFAULT_CONFIG = new Uint8Array([
    0x04, 0x2d, 0xd2, 0x7f, 0x06, 0x31, 0x30, 0x39, 0x30, 0x34, 0x30, 0x31, 0x37, 0x33, 0x20, 0x20,
    0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x01, 0x00, 0x00, 0xe0, 0x24, 0x01, 0x00,
    0x35, 0x3d, 0xcb, 0xf1, 0x23, 0x00, 0x08, 0xa0, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
]);

export const CONFIG_LEN = 0x40;

export class RS109Config {
    constructor(config = null) {
        this._config = new Uint8Array(DEFAULT_CONFIG);
        if (config) this.setRawConfig(config);
    }

    getRawConfig() { return this._config.slice(0, CONFIG_LEN); }

    setRawConfig(bytes) {
        const src = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
        const len = Math.min(src.length, 0xff);
        this._config = new Uint8Array(DEFAULT_CONFIG);
        this._config.set(src.subarray(0, len), 0);
    }

    get interval() { return this._config[0] * 30; }
    set interval(seconds) {
        seconds = Math.max(30, Math.min(600, Math.floor(seconds)));
        this._config[0] = Math.floor(seconds / 30);
    }

    get mmsi() {
        return (this._config[1] | (this._config[2] << 8) |
                (this._config[3] << 16) | ((this._config[4] & 0xff) << 24)) >>> 0;
    }
    set mmsi(v) {
        v = Math.floor(v);
        this._config[1] = v & 0xff;
        this._config[2] = (v >> 8) & 0xff;
        this._config[3] = (v >> 16) & 0xff;
        this._config[4] = (v >> 24) & 0xff;
    }

    get name() {
        return String.fromCharCode(...this._config.slice(5, 25)).trim();
    }
    set name(v) {
        const safe = v.replace(/[^\x20-\x7e]/g, '').toUpperCase().padEnd(20, ' ').slice(0, 20);
        for (let i = 0; i < 20; i++) this._config[5 + i] = safe.charCodeAt(i);
    }

    get serialNumber() {
        return this._config[25] + (this._config[26] << 8) + ((this._config[27] & 0x0f) << 16);
    }
    set serialNumber(v) {
        v = Math.floor(v) & 0xfffff;
        this._config[25] = v & 0xff;
        this._config[26] = (v >> 8) & 0xff;
        this._config[27] = (this._config[27] & 0xf0) | ((v >> 16) & 0x0f);
    }

    get unitModel() { return this._config[27] >> 4; }
    set unitModel(v) {
        v = Math.floor(v) & 0x0f;
        this._config[27] = (this._config[27] & 0x0f) | (v << 4);
    }

    get vendorId() {
        const vid = [
            (this._config[29] >> 4) | ((this._config[30] & 0x03) << 4) | 0x40,
            (this._config[28] >> 6) | ((this._config[29] & 0x07) << 2) | 0x40,
            (this._config[28] & 0x3f) | 0x40,
        ];
        return vid.map(c => String.fromCharCode(c)).join('').replace(/[^A-Za-z0-9]/g, '');
    }
    set vendorId(v) {
        const safe = v.replace(/[^A-Za-z0-9]/g, '').toUpperCase().padEnd(3, '\x00').slice(0, 3);
        const b = Array.from(safe).map(c => c.charCodeAt(0));
        this._config[28] = (b[2] & 0x3f) | ((b[1] << 6) & 0xff);
        this._config[29] = ((b[1] >> 2) & 0x0f) | ((b[0] << 4) & 0xff);
        this._config[30] = (this._config[30] & ~0x0f) | ((b[0] & 0x3f) >> 4);
    }

    get shipType() { return this._config[31]; }
    set shipType(v) { this._config[31] = Math.floor(v) & 0xff; }

    get callsign() {
        const decoded = fromXBit(this._config.slice(32, 38), 6, true);
        const s = String.fromCharCode(...decoded).split('').reverse().join('');
        return s.replace(/[^A-Za-z0-9]/g, '');
    }
    set callsign(v) {
        const safe = v.replace(/[^A-Za-z0-9]/g, '').slice(0, 7);
        const reversed = safe.split('').reverse().join('');
        const encoded = toXBit(reversed);
        const padded = new Uint8Array(6);
        padded.set(encoded.subarray(0, Math.min(encoded.length, 6)));
        this._config.set(padded, 32);
    }

    get refA() {
        return (this._config[39] >> 5) | ((this._config[38] & 0x3f) << 3);
    }
    set refA(a) {
        a = Math.floor(a) & 0x1ff;
        this._config[39] = (this._config[39] & 0x1f) | ((a << 5) & 0xff);
        this._config[38] = (this._config[38] & 0xc0) | ((a >> 3) & 0x3f);
    }

    get refB() {
        return (this._config[40] >> 4) | ((this._config[39] & 0x1f) << 4);
    }
    set refB(b) {
        b = Math.floor(b) & 0x1ff;
        this._config[40] = (this._config[40] & 0x0f) | ((b << 4) & 0xff);
        this._config[39] = (this._config[39] & 0xe0) | ((b >> 4) & 0x1f);
    }

    get refC() {
        return (this._config[41] >> 6) | ((this._config[40] & 0x0f) << 2);
    }
    set refC(c) {
        c = Math.floor(c) & 0x3f;
        this._config[41] = (this._config[41] & 0x3f) | ((c << 6) & 0xff);
        this._config[40] = (this._config[40] & 0xf0) | ((c >> 2) & 0x0f);
    }

    get refD() { return this._config[41] & 0x3f; }
    set refD(d) {
        this._config[41] = (this._config[41] & 0xc0) | (Math.floor(d) & 0x3f);
    }

    hexDump(len = CONFIG_LEN) {
        return Array.from(this._config.slice(0, len)).map(b => b.toString(16).padStart(2, '0')).join(' ');
    }
}
