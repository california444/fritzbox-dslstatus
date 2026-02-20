# Dockerfile für Fritzbox DSL Status Daemon (Node.js)
FROM node:24-bookworm

# Arbeitsverzeichnis
WORKDIR /app

# Git installieren und Repo klonen
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
RUN git clone https://github.com/california444/fritzbox-dslstatus.git .

# Abhängigkeiten installieren
RUN npm install --omit=dev

# Standard-Start: Node.js Daemon
CMD ["node", "read_fritzbox_dsl.js"]
