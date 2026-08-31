#!/usr/bin/env bash
#
# Bootstrap de una sola vez en el VPS para habilitar el autodeploy por GitHub Actions.
# Deja el repo clonado en DEPLOY_PATH, un .env inicial y valida docker / red externa.
#
# Uso:
#   DEPLOY_PATH=/opt/sueldos REPO_URL=https://github.com/weapub/sueldos.git \
#     bash scripts/deploy-bootstrap.sh
#
# Idempotente: se puede volver a correr sin romper nada.

set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/opt/sueldos}"
REPO_URL="${REPO_URL:-https://github.com/weapub/sueldos.git}"
BRANCH="${BRANCH:-main}"
DOCKER_NETWORK="${DOCKER_NETWORK:-systeg}"

say() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m[!] %s\033[0m\n' "$*"; }

# --- Requisitos ---------------------------------------------------------------
say "Verificando requisitos"
command -v git >/dev/null || { echo "Falta git"; exit 1; }
command -v docker >/dev/null || { echo "Falta docker"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "Falta 'docker compose' (plugin v2)"; exit 1; }
docker info >/dev/null 2>&1 || { echo "El usuario actual no puede usar docker (agregarlo al grupo 'docker')"; exit 1; }
echo "OK: git, docker y docker compose disponibles."

# --- Red externa compartida -------------------------------------------------
say "Red docker externa '${DOCKER_NETWORK}'"
if docker network inspect "${DOCKER_NETWORK}" >/dev/null 2>&1; then
  echo "OK: ya existe."
else
  docker network create "${DOCKER_NETWORK}"
  echo "Creada."
fi

# --- Repo ------------------------------------------------------------------
say "Repo en ${DEPLOY_PATH}"
if [ -d "${DEPLOY_PATH}/.git" ]; then
  echo "OK: ya clonado."
  git -C "${DEPLOY_PATH}" remote set-url origin "${REPO_URL}"
  git -C "${DEPLOY_PATH}" fetch --prune origin
  git -C "${DEPLOY_PATH}" checkout "${BRANCH}"
  git -C "${DEPLOY_PATH}" reset --hard "origin/${BRANCH}"
else
  sudo mkdir -p "$(dirname "${DEPLOY_PATH}")"
  sudo chown "$(id -u):$(id -g)" "$(dirname "${DEPLOY_PATH}")"
  git clone --branch "${BRANCH}" "${REPO_URL}" "${DEPLOY_PATH}"
fi

# --- .env -----------------------------------------------------------------
ENV_FILE="${DEPLOY_PATH}/.env"
say ".env (${ENV_FILE})"
if [ -f "${ENV_FILE}" ]; then
  echo "OK: ya existe, no se toca."
else
  PG_PASS="$(openssl rand -hex 16)"
  AUTH_SECRET="$(openssl rand -base64 32)"
  cat > "${ENV_FILE}" <<EOF
# --- Base de datos ---
POSTGRES_PASSWORD=${PG_PASS}
DATABASE_URL=postgresql://sueldos:${PG_PASS}@db-sueldos:5432/sueldos?schema=public

# --- NextAuth (v5) ---
AUTH_SECRET=${AUTH_SECRET}
AUTH_TRUST_HOST=true

# --- Import de altas de ARCA (opcional) ---
# ANTHROPIC_API_KEY=
# ARCA_OCR_MODEL=claude-opus-5
EOF
  chmod 600 "${ENV_FILE}"
  warn "Se generó ${ENV_FILE} con secretos nuevos. Revisalo y completá ANTHROPIC_API_KEY si vas a usar el import de altas."
fi

# --- Primera build + migraciones + arranque ------------------------------
say "Build inicial + migraciones + arranque"
cd "${DEPLOY_PATH}"
docker compose --profile tools build
docker compose run --rm migrate-sueldos
docker compose up -d api-sueldos db-sueldos

say "Listo"
cat <<EOF

Bootstrap completo. Falta configurar en GitHub (Settings -> Secrets and variables -> Actions):

  Variable  DEPLOY_PATH = ${DEPLOY_PATH}
  Secret    SSH_HOST    = <IP o host de este VPS>
  Secret    SSH_USER    = $(id -un)
  Secret    SSH_KEY     = <clave PRIVADA cuya pública está en ~/.ssh/authorized_keys de este usuario>
  Secret    SSH_PORT    = <opcional, default 22>

Desde ahí, cada push a 'main' despliega solo.
EOF
