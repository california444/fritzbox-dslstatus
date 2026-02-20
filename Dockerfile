# Dockerfile für Fritzbox DSL Status Daemon (Node.js)
FROM node:24-bookworm

# Arbeitsverzeichnis
WORKDIR /app

# Abhängigkeiten kopieren und installieren
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Quellcode und Konfiguration kopieren
COPY read_fritzbox_dsl.js ./
COPY .env ./

# Standard-Start: Node.js Daemon
CMD ["node", "read_fritzbox_dsl.js"]
