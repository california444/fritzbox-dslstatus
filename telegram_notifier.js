// Telegram-Benachrichtigung für DSL-Reconnects
//
// Eigenes Modul, damit die Anbindung an node-telegram-bot-api
// unabhängig vom laufenden Daemon geprüft werden kann.
//
// Der Daemon sendet ausschließlich - er empfängt keine Updates.
// Deshalb reicht der schlanke Api-Client, kein vollständiger Bot.

import { Api } from 'node-telegram-bot-api';

/**
 * Erzeugt einen Notifier für DSL-Reconnects.
 * Wirft, wenn die installierte node-telegram-bot-api-Version inkompatibel ist -
 * so scheitert der Daemon beim Start und nicht erst beim ersten Reconnect.
 */
export function createTelegramNotifier({ token, chatId, log = () => {} }) {
  const api = new Api(token);

  if (typeof api.sendMessage !== 'function') {
    throw new TypeError(
      'node-telegram-bot-api: api.sendMessage fehlt - inkompatible Version?'
    );
  }

  return {
    sendReconnectNotification({ ip, downstream, upstream }) {
      return api
        .sendMessage({
          chat_id: chatId,
          text: formatReconnectMessage({ ip, downstream, upstream })
        })
        .catch((e) => log('Telegram-Fehler: ' + e.message));
    },
  };
}

/** Text der Reconnect-Benachrichtigung. Reine Funktion, ohne Netzwerkzugriff. */
export function formatReconnectMessage({ ip, downstream, upstream }) {
  const adresse = ip && String(ip).trim() ? ip : 'unbekannt';
  let msg = `🔄 DSL reconnect! Neue IP: ${adresse}`;
  if (downstream && upstream) {
    msg += `\n⬇️ Downstream: ${downstream} kbit/s\n⬆️ Upstream: ${upstream} kbit/s`;
  }
  return msg;
}
