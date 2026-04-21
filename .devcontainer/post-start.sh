#!/usr/bin/env bash
set -euo pipefail

cd /workspaces/LANPartyManager

MYSQL_HOST="mysql"
MYSQL_PORT="3306"
MYSQL_USER="root"
MYSQL_PASSWORD="root"
MYSQL_DB="lan_party_manager"

for i in $(seq 1 30); do
  if mysqladmin ping -h "${MYSQL_HOST}" -P "${MYSQL_PORT}" -u "${MYSQL_USER}" -p"${MYSQL_PASSWORD}" --silent; then
    break
  fi

  if [[ "${i}" -eq 30 ]]; then
    echo "MySQL n'est pas disponible apres plusieurs tentatives." >&2
    exit 1
  fi

  echo "Attente de MySQL (${i}/30)..."
done

mysql -h "${MYSQL_HOST}" -P "${MYSQL_PORT}" -u "${MYSQL_USER}" -p"${MYSQL_PASSWORD}" \
  -e "CREATE DATABASE IF NOT EXISTS ${MYSQL_DB} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

mysql -h "${MYSQL_HOST}" -P "${MYSQL_PORT}" -u "${MYSQL_USER}" -p"${MYSQL_PASSWORD}" "${MYSQL_DB}" < database/schema.sql
