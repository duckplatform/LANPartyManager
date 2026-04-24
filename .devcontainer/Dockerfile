# ============================================================
# LANPartyManager — Image de développement Codespace
# ============================================================
# Étend l'image officielle Node.js 20 devcontainer et ajoute
# le client MySQL nécessaire pour les scripts init-db.sh et
# start-app.sh (connexions à MySQL depuis l'app container).
# ============================================================

FROM mcr.microsoft.com/devcontainers/javascript-node:20

# Installe le client MySQL et PHP CLI (Adminer)
RUN apt-get update \
    && apt-get install -y --no-install-recommends default-mysql-client php-cli php-mysql curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
