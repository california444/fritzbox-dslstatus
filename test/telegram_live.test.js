// Live-Test gegen die echte Telegram-API.
//
// Laeuft nur, wenn TELEGRAM_LIVE_TEST=1 gesetzt ist UND Token/Chat-ID
// vorliegen - sonst wird er uebersprungen. Damit sendet weder ein lokales
// `npm test` noch ein Fork-PR ohne Secrets ungewollt eine Nachricht.
//
// Zweck: die uebrigen Tests pruefen nur, dass sich der Api-Client anlegen
// laesst. Ob ein Versand tatsaechlich durchgeht, zeigt erst dieser Test -
// eine geaenderte Signatur von api.sendMessage faellt sonst nicht auf.

import test from 'node:test';
import assert from 'node:assert/strict';

import { createTelegramNotifier } from '../telegram_notifier.js';

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const aktiviert = process.env.TELEGRAM_LIVE_TEST === '1';

const skip = !aktiviert
  ? 'TELEGRAM_LIVE_TEST != 1 - Live-Test uebersprungen'
  : !token || !chatId
    ? 'TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID fehlen - Live-Test uebersprungen'
    : false;

/** Kennzeichnet den Lauf, damit im Testchat erkennbar ist, woher er kam. */
function herkunft() {
  const { GITHUB_REPOSITORY, GITHUB_RUN_ID, GITHUB_REF_NAME, GITHUB_SERVER_URL } = process.env;
  if (!GITHUB_RUN_ID) return 'lokaler Lauf';
  const url = `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`;
  return `CI ${GITHUB_REPOSITORY}@${GITHUB_REF_NAME}\n${url}`;
}

test('Live: Nachricht wird von Telegram angenommen', { skip }, async () => {
  const fehler = [];
  const notifier = createTelegramNotifier({
    token,
    chatId,
    log: (m) => fehler.push(m)
  });

  await notifier.sendText(
    `✅ CI-Test fritzbox-dslstatus\nKein echter Reconnect.\n${herkunft()}`
  );

  // sendText schluckt Fehler bewusst - deshalb ueber den Log pruefen.
  assert.deepEqual(fehler, [], 'Telegram hat den Versand abgelehnt');
});
