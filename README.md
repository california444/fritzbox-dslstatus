
# Fritzbox DSL Status Daemon mit Telegram-Benachrichtigung

Dieses Projekt überwacht den DSL-Status deiner Fritzbox und sendet bei einem Reconnect eine Benachrichtigung per Telegram. Es läuft als Node.js-Daemon im Docker-Container.

## Features
- Überwachung des DSL-Status über das TR-064-Protokoll
- Telegram-Benachrichtigung bei DSL-Reconnect (inkl. neuer IP und aktueller Down-/Upstream-Raten)
- Läuft als Node.js-Daemon im Docker-Container
- Fertiges Image für `linux/arm64` (Raspberry Pi) aus der GitHub Container Registry
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
DSL_QUERY_INTERVAL_MS=30000
```

### 4. Start mit Docker

Bei jedem Push auf `main` baut GitHub Actions das Image und veröffentlicht es
unter `ghcr.io/california444/fritzbox-dslstatus`. Verfügbare Tags:

| Tag | Bedeutung |
| --- | --- |
| `latest` | aktueller Stand von `main` |
| `sha-<commit>` | genau dieser Commit – für Rollbacks |
| `<JJJJMMTT>` | Stand des jeweiligen Build-Tages |

Mit Docker Compose:

docker-compose.yml:
```yaml
services:
  fritzbox-dslstatus:
    image: ghcr.io/california444/fritzbox-dslstatus:latest
    container_name: fritzbox-dslstatus
    # Alternativ zu den Variablen können die Variablen auch im .env file hier gesetzt werden:
    # env_file:
      # - .env
    environment:
      FRITZBOX_IP: "192.168.0.1"
      FRITZBOX_USERNAME: "dein_benutzername"
      # $ must be escaped with double dollar $$
      FRITZBOX_PASSWORD: "dein_passwort"
      TELEGRAM_BOT_TOKEN: "DEIN_BOT_TOKEN_HIER"
      TELEGRAM_CHAT_ID: "DEINE_CHAT_ID_HIER"
      DSL_QUERY_INTERVAL_MS: "30000"
    restart: always
    tty: true
    stdin_open: true
```

Starte den Service mit:

```bash
docker compose up -d
```

Auf eine neue Version aktualisieren:

```bash
docker compose pull && docker compose up -d
```

Logs anzeigen:

```bash
docker compose logs -f
```

Service stoppen:

```bash
docker compose down
```

### 5. Selbst bauen (optional)

```bash
docker build -t fritzbox-dslstatus .
```

Der Build nimmt den Quellcode aus dem Arbeitsverzeichnis, nicht aus dem
GitHub-Repo – das gebaute Image entspricht also dem ausgecheckten Stand.

## Hinweise
- Der TR-064-Zugriff muss auf der Fritzbox aktiviert sein.
- Die IP-Adresse, Benutzername und Passwort der Fritzbox ggf. anpassen.
- Die Datei `.env` darf sensible Daten enthalten und ist durch `.gitignore`
  vom Repo und durch `.dockerignore` vom Image-Build ausgeschlossen.
- Neue Packages in der GitHub Container Registry sind zunächst privat. Für
  einen Pull ohne Anmeldung muss das Package in den Repo-Einstellungen auf
  "public" gestellt werden, sonst ist auf dem Host ein
  `docker login ghcr.io` mit einem PAT (Scope `read:packages`) nötig.

## Lizenz
MIT
