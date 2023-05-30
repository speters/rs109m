#!/usr/bin/env python3

def fromxbit(ba, x = 6, digitalphaencoding = True):
    if ((x < 1) or (x > 7)):
        raise ValueError("BitLen must between 1 and 7")
    if len(ba) < 1:
        raise ValueError("Must supply non-empty array")

    n = len(ba) * 8 // x
    b = bytearray([0 for i in range(n)])

    for i in range(n):
        pos = i * x // 8
        shift = i * x % 8

        b[i] = (ba[pos] >> shift) & ((1 << x) -1)
        remaining = shift + x - 8
        if remaining > 0:
            b[i] |= (ba[pos + 1] << (8 -  shift)) & ((1 << x) -1)
        if digitalphaencoding and (b[i] & 0x20) != 0x20 and b[i] != 0:
            # not a digit, is alpha
            b[i] = (b[i] & 0x1f) | 0x40

    return b

def toxbit(ba, x = 6, digitalphaencoding = True):
    if ((x < 1) or (x > 7)):
        raise ValueError("BitLen must between 1 and 7")
    if len(ba) < 1:
        return [0xff, 0xff, 0xff, 0xff, 0xff, 0xff]

    if digitalphaencoding:
       ba = bytearray(ba.encode('ascii', 'ignore').decode().upper().encode('ascii'))

    n = len(ba) * x // 8
    if (len(ba) * x % 8) > 0:
        n += 1
    if n == 0:
        n = 1
    b = bytearray([0 for i in range(n)])

    for i in range(len(ba)):
        pos = i * x // 8
        shift = i * x % 8

        ba[i] = ba[i] & ((1 << x) -1)

        b[pos] |= (ba[i] << shift) & 0xff
        remaining = shift + x - 8
        # print(ba[i], " i=", i, " pos=", pos, " shift=", shift, " remaining=", remaining)
        if remaining > 0:
            b[pos +1] |= (ba[i] >> (8 - shift))
    return b


