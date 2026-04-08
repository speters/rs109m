import { RS109Config } from './rs109m-config.js';
import { RS109Protocol } from './rs109m-protocol.js';

const protocol = new RS109Protocol();
let config = new RS109Config();

const $ = id => document.getElementById(id);

function status(msg, isError = false) {
    const el = $('status');
    el.textContent = msg;
    el.className = isError ? 'error' : '';
}

function setProgress(pct) {
    $('progress').style.width = pct + '%';
}

function setButtonsEnabled(connected) {
    $('btn-read').disabled = !connected;
    $('btn-write').disabled = !connected;
    $('btn-set-psw').disabled = !connected;
    $('btn-clr-psw').disabled = !connected;
    $('btn-connect').textContent = connected ? 'Disconnect' : 'Connect';
}

function populateUI() {
    $('mmsi').value = config.mmsi;
    $('name').value = config.name;
    $('tx-timer').value = config.interval;
    $('ship-type').value = config.shipType;
    $('callsign').value = config.callsign;
    $('vendor-id').value = config.vendorId;
    $('unit-model').value = config.unitModel;
    $('unit-serial').value = config.serialNumber;
    $('ref-a').value = config.refA;
    $('ref-b').value = config.refB;
    $('ref-c').value = config.refC;
    $('ref-d').value = config.refD;
    updateComputed();
    $('hex-dump').textContent = config.hexDump();
}

function collectUI() {
    config.mmsi = parseInt($('mmsi').value) || 0;
    config.name = $('name').value;
    config.interval = parseInt($('tx-timer').value) || 30;
    config.shipType = parseInt($('ship-type').value) || 0;
    config.callsign = $('callsign').value;
    config.vendorId = $('vendor-id').value;
    config.unitModel = parseInt($('unit-model').value) || 0;
    config.serialNumber = parseInt($('unit-serial').value) || 0;
    config.refA = parseInt($('ref-a').value) || 0;
    config.refB = parseInt($('ref-b').value) || 0;
    config.refC = parseInt($('ref-c').value) || 0;
    config.refD = parseInt($('ref-d').value) || 0;
}

function updateComputed() {
    const a = parseInt($('ref-a').value) || 0;
    const b = parseInt($('ref-b').value) || 0;
    const c = parseInt($('ref-c').value) || 0;
    const d = parseInt($('ref-d').value) || 0;
    $('ship-length').value = a + b;
    $('ship-width').value = c + d;
    $('battery-hint').textContent = `(may be battery: ${(a / 10).toFixed(1)}V)`;
    $('serial-hint').textContent = `(may be battery: ${parseInt($('unit-serial').value) || 0}%)`;
}

async function doConnect() {
    if (protocol.isConnected) {
        await protocol.disconnect();
        setButtonsEnabled(false);
        status('Disconnected');
        setProgress(0);
        return;
    }

    try {
        status('Connecting...');
        setProgress(10);
        await protocol.connect();

        status('Authenticating...');
        setProgress(30);
        const pw = $('old-psw').value || null;
        const ok = await protocol.authenticate(pw);
        if (!ok) {
            await protocol.disconnect();
            setButtonsEnabled(false);
            status('Authentication failed', true);
            setProgress(0);
            return;
        }

        setButtonsEnabled(true);
        status('Connected');
        setProgress(100);
    } catch (e) {
        await protocol.disconnect().catch(() => {});
        setButtonsEnabled(false);
        status('Connection failed: ' + e.message, true);
        setProgress(0);
    }
}

async function doRead() {
    try {
        status('Reading config...');
        setProgress(50);
        const data = await protocol.readConfig();
        if (!data) {
            status('Failed to read config', true);
            setProgress(0);
            return;
        }
        config.setRawConfig(data);
        populateUI();
        status('Config read successfully');
        setProgress(100);
    } catch (e) {
        status('Read error: ' + e.message, true);
        setProgress(0);
    }
}

async function doWrite() {
    try {
        collectUI();
        status('Writing config...');
        setProgress(50);
        $('hex-dump').textContent = config.hexDump();
        const ok = await protocol.writeConfig(config.getRawConfig());
        if (!ok) {
            status('Failed to write config', true);
            setProgress(0);
            return;
        }
        status('Config written successfully');
        setProgress(100);
    } catch (e) {
        status('Write error: ' + e.message, true);
        setProgress(0);
    }
}

async function doSetPsw() {
    const newPw = $('new-psw').value;
    const newPw2 = $('new-psw2').value;
    if (newPw !== newPw2) {
        status('New passwords do not match', true);
        return;
    }
    if (!/^[0-9]{1,6}$/.test(newPw)) {
        status('Password must be 1-6 digits', true);
        return;
    }
    try {
        status('Setting password...');
        setProgress(50);
        const ok = await protocol.setPassword($('old-psw').value, newPw);
        status(ok ? 'Password set successfully' : 'Set password failed', !ok);
        setProgress(ok ? 100 : 0);
    } catch (e) {
        status('Set password error: ' + e.message, true);
        setProgress(0);
    }
}

async function doClrPsw() {
    try {
        status('Clearing password...');
        setProgress(50);
        const ok = await protocol.clearPassword($('old-psw').value);
        status(ok ? 'Password cleared successfully' : 'Clear password failed', !ok);
        setProgress(ok ? 100 : 0);
    } catch (e) {
        status('Clear password error: ' + e.message, true);
        setProgress(0);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setButtonsEnabled(false);
    populateUI();

    $('btn-connect').addEventListener('click', doConnect);
    $('btn-read').addEventListener('click', doRead);
    $('btn-write').addEventListener('click', doWrite);
    $('btn-set-psw').addEventListener('click', doSetPsw);
    $('btn-clr-psw').addEventListener('click', doClrPsw);

    for (const id of ['ref-a', 'ref-b', 'ref-c', 'ref-d', 'unit-serial']) {
        $(id).addEventListener('input', updateComputed);
    }

    if (!('serial' in navigator)) {
        status('WebSerial not available. Requires Chromium/Chrome/Edge over localhost or HTTPS.', true);
        $('btn-connect').disabled = true;
    }
});
