#!/usr/bin/env bash
set -euo pipefail

ADMINER_PORT="${ADMINER_PORT:-8081}"
ADMINER_DIR="${ADMINER_DIR:-/tmp/adminer}"
ADMINER_FILE="$ADMINER_DIR/index.php"
ADMINER_URL="${ADMINER_URL:-https://www.adminer.org/latest.php}"

if ! command -v php >/dev/null 2>&1; then
  echo "[Adminer] PHP CLI absent. Installation en cours..."
  sudo apt-get update
  sudo apt-get install -y php-cli php-mysql
fi

mkdir -p "$ADMINER_DIR"

if [[ ! -s "$ADMINER_FILE" ]]; then
  echo "[Adminer] Telechargement de Adminer depuis $ADMINER_URL"
  curl -fsSL "$ADMINER_URL" -o "$ADMINER_FILE"
fi

echo "[Adminer] Demarrage sur le port $ADMINER_PORT"
echo "[Adminer] URL Codespaces: ouvrir le port $ADMINER_PORT (visibilite: private)"

exec php -S "0.0.0.0:$ADMINER_PORT" -t "$ADMINER_DIR"
