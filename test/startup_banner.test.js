import test from 'node:test';
import assert from 'node:assert/strict';

import { formatRate, formatStartupBanner } from '../read_fritzbox_dsl.js';

const basis = {
  version: '1.0.0',
  nodeVersion: 'v24.13.1',
  platform: 'linux/arm64',
  baseImage: '',
  revision: '',
  host: '192.168.0.1',
  port: 49000,
  intervalMs: 30000,
  telegramAktiv: true,
  dsl: {}
};

test('formatRate rechnet ab 1000 kbit/s in Mbit/s um', () => {
  assert.equal(formatRate(250000), '250,0 Mbit/s');
  assert.equal(formatRate(40000), '40,0 Mbit/s');
  assert.equal(formatRate(1000), '1,0 Mbit/s');
  assert.equal(formatRate(999), '999 kbit/s');
  assert.equal(formatRate(0), '0 kbit/s');
});

test('formatRate faengt fehlende und unsinnige Werte ab', () => {
  assert.equal(formatRate(undefined), 'unbekannt');
  assert.equal(formatRate('keine Zahl'), 'unbekannt');
  assert.equal(formatRate(-5), 'unbekannt');
});

test('Banner nennt Version, Laufzeit und Abfrageintervall', () => {
  const [kopf, laufzeit, fritzbox] = formatStartupBanner(basis);

  assert.match(kopf, /Daemon 1\.0\.0 gestartet/);
  assert.match(laufzeit, /Node v24\.13\.1, linux\/arm64/);
  assert.match(fritzbox, /192\.168\.0\.1:49000, Abfrage alle 30 s/);
});

test('Image und Commit erscheinen nur, wenn der Build sie gesetzt hat', () => {
  const ohne = formatStartupBanner(basis)[1];
  assert.doesNotMatch(ohne, /Image|Commit/);

  const mit = formatStartupBanner({
    ...basis,
    baseImage: 'node:24-trixie-slim',
    revision: '4f3c2b1a9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b'
  })[1];
  assert.match(mit, /Image node:24-trixie-slim/);
  assert.match(mit, /Commit 4f3c2b1/);
  // nur die Kurzform, nicht der volle SHA
  assert.doesNotMatch(mit, /4f3c2b1a9e8d/);
});

test('DSL-Raten und Verbindungsdauer werden ausgewiesen', () => {
  const zeilen = formatStartupBanner({
    ...basis,
    dsl: { downstream: '250000', upstream: '40000', uptime: '464238', ip: '203.0.113.7' }
  });

  assert.match(zeilen.join('\n'), /DSL-Rate\s+: ⬇️ 250,0 Mbit\/s\s+⬆️ 40,0 Mbit\/s/);
  assert.match(zeilen.join('\n'), /Verbindung: seit 5d 8h 57m 18s aktiv, IP 203\.0\.113\.7/);
});

test('fehlgeschlagene Startabfrage macht den Banner nicht kaputt', () => {
  const text = formatStartupBanner({ ...basis, dsl: {} }).join('\n');

  assert.match(text, /DSL-Rate\s+: nicht ermittelbar/);
  assert.match(text, /Verbindung: Status nicht ermittelbar/);
  // Kopf und Laufzeit stehen trotzdem
  assert.match(text, /Daemon 1\.0\.0 gestartet/);
});

test('Telegram-Zustand wird benannt', () => {
  assert.match(formatStartupBanner(basis).join('\n'), /Telegram\s+: aktiv/);
  assert.match(
    formatStartupBanner({ ...basis, telegramAktiv: false }).join('\n'),
    /Telegram\s+: nicht konfiguriert/
  );
});
