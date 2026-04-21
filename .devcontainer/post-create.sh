#!/usr/bin/env bash
set -euo pipefail

cd /workspaces/LANPartyManager

if [[ ! -f .env ]]; then
  cp .env.example .env
fi

replace_env_var() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${value}|" .env
  else
    printf "\n%s=%s\n" "${key}" "${value}" >> .env
  fi
}

replace_env_var "NODE_ENV" "development"
replace_env_var "APP_URL" "http://localhost:3000"
replace_env_var "DB_HOST" "mysql"
replace_env_var "DB_PORT" "3306"
replace_env_var "DB_USER" "root"
replace_env_var "DB_PASSWORD" "root"
replace_env_var "DB_NAME" "lan_party_manager"
replace_env_var "SESSION_SECRET" "codespaces_dev_secret_change_me"

npm ci
