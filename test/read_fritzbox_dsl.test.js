import test from 'node:test';
import assert from 'node:assert/strict';

import {
  collectAllServices,
  buildServiceMap,
  formatUptime
} from '../read_fritzbox_dsl.js';

test('formatUptime: Sekunden und Minuten', () => {
  assert.equal(formatUptime(0), '0m 0s');
  assert.equal(formatUptime(59), '0m 59s');
  assert.equal(formatUptime(60), '1m 0s');
  assert.equal(formatUptime(3599), '59m 59s');
});

test('formatUptime: blendet Tage/Stunden nur bei Bedarf ein', () => {
  assert.equal(formatUptime(3600), '1h 0m 0s');
  assert.equal(formatUptime(86399), '23h 59m 59s');
  assert.equal(formatUptime(86400), '1d 0h 0m 0s');
  assert.equal(formatUptime(464238), '5d 8h 57m 18s');
});

test('formatUptime: akzeptiert Strings (TR-064 liefert Text)', () => {
  assert.equal(formatUptime('90'), '1m 30s');
});

test('formatUptime: ungueltige Werte ergeben "Unknown"', () => {
  assert.equal(formatUptime('keine Zahl'), 'Unknown');
  assert.equal(formatUptime(undefined), 'Unknown');
  assert.equal(formatUptime(null), 'Unknown');
  assert.equal(formatUptime(-1), 'Unknown');
});

test('collectAllServices: serviceList als Objekt mit einem Service', () => {
  const device = { serviceList: { service: { serviceType: 'urn:A:service:X:1' } } };
  assert.deepEqual(collectAllServices(device), [{ serviceType: 'urn:A:service:X:1' }]);
});

test('collectAllServices: serviceList als Array mit mehreren Services', () => {
  const device = {
    serviceList: [{ service: [{ serviceType: 'X' }, { serviceType: 'Y' }] }]
  };
  assert.deepEqual(collectAllServices(device), [{ serviceType: 'X' }, { serviceType: 'Y' }]);
});

test('collectAllServices: sammelt rekursiv aus verschachtelten Geraeten', () => {
  const device = {
    serviceList: { service: { serviceType: 'Root' } },
    deviceList: {
      device: [
        {
          serviceList: { service: { serviceType: 'Sub1' } },
          deviceList: { device: { serviceList: { service: { serviceType: 'Sub2' } } } }
        }
      ]
    }
  };
  const types = collectAllServices(device).map(s => s.serviceType);
  assert.deepEqual(types, ['Root', 'Sub1', 'Sub2']);
});

test('collectAllServices: Geraet ohne Listen liefert leeres Array', () => {
  assert.deepEqual(collectAllServices({}), []);
});

test('buildServiceMap: leitet den Kurznamen aus dem serviceType ab', () => {
  const map = buildServiceMap([
    {
      serviceType: 'urn:dslforum-org:service:WANPPPConnection:1',
      controlURL: '/upnp/control/wanpppconn1'
    },
    {
      serviceType: 'urn:dslforum-org:service:WANDSLInterfaceConfig:1',
      controlURL: '/upnp/control/wandslifconfig1'
    }
  ]);

  assert.deepEqual(Object.keys(map).sort(), ['WANDSLInterfaceConfig', 'WANPPPConnection']);
  assert.equal(map.WANPPPConnection.controlURL, '/upnp/control/wanpppconn1');
  assert.equal(map.WANPPPConnection.serviceType, 'urn:dslforum-org:service:WANPPPConnection:1');
});

test('buildServiceMap: nimmt bei Array-Werten den ersten Eintrag', () => {
  const map = buildServiceMap([
    {
      serviceType: ['urn:dslforum-org:service:WANPPPConnection:1', 'ignoriert'],
      controlURL: ['/upnp/control/wanpppconn1', '/ignoriert']
    }
  ]);

  assert.deepEqual(map.WANPPPConnection, {
    serviceType: 'urn:dslforum-org:service:WANPPPConnection:1',
    controlURL: '/upnp/control/wanpppconn1'
  });
});

test('buildServiceMap: serviceType ohne Doppelpunkte wird als Name genutzt', () => {
  const map = buildServiceMap([{ serviceType: 'Plain', controlURL: '/c' }]);
  assert.deepEqual(map, { Plain: { serviceType: 'Plain', controlURL: '/c' } });
});

test('buildServiceMap: leere Eingabe liefert leeres Objekt', () => {
  assert.deepEqual(buildServiceMap([]), {});
});
