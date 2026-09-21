# Dockerfile für Fritzbox DSL Status Daemon (Node.js)

# Basis-Image als ARG, damit es nur an einer Stelle steht und der Daemon
# es zur Laufzeit ausgeben kann.
ARG BASE_IMAGE=node:24-trixie-slim
FROM ${BASE_IMAGE}

ENV NODE_ENV=production

WORKDIR /app

# Erst nur die Manifeste kopieren, dann installieren: solange sich
# package-lock.json nicht ändert, trifft dieser Layer den Build-Cache,
# auch wenn am Quellcode geschraubt wurde.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Quellcode aus dem Build-Kontext statt per "git clone" zur Build-Zeit.
# Der Clone war über seine Kommandozeile cachebar und konnte deshalb
# stillschweigend einen alten Stand liefern; so entspricht das Image
# genau dem Commit, aus dem es gebaut wurde.
COPY read_fritzbox_dsl.js telegram_notifier.js ./

# Herkunft des Builds bewusst ganz am Ende: APP_REVISION aendert sich mit
# jedem Commit und wuerde weiter oben den npm-ci-Layer jedes Mal
# invalidieren. ARGs von vor dem FROM sind hier nicht mehr sichtbar und
# muessen erneut deklariert werden.
ARG BASE_IMAGE
ARG APP_REVISION=""
ENV APP_BASE_IMAGE=${BASE_IMAGE} \
    APP_REVISION=${APP_REVISION}

USER node

# Standard-Start: Node.js Daemon
CMD ["node", "read_fritzbox_dsl.js"]