class RS109_config:
    default_config = bytearray([
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
            0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff
    ])
    default_len = 0x40

    def __init__(self, config = []):
           self.set_config(config)

    def get_config(self):
        return self._config

    def set_config(self, config):
        # TODO: implement differently, as setting config as slices config[34:38] might be convenient
        if config == []:
            # self._config = self.default_config[:self.default_len]
            self._config = self.default_config
        else:
            clen = 0xff if (len(config) > 0xff) else len(config)
            self._config = bytearray(config[0:clen] + self.default_config[clen:])

    config = property(get_config, set_config)

    def get_mmsi(self):
        mmsi = self._config[1] + (self._config[2]<<8) + (self._config[3]<<16) + ((self._config[4]&0xff)<<24)
        return mmsi

    def set_mmsi(self, mmsi):
        mmsi = int(mmsi)
        self._config[1] = mmsi & 0xff
        self._config[2] = (mmsi >> 8) & 0xff
        self._config[3] = (mmsi >> 16) & 0xff
        self._config[4] = (mmsi >> 24) & 0xff

    mmsi = property(get_mmsi, set_mmsi)

    def get_name(self):
        name = bytes(self._config[5:25]).decode('ascii').strip()
        return name

    def set_name(self, name):
        # TODO: check for invalid chars, this one is incomplete
        safe_name = name.encode('ascii', 'ignore').decode().upper().ljust(20, ' ').encode('ascii')
        self._config[5:25] = safe_name

    name = property(get_name, set_name)

    def __repr__(self):
        return '[ 0x' + self._config.hex('#').replace('#',', 0x') + ' ]'

    def get_interval(self):
        return self._config[0] * 30

    def set_interval(self, seconds):
        seconds = int(seconds)
        if seconds > 600:
            seconds = 600
        if seconds < 30:
            seconds = 30
        self._config[0] = seconds//30

    interval = property(get_interval, set_interval)

    def get_shipncargo(self):
        return int(self._config[31])

    def set_shipncargo(self,shiptype):
        self._config[31] = int(shiptype) & 0xff

    shipncargo = property(get_shipncargo, set_shipncargo)

    def get_vendorid(self):
        vid = [ (self._config[29] >> 4) | ((self._config[30]  & 0x03) << 4) | 0x40,
                (self._config[28] >> 6) | ((self.config[29] & 0x07) << 2) | 0x40,
                (self._config[28] & 0x3f) | 0x40 ]
        return  ''.join(c if c.isalnum() else '' for c in bytes(vid).decode())

    def set_vendorid(self, vid):
        # TODO: check for invalid chars, this one is incomplete
        safe_vid = vid.encode('ascii', 'ignore').decode().upper().ljust(3, '\x00')[:3].encode('ascii')
        print(safe_vid)
        self._config[28] = (safe_vid[2] & 0x3f) | ((safe_vid[1] << 6 ) & 0xff)
        self._config[29] = ((safe_vid[1] >> 2) & 0x0f) | ((safe_vid[0] << 4) & 0xff)
        self._config[30] = (self._config[30] & ~0x0f) | ((safe_vid[0] & 0x3f) >> 4)

    vendorid = property(get_vendorid, set_vendorid)

    def get_unitmodel(self):
        unitmodel = self._config[27] >> 4
        return unitmodel

    def set_unitmodel(self, unitmodel):
        unitmodel = int(unitmodel)
        if unitmodel < 0 or unitmodel > 15:
            raise ValueError("UnitModel must be 0 < unitmodel <= 15")
        self._config[27] = (self._config[27] & 0xf0) | ((int(unitmodel) & 0x0f) << 4)

    unitmodel = property(get_unitmodel, set_unitmodel)

    def get_sernum(self):
        sernum = self._config[25] + (self._config[26]<<8) + ((self._config[27] & 0x0f)<<16)
        return sernum

    def set_sernum(self, sernum):
        sernum = int(sernum)
        if sernum < 0 or sernum > ((1 << 20) -1):
            raise ValueError("UnitSernum must be 0 <= sernum <=", ((1 << 20) -1))
        self._config[25] = sernum & 0xff
        self._config[26] = (sernum >> 8) & 0xff
        self._config[27] = (self._config[27] & 0xf0) | ((sernum>> 16) & 0x0f)

    sernum = property(get_sernum, set_sernum)

    def get_callsign(self):
        # TODO: check if it is 32:37 or 32:38
        s = fromxbit(self._config[32:37], 6, True).decode('ascii')[::-1]
        return ''.join(c if c.isalnum() else '' for c in s)

    def set_callsign(self, cs):
        safe_cs = ''.join(c if c.isalnum() else '' for c in cs)
        self._config[32:37] = toxbit(safe_cs[::-1])

    callsign = property(get_callsign, set_callsign)

    def get_refa(self):
        return (self._config[39] >> 5) | ((self.config[38] & ((1<<6) -1)) << 3)

    def set_refa(self, a):
        if int(a) > (1<<9):
            raise ValueError("Reference a must be <= 511")
        if int(a) < 0:
            raise ValueError("Reference a must be >= 0")
        self._config[39] = (self._config[39] & ((1<<5) -1)) | (((int(a) & ((1<<6) -1)) << 5) & 0xff)
        self._config[38] = (self._config[38] & ~((1<<4) -1)) | ((int(a) & ((1<<9) -1)) >> 3)

    refa = property(get_refa, set_refa)

    def get_refb(self):
        return (self._config[40] >> 4) | ((self._config[39] & ((1<<5) -1)) << 4)

    def set_refb(self, b):
        if int(b) > (1<<9):
            raise ValueError("Reference b must be <= 511")
        if int(b) < 0:
            raise ValueError("Reference b must be >= 0")
        self._config[40] = (self._config[40] & ((1<<4) -1)) | (((int(b) & ((1<<6) -1)) << 4) & 0xff)
        self._config[39] = (self._config[39] & ~((1<<5) -1)) | ((int(b) & ((1<<9) -1)) >> 4)

    refb = property(get_refb, set_refb)

    def get_refc(self):
        return (self._config[41] >> 6) | ((self._config[40] & ((1<<4) -1)) << 2)

    def set_refc(self, c):
        if int(c) > (1<<6):
            raise ValueError("Reference c must be <= 63")
        if int(c) < 0:
            raise ValueError("Reference c must be >= 0")
        self._config[41] = (self._config[41] & ((1<<6) -1)) | (((int(c) & ((1<<6) -1)) << 6) & 0xff)
        self._config[40] = (self._config[40] & ~((1<<4) -1)) | ((int(c) & ((1<<6) -1)) >> 2)

    refc = property(get_refc, set_refc)

    def get_refd(self):
        return self._config[41] & ((1<<6) -1)

    def set_refd(self, d):
        if int(d) > (1<<6):
            raise ValueError("Reference d must be <= 63")
        if int(d) < 0:
            raise ValueError("Reference d must be >= 0")
        self._config[41] = (self._config[41] & ~((1<<6) -1)) | (int(d) & ((1<<6) -1))

    refd = property(get_refd, set_refd)

