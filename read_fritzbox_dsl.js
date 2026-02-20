// Fritzbox DSL Status via TR-064 (Node.js)
// Benötigt: npm install digest-fetch xml2js dotenv

import 'dotenv/config';
import DigestFetch from 'digest-fetch';
import { XMLParser } from 'fast-xml-parser';
import TelegramBot from 'node-telegram-bot-api';

const FRITZBOX_IP = process.env.FRITZBOX_IP || '192.168.0.1';
const FRITZBOX_USERNAME = process.env.FRITZBOX_USERNAME;
const FRITZBOX_PASSWORD = process.env.FRITZBOX_PASSWORD;
const FRITZBOX_PORT = 49000;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const INTERVAL_MS = parseInt(process.env.DSL_QUERY_INTERVAL_MS, 10) || 60000; // 1 Minute Standard

const client = new DigestFetch(FRITZBOX_USERNAME, FRITZBOX_PASSWORD, { timeout: 5000 });
const bot = TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID ? new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false }) : null;

let lastUptime = null;
//let lastUptime = 464238;

function collectAllServices(device) {
  let services = [];
  // serviceList kann Array oder Objekt sein
  if (device.serviceList) {
    const sl = Array.isArray(device.serviceList) ? device.serviceList : [device.serviceList];
    for (const s of sl) {
      if (s.service) {
        services = services.concat(Array.isArray(s.service) ? s.service : [s.service]);
      }
    }
  }
  // deviceList kann Array oder Objekt sein
  if (device.deviceList) {
    const dl = Array.isArray(device.deviceList) ? device.deviceList : [device.deviceList];
    for (const d of dl) {
      if (d.device) {
        const devs = Array.isArray(d.device) ? d.device : [d.device];
        for (const sub of devs) {
          services = services.concat(collectAllServices(sub));
        }
      }
    }
  }
  return services;
}

const xmlParser = new XMLParser({ ignoreAttributes: false });

async function discoverServices(ip, port) {
  const url = `http://${ip}:${port}/tr64desc.xml`;
  try {
    const res = await client.fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const xml = await res.text();
    //console.log(xml);
    const parsed = xmlParser.parse(xml);
    const rootDevice = parsed.root.device[0] || parsed.root.device;
    const allServices = collectAllServices(rootDevice);
    if (!allServices.length) throw new Error('No services found in device description XML');
    const services = {};
    for (const svc of allServices) {
      const serviceType = Array.isArray(svc.serviceType) ? svc.serviceType[0] : svc.serviceType;
      const controlURL = Array.isArray(svc.controlURL) ? svc.controlURL[0] : svc.controlURL;
      const parts = serviceType.split(':');
      const name = parts.length > 1 ? parts[parts.length - 2] : serviceType;
      services[name] = { serviceType, controlURL };
    }
    return services;
  } catch (e) {
    console.error('Service discovery failed:', e.message);
    return {};
  }
}

async function soapRequest(ip, port, action, serviceType, controlURL, args = {}) {
  let body = `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">\n` +
    `  <s:Body>\n    <u:${action} xmlns:u="${serviceType}">\n`;
  for (const k in args) body += `      <${k}>${args[k]}</${k}>\n`;
  body += `    </u:${action}>\n  </s:Body>\n</s:Envelope>`;
  const headers = {
    'Content-Type': "text/xml; charset='utf-8'",
    'SoapAction': `${serviceType}#${action}`
  };
  const url = `http://${ip}:${port}${controlURL}`;
  const res = await client.fetch(url, { method: 'POST', body, headers });
  if (!res.ok) throw new Error('SOAP HTTP ' + res.status);
  const xml = await res.text();
  const parsed = xmlParser.parse(xml);
  return parsed;
}

async function getDslRates(services) {
  // Erwartet: services-Objekt mit WANDSLInterfaceConfig
  const dsl = services.WANDSLInterfaceConfig;
  if (!dsl) return {};
  try {
    const result = await soapRequest(
      FRITZBOX_IP, FRITZBOX_PORT, 'GetInfo', dsl.serviceType, dsl.controlURL
    );
    const resp = result['s:Envelope']['s:Body']['u:GetInfoResponse'];
    return {
      downstream: resp.NewDownstreamCurrRate,
      upstream: resp.NewUpstreamCurrRate
    };
  } catch (e) {
    console.error('SOAP request for DSL rates failed:', e.message);
    return {};
  }
}

function formatUptime(seconds) {
  const s = parseInt(seconds, 10);
  if (isNaN(s) || s < 0) return 'Unknown';
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m ${sec}s`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
}

function startDaemon() {
  let running = true;
  process.on('SIGTERM', () => { running = false; });
  process.on('SIGINT', () => { running = false; });

  async function loop() {
    while (running) {
      try {
        await queryAndLog();
      } catch (e) {
        console.error('Fatal error in main loop:', e.message);
      }
      await new Promise(res => setTimeout(res, INTERVAL_MS));
    }
    console.log('Daemon stopped.');
    process.exit(0);
  }
  loop();
}

startDaemon();

async function queryAndLog() {
  const services = await discoverServices(FRITZBOX_IP, FRITZBOX_PORT);
  if (!services.WANPPPConnection) {
    console.error('WANPPPConnection service not found');
    return;
  }
  const svc = services.WANPPPConnection;
  try {
    const result = await soapRequest(
      FRITZBOX_IP, FRITZBOX_PORT, 'GetInfo', svc.serviceType, svc.controlURL
    );
    const resp = result['s:Envelope']['s:Body']['u:GetInfoResponse'];
    const ip = resp.NewExternalIPAddress;
    const uptime = resp.NewUptime;
    // if (ip) {
    //   console.log(`NewExternalIPAddress: ${ip}`);
    // }
    if (uptime) {
      //console.log(`NewUptime: ${uptime} seconds (${formatUptime(uptime)})`);
      if (lastUptime !== null && parseInt(uptime, 10) < parseInt(lastUptime, 10)) {
        // DSL-Raten abfragen, Services wiederverwenden
        const dslRates = await getDslRates(services);
          let msg = `🔄 DSL reconnect! Neue IP: ${ip}`;
        if (dslRates.downstream && dslRates.upstream) {
            msg += `\n⬇️ Downstream: ${dslRates.downstream} kbit/s\n⬆️ Upstream: ${dslRates.upstream} kbit/s`;
        }
        console.log(msg);
        if (bot) {
          bot.sendMessage(TELEGRAM_CHAT_ID, msg)
            .catch(e => console.error('Telegram error:', e.message));
        } else {
          console.log('Telegram-Konfiguration fehlt, keine Nachricht gesendet.');
        }
      }
      lastUptime = uptime;
    }
  } catch (e) {
    console.error('SOAP request failed:', e.message);
  }
}
