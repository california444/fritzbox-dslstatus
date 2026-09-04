// Deckt den XML-Parser mit ab. Die uebrigen Tests arbeiten mit fertigen
// JS-Objekten und wuerden einen Bruch in fast-xml-parser nicht bemerken -
// dieser Test schickt echtes TR-064-XML durch die Kette.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import http from 'node:http';

import {
  parseDeviceDescription,
  parseGetInfoResponse,
  discoverServices
} from '../read_fritzbox_dsl.js';

const tr64desc = readFileSync(new URL('./fixtures/tr64desc.xml', import.meta.url), 'utf8');

const soapEnvelope = (inner) =>
  `<?xml version="1.0"?>\n` +
  `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" ` +
  `s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">` +
  `<s:Body>${inner}</s:Body></s:Envelope>`;

test('tr64desc.xml wird zur vollstaendigen Service-Tabelle geparst', () => {
  const services = parseDeviceDescription(tr64desc);

  // ueber drei Verschachtelungsebenen eingesammelt
  assert.deepEqual(Object.keys(services).sort(), [
    'DeviceConfig',
    'DeviceInfo',
    'WANDSLInterfaceConfig',
    'WANPPPConnection'
  ]);
});

test('die vom Daemon benoetigten Services haben die richtige controlURL', () => {
  const services = parseDeviceDescription(tr64desc);

  assert.deepEqual(services.WANPPPConnection, {
    serviceType: 'urn:dslforum-org:service:WANPPPConnection:1',
    controlURL: '/upnp/control/wanpppconn1'
  });
  assert.deepEqual(services.WANDSLInterfaceConfig, {
    serviceType: 'urn:dslforum-org:service:WANDSLInterfaceConfig:1',
    controlURL: '/upnp/control/wandslifconfig1'
  });
});

test('Geraetebeschreibung ohne Services wird abgelehnt', () => {
  const leer = '<?xml version="1.0"?><root><device><friendlyName>x</friendlyName></device></root>';
  assert.throws(() => parseDeviceDescription(leer), /No services found/);
});

test('GetInfoResponse der WANPPPConnection wird ausgelesen', () => {
  const xml = soapEnvelope(
    '<u:GetInfoResponse xmlns:u="urn:dslforum-org:service:WANPPPConnection:1">' +
      '<NewExternalIPAddress>203.0.113.7</NewExternalIPAddress>' +
      '<NewUptime>464238</NewUptime>' +
      '<NewConnectionStatus>Connected</NewConnectionStatus>' +
      '</u:GetInfoResponse>'
  );
  const resp = parseGetInfoResponse(xml);

  assert.equal(resp.NewExternalIPAddress, '203.0.113.7');
  assert.equal(resp.NewUptime, 464238);
});

test('GetInfoResponse der DSL-Raten wird ausgelesen', () => {
  const xml = soapEnvelope(
    '<u:GetInfoResponse xmlns:u="urn:dslforum-org:service:WANDSLInterfaceConfig:1">' +
      '<NewDownstreamCurrRate>250000</NewDownstreamCurrRate>' +
      '<NewUpstreamCurrRate>40000</NewUpstreamCurrRate>' +
      '</u:GetInfoResponse>'
  );
  const resp = parseGetInfoResponse(xml);

  assert.equal(resp.NewDownstreamCurrRate, 250000);
  assert.equal(resp.NewUpstreamCurrRate, 40000);
});

test('SOAP-Fehlerantwort fuehrt zu einem Fehler statt zu undefined', () => {
  const fault = soapEnvelope(
    '<s:Fault><faultcode>s:Client</faultcode><faultstring>UPnPError</faultstring></s:Fault>'
  );
  assert.throws(() => parseGetInfoResponse(fault), /GetInfoResponse missing/);
});

test('discoverServices holt und parst die Beschreibung ueber HTTP', async () => {
  const server = http.createServer((req, res) => {
    assert.equal(req.url, '/tr64desc.xml');
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(tr64desc);
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  try {
    const services = await discoverServices('127.0.0.1', port);
    assert.equal(services.WANPPPConnection.controlURL, '/upnp/control/wanpppconn1');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('discoverServices liefert bei HTTP-Fehler ein leeres Objekt', async () => {
  const server = http.createServer((req, res) => {
    res.writeHead(500);
    res.end('kaputt');
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  try {
    assert.deepEqual(await discoverServices('127.0.0.1', port), {});
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
