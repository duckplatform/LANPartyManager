#!/usr/bin/env bash
# ============================================================
# LANPartyManager — Démarrage de l'application
# Utilisé par postStartCommand dans devcontainer.json
# ============================================================
# Lance node app.js en arrière-plan et redirige les logs vers
# /tmp/app.log. Tue toute instance précédente avant de démarrer.
# ============================================================

set -euo pipefail

LOG_FILE="/tmp/app.log"
WORKSPACE="/workspace"

# Arrête l'instance existante si elle tourne déjà
pkill -f 'node app.js' 2>/dev/null || true

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Démarrage de LANPartyManager..." > "${LOG_FILE}"

# Démarre l'application en arrière-plan depuis le dossier du workspace
cd "${WORKSPACE}"
node app.js >> "${LOG_FILE}" 2>&1 &

echo "✅ LANPartyManager démarré en arrière-plan (PID $!)"
echo "   Logs : tail -f ${LOG_FILE}"
