# Fritzbox DSL Status Daemon mit Telegram-Benachrichtigung

Dieses Projekt überwacht den DSL-Status deiner Fritzbox und sendet bei einem Reconnect eine Benachrichtigung per Telegram. Es läuft als Node.js-Daemon im Docker-Container und lädt den Quellcode direkt aus dem GitHub-Repo.

## Features
- Überwachung des DSL-Status über das TR-064-Protokoll
- Telegram-Benachrichtigung bei DSL-Reconnect (inkl. neuer IP und aktueller Down-/Upstream-Raten)
- Läuft als Node.js-Daemon im Docker-Container (kein systemd nötig)
- Quellcode wird im Dockerfile direkt aus dem GitHub-Repo geladen
- Konfiguration über `.env` oder direkt im Compose-File

## Voraussetzungen
- Fritzbox mit aktiviertem TR-064
- Telegram-Bot und Chat-ID
- Docker und Docker Compose

## Einrichtung

### 1. Telegram-Bot erstellen
- Schreibe an [@BotFather](https://t.me/BotFather) auf Telegram.
- Erstelle einen neuen Bot und notiere den Bot-Token.
- Sende deinem Bot eine Nachricht und rufe dann
  `https://api.telegram.org/bot<DEIN_BOT_TOKEN>/getUpdates` auf, um die Chat-ID zu finden.

### 2. TR-064 auf der Fritzbox aktivieren
- Im Fritzbox-Menü unter "Heimnetz > Netzwerk > Netzwerkeinstellungen > Zugriff für Anwendungen zulassen" aktivieren.

### 3. Konfiguration
Lege eine `.env`-Datei an (oder nutze das `environment`-Feld im Compose-File):

```
FRITZBOX_IP=192.168.0.1
FRITZBOX_USERNAME=dein_benutzername
FRITZBOX_PASSWORD=dein_passwort
TELEGRAM_BOT_TOKEN=DEIN_BOT_TOKEN_HIER
TELEGRAM_CHAT_ID=DEINE_CHAT_ID_HIER
DSL_QUERY_INTERVAL_MS=60000
```

Die Datei `.env` sollte nicht ins Repository eingecheckt werden und ist in `.gitignore` eingetragen.

### 4. Start mit Docker

Der Container lädt den Quellcode automatisch aus dem GitHub-Repo:

```Dockerfile
FROM node:24-bookworm
WORKDIR /app
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
RUN git clone https://github.com/california444/fritzbox-dslstatus.git .
RUN npm install --omit=dev
CMD ["node", "read_fritzbox_dsl.js"]
```

Mit Docker Compose:

#### Variante 1: Build aus lokalem Dockerfile

```yaml
docker-compose.yml:

version: '3.8'
services:
  fritzbox-dslstatus:
    image: california444/fritzbox-dslstatus:latest
    container_name: fritzbox-dslstatus
    # Alternativ zu den Variablen können die Variablen auch im .env file hier gesetzt werden:
    # env_file:
      # - .env
    environment:
      FRITZBOX_IP: "192.168.0.1"
      FRITZBOX_USERNAME: "dein_benutzername"
      FRITZBOX_PASSWORD: "dein_passwort"
      TELEGRAM_BOT_TOKEN: "DEIN_BOT_TOKEN_HIER"
      TELEGRAM_CHAT_ID: "DEINE_CHAT_ID_HIER"
      DSL_QUERY_INTERVAL_MS: "60000"
    restart: always
    tty: true
    stdin_open: true
```

Starte den Service mit:

```bash
docker-compose up -d
```

Logs anzeigen:

```bash
docker-compose logs -f
```

Service stoppen:

```bash
docker-compose down
```

## Hinweise
- Der TR-064-Zugriff muss auf der Fritzbox aktiviert sein.
- Die IP-Adresse, Benutzername und Passwort der Fritzbox ggf. anpassen.
- Die Datei `.env` darf sensible Daten enthalten und ist durch `.gitignore` geschützt.
- Bei Nutzung des fertigen Images muss dieses aktuell sein und den GitHub-Quellcode enthalten.

## Lizenz
MIT
