#!/usr/bin/env bash
# ============================================================
# LANPartyManager — Initialisation de la base de données
# Utilisé par postCreateCommand dans devcontainer.json
# ============================================================
# Ce script :
#   1. Attend que MySQL soit prêt à accepter des connexions
#   2. Crée la base de données si elle n'existe pas
#   3. Importe le schéma + le compte admin par défaut
#
# Les variables DB_* sont injectées par docker-compose.yml
# ============================================================

set -euo pipefail

# ── Variables (avec valeurs par défaut pour le Codespace) ───
DB_HOST="${DB_HOST:-mysql}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-lanparty}"
DB_PASSWORD="${DB_PASSWORD:-lanparty_dev}"
DB_NAME="${DB_NAME:-lanpartymanager}"

WORKSPACE="/workspace"
SQL_INSTALL="${WORKSPACE}/database/install.sql"

# ── Couleurs pour la console ─────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ── Alias mysql avec MYSQL_PWD (évite d'exposer le mot de passe ─
# dans la liste des processus ou l'historique shell)
mysql_cmd() {
  MYSQL_PWD="${DB_PASSWORD}" mysql -h "${DB_HOST}" -P "${DB_PORT}" \
    -u "${DB_USER}" "$@"
}

echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  LANPartyManager — Initialisation Codespace         ${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# ── 1. Attente de MySQL ──────────────────────────────────────
echo ""
echo "⏳ Attente de MySQL sur ${DB_HOST}:${DB_PORT}..."

MAX_ATTEMPTS=30
ATTEMPT=0
until mysql_cmd -e "SELECT 1" &>/dev/null; do
  ATTEMPT=$((ATTEMPT + 1))
  if [ "${ATTEMPT}" -ge "${MAX_ATTEMPTS}" ]; then
    echo -e "${RED}✗ MySQL non disponible après ${MAX_ATTEMPTS} tentatives. Abandon.${NC}"
    exit 1
  fi
  echo "   → Tentative ${ATTEMPT}/${MAX_ATTEMPTS} — nouvelle tentative dans 3s..."
  sleep 3
done

echo -e "${GREEN}✔ MySQL disponible.${NC}"

# ── 2. Création de la base de données ───────────────────────
echo ""
echo "🗄️  Création de la base '${DB_NAME}' si inexistante..."

mysql_cmd -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

echo -e "${GREEN}✔ Base de données prête.${NC}"

# ── 3. Import du schéma ──────────────────────────────────────
echo ""
echo "📦 Import du schéma depuis ${SQL_INSTALL}..."

if [ ! -f "${SQL_INSTALL}" ]; then
  echo -e "${RED}✗ Fichier SQL introuvable : ${SQL_INSTALL}${NC}"
  exit 1
fi

mysql_cmd "${DB_NAME}" < "${SQL_INSTALL}"

echo -e "${GREEN}✔ Schéma importé avec succès.${NC}"

# ── 4. Résumé ────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ Environnement Codespace prêt !                   ${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  🌐 Application : http://localhost:3000  (port public)"
echo ""
echo "  👤 Compte admin par défaut :"
echo "       Email    : admin@lanparty.local"
echo "       Password : Admin1234"
echo ""
echo -e "  ${YELLOW}⚠️  Changez ce mot de passe dès la première connexion !${NC}"
echo ""
echo "  📋 Logs de l'application : tail -f /tmp/app.log"
echo "  🔄 Redémarrer l'app      : bash .devcontainer/start-app.sh"
echo ""
