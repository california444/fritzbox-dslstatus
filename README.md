# FritzBox DSL Status Reader & Phone Call Monitor

Ein Python-Skript zum Auslesen des DSL-Status und zur Überwachung von Anrufen von einer AVM FritzBox über das TR-064 Protokoll.

## Installation

### Voraussetzungen
- Python 3.7 oder höher
- pip (Python Package Manager)

### Setup

1. **Dependencies installieren:**
```bash
pip install -r requirements.txt
```

2. **FritzBox-Anmeldedaten konfigurieren:**

Öffnen Sie beide `.py`-Dateien und passen Sie die Konstanten am Anfang an:

```python
FRITZBOX_IP = "192.168.178.1"          # IP-Adresse Ihrer FritzBox
FRITZBOX_USERNAME = "admin"             # Benutzername
FRITZBOX_PASSWORD = "password"          # Passwort
FRITZBOX_PORT = 49000                   # Standard TR-064 Port
```

## Verwendung

### 1. DSL-Status auslesen

Das Skript direkt ausführen:
```bash
python read_fritzbox_dsl.py
```

**Ausgabe:**
```
Discovering FritzBox services...
✓ Using 3 default services

Discovered services:
  - WANDSLInterfaceConfig
    Type: urn:dslforum-org:service:WANDSLInterfaceConfig:1

Connecting to FritzBox at 192.168.0.1...

=== DSL Information (GetInfo) ===
NewEnable: 1
NewStatus: Up
NewDataPath: Fast
NewUpstreamCurrRate: 23360
NewDownstreamCurrRate: 63679
...
```

### 2. Anrufe monitoren

Das Anruf-Monitor-Skript ausführen:
```bash
python monitor_phone_calls.py
```

Das Skript läuft kontinuierlich und protokolliert eingehende Anrufe mit Telefonnummer und Anrufer-Name.

## Funktionen

### read_fritzbox_dsl.py

- **`discover_services()`** - Erkennt verfügbare Services auf der FritzBox
- **`get_dsl_info()`** - Ruft die wichtigsten DSL-Informationen ab
- **`soap_request()`** - Generische Funktion zum Senden von SOAP-Requests

### monitor_phone_calls.py

- **`get_phone_call_list()`** - Holt die Liste aller Anrufe von der FritzBox
- **`monitor_phone_calls()`** - Überwacht FritzBox kontinuierlich auf neue Anrufe
- **`log_call_event()`** - Formatiert und protokolliert Anruf-Ereignisse

## TR-064 Protokoll

TR-064 ist ein UPnP-basiertes Protokoll, das von AVM FritzBox Geräten bereitgestellt wird. Es ermöglicht Remote-Zugriff auf Gerätekonfiguration und Status über HTTP und SOAP.

## Anforderungen für Telefonieüberwachung

Die folgende Hardware und Konfiguration ist erforderlich:

- **FritzBox mit Telefoniefunktion** (z.B. FRITZ!Box 7590, 7580, 6890)
- **Konfigurierte Telefonleitungen/Erweiterungen**
- **Aktive Telefonverbindung oder LS-Registrar**

## Troubleshooting

### DSL-Reader

- Stellen Sie sicher, dass die FritzBox unter der angegebenen IP-Adresse erreichbar ist
- Überprüfen Sie Benutzername und Passwort
- Router-Standard-IP ist meist `192.168.178.1` oder `192.168.1.1`
- TR-064 Service läuft auf Port `49000`

### Phone Monitor

- **Keine Anrufe werden erkannt**: Prüfen Sie, ob die FritzBox Telefoniefunktionen hat
- **Fehler beim Service-Zugriff**: Der FritzBox-Benutzer benötigt Telefonie-Admin-Rechte

## Lizenz

MIT
