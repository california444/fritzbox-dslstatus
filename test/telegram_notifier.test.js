import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createTelegramNotifier,
  formatReconnectMessage
} from '../telegram_notifier.js';

// Dummy-Token: beim Anlegen des Api-Clients erfolgt kein Netzwerkzugriff.
const TOKEN = '123456:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

test('Notifier lässt sich mit der installierten Bibliothek anlegen', () => {
  // Fängt inkompatible node-telegram-bot-api-Versionen ab (fehlender
  // Api-Export bzw. fehlendes api.sendMessage).
  const notifier = createTelegramNotifier({ token: TOKEN, chatId: '42' });
  assert.equal(typeof notifier.sendReconnectNotification, 'function');
});

test('Reconnect-Nachricht enthält die neue IP', () => {
  const msg = formatReconnectMessage({ ip: '203.0.113.7' });
  assert.match(msg, /DSL reconnect/);
  assert.match(msg, /Neue IP: 203\.0\.113\.7/);
});

test('Reconnect-Nachricht führt Down- und Upstream auf', () => {
  const msg = formatReconnectMessage({
    ip: '203.0.113.7',
    downstream: '250000',
    upstream: '40000'
  });
  assert.match(msg, /Downstream: 250000 kbit\/s/);
  assert.match(msg, /Upstream: 40000 kbit\/s/);
});

test('Raten werden nur bei vollständigen Werten angehängt', () => {
  const nurDown = formatReconnectMessage({ ip: '203.0.113.7', downstream: '250000' });
  assert.doesNotMatch(nurDown, /Downstream/);

  const nurUp = formatReconnectMessage({ ip: '203.0.113.7', upstream: '40000' });
  assert.doesNotMatch(nurUp, /Upstream/);

  const ohne = formatReconnectMessage({ ip: '203.0.113.7' });
  assert.equal(ohne.split('\n').length, 1);
});

test('fehlende IP wird als "unbekannt" ausgewiesen', () => {
  assert.match(formatReconnectMessage({ ip: '' }), /Neue IP: unbekannt/);
  assert.match(formatReconnectMessage({ ip: undefined }), /Neue IP: unbekannt/);
  assert.match(formatReconnectMessage({ ip: '   ' }), /Neue IP: unbekannt/);
});