if __name__ == "__main__":
    import argparse
    import serial
    import re

    parser = argparse.ArgumentParser(description = 'RS-109M Net Locator AIS buoy configurator')
    parser.add_argument("-d", "--device", help="serial port device (e.g. /dev/ttyUSB0)")
    parser.add_argument("-m", "--mmsi", help="MMSI")
    parser.add_argument("-n", "--name", help="ship name")
    parser.add_argument("-i", "--interval", help="transmit interval in s [30..600]")
    parser.add_argument("-t", "--type", help="ship type, eg sail=36, pleasure craft=37")
    parser.add_argument("-c", "--callsign", help="call sign")
    parser.add_argument("-v", "--vendorid", help="AIS unit vendor id (3 characters)")
    parser.add_argument("-u", "--unitmodel", help="AIS unit vendor model code")
    parser.add_argument("-s", "--sernum", help="AIS unit serial num")
    parser.add_argument("-A", "--refa", help="Reference A (distance AIS to bow (m); Net Locator sends battery voltage instead)")
    parser.add_argument("-B", "--refb", help="Reference B (distance AIS to stern (m)")
    parser.add_argument("-C", "--refc", help="Reference C (distance AIS to port (m)")
    parser.add_argument("-D", "--refd", help="Reference D (distance AIS to starboard (m)")
    # password_default = '000000'
    parser.add_argument("-P", "--password", help="password to access Net Locator")
    parser.add_argument("-E", "--extended", help="operate on 0xff size config instead of default 0x40", action='store_true')
    # parser.add_argument("-P", "--newpass", help="set new password to access Net Locator")
    parser.add_argument("-W", "--write", help="write config to Net Locator", action='store_true')
    parser.add_argument("-R", "--noread", help="do not read from Net Locator", action='store_true')
    args = parser.parse_args()

    c = RS109_config()
    num_bytes = c.default_len
    if args.extended:
        num_bytes = 0xff

    ser = None

    if args.device != None:
        ser = serial.Serial()
        ser.port = args.device

        ser.baudrate = 115200
        ser.bytesize = serial.EIGHTBITS
        ser.parity = serial.PARITY_NONE
        ser.stopbits = serial.STOPBITS_ONE

        ser.timeout = 1
        ser.write_timeout = 3

        ser.open()

        # try read and timeout seems to make more reliable connection
        ser.read(0xffff)
        ser.timeout = 3

        if args.password != None:
            password = args.password

            password_maxlen = 6

            if not re.match("^[0-9]{0,"+str(password_maxlen)+"}$", password):
                print("Password: incorrect format, should match [0-9]{0,"+str(password_maxlen)+"}")
                exit(1)

            password_prepared = (password.encode() + password_default.encode())[:password_maxlen]
            ser.write([0x59, 0x01, 0x42, password_maxlen])
            ser.write(password_prepared)
        else:
            # This seems to work even with a password set
            ser.write([0x59, 0x01, 0x42, 0x00])

        r = ser.read(2)

        if r != b'\x95\x20':
            print('Could not initialize with password.')
            exit(1)

        if args.noread == False:
            ser.write([0x51, num_bytes])
            r = ser.read(2)
            if r != bytes([0x25, num_bytes]):
                print("Could not read config, got this instead:")
                print(r.hex(' '))
                exit(1)

            config = ser.read(num_bytes)
            if len(config) == num_bytes:
                c.config = config
            else:
                print("Could not read config from device")
                exit(1)
    else:
        print('Operating on default config:')
        print()

    if args.mmsi != None:
        c.mmsi = args.mmsi

    if args.name != None:
        c.name = args.name

    if args.interval != None:
        c.interval = args.interval

    if args.type != None:
        c.shipncargo = args.type

    if args.callsign != None:
        c.callsign = args.callsign

    if args.vendorid!= None:
        c.vendorid = args.vendorid

    if args.unitmodel != None:
        c.unitmodel = args.unitmodel

    if args.sernum!= None:
        c.sernum= args.sernum

    if args.refa != None:
        c.refa = int(args.refa)

    if args.refb != None:
        c.refb = int(args.refb)

    if args.refc != None:
        c.refc = int(args.refc)

    if args.refd != None:
        c.refd = int(args.refd)

    print('  MMSI: %(mmsi)s' % {'mmsi': c.mmsi})
    print('  Name: %(name)s' % {'name': c.name})
    print('  TX interval (s): %(interval)d' % {'interval': c.interval})
    print('  Ship type: %(shipncargo)s' % {'shipncargo': c.shipncargo})
    print('  Callsign: %(callsign)s' % {'callsign': c.callsign})
    print('  VendorID: %(vendorid)s' % {'vendorid': c.vendorid})
    print('  UnitModel: %(unitmodel)d' % {'unitmodel': c.unitmodel})
    print('  UnitSerial: %(sernum)d' % {'sernum': c.sernum})
    print('  Reference point A (m): {:d} (read-only battery voltage {:.1f}V)' .format(c.refa, c.refa/10.00))
    print('  Reference point B (m): %(refb)d' % {'refb': c.refb})
    print('  Reference point C (m): %(refc)d' % {'refc': c.refc})
    print('  Reference point D (m): %(refd)d' % {'refd': c.refd})
    print()
    print('[ 0x' + c.config[:num_bytes].hex('#').replace('#',', 0x') + ' ]')

    if args.device != None and args.write:
        ser.write([0x55, num_bytes])
        ser.write(c.config[:num_bytes])

        r = ser.read(2)
        if r != bytes([0x75, num_bytes]):
            print("Write failed")
            exit(1)
        else:
            print('Config written successfully!')
    else:
        if args.write:
            print('Must supply serial device with -d option.')
            exit(1)

