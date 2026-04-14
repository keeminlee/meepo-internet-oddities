#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/meepo/mio}"
BRANCH="${BRANCH:-main}"
SERVICE="${SERVICE:-mio-web}"
ENV_FILE="${ENV_FILE:-/etc/mio/mio-web.env}"
MIN_FREE_KB="${MIN_FREE_KB:-512000}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://127.0.0.1:3001/api/health}"
DATA_DIR="${DATA_DIR:-/var/lib/mio}"
# DB_FILE matches the default MIO_DB_PATH in mio-web.env (read by the Next.js app).
DB_FILE="${DB_FILE:-$DATA_DIR/mio.db}"
UPLOADS_DIR="${UPLOADS_DIR:-$DATA_DIR/uploads}"
CERTBOT_WEBROOT="${CERTBOT_WEBROOT:-/var/www/certbot}"
NGINX_SITE="${NGINX_SITE:-mio-web}"
CERT_DOMAIN="${CERT_DOMAIN:-meepo.online}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd git
require_cmd npm
require_cmd node
require_cmd curl
require_cmd sudo
require_cmd systemctl
require_cmd df
require_cmd awk
require_cmd date

if [ ! -d "$APP_DIR/.git" ]; then
  echo "[deploy] expected git repo at $APP_DIR"
  exit 1
fi

cd "$APP_DIR"

if ! sudo -n true >/dev/null 2>&1; then
  echo "[deploy] sudo must be passwordless for deploy user (required for systemctl restart)." >&2
  exit 1
fi

git fetch --prune origin
git fetch --force --tags origin

TARGET_SHA="$(git rev-parse --short "origin/$BRANCH")"
DEPLOY_ID="$(date -u +%Y%m%dT%H%M%SZ)-$TARGET_SHA"

log() {
  echo "[deploy:$DEPLOY_ID] $*"
}

run_stage() {
  local stage="$1"
  local status
  shift

  log "=== STAGE: $stage ==="
  set +e
  "$@"
  status=$?
  set -e
  if [ "$status" -ne 0 ]; then
    log "FAILED: $stage"
    exit "$status"
  fi
  log "$stage completed"
}

wait_for_active() {
  local unit="$1"
  local attempts="${2:-20}"
  local delay_secs="${3:-1}"

  for ((i=1; i<=attempts; i++)); do
    if sudo systemctl is-active --quiet "$unit"; then
      return 0
    fi
    sleep "$delay_secs"
  done

  log "FAILED: health-check ($unit is not active)"
  sudo journalctl -u "$unit" -n 200 --no-pager || true
  return 1
}

wait_for_http() {
  local url="$1"
  local attempts="${2:-30}"
  local delay_secs="${3:-1}"

  for ((i=1; i<=attempts; i++)); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep "$delay_secs"
  done

  log "FAILED: health-check (health check failed at $url)"
  log "--- last curl attempt ---"
  curl -sS --max-time 5 "$url" 2>&1 || true
  log "--- recent $SERVICE journal ---"
  sudo journalctl -u "$SERVICE" -n 40 --no-pager 2>&1 || true
  log "--- end diagnostics ---"
  return 1
}

sync_stage() {
  git reset --hard HEAD
  git clean -ffd
  git checkout -B "$BRANCH" "origin/$BRANCH"
}

preflight_stage() {
  local available_kb
  local disk_summary

  log "app_dir=$APP_DIR branch=$BRANCH"
  log "node: $(node --version)"
  log "npm: $(npm --version)"
  log "commit: $(git rev-parse --short HEAD)"
  log "branch: $(git rev-parse --abbrev-ref HEAD)"
  log "cwd: $(pwd)"
  disk_summary="$(df -Pk / | awk 'NR==2 {printf "%sKB free (%s used)", $4, $5}')"
  log "disk: $disk_summary"

  [ -f "$APP_DIR/package-lock.json" ] || { log "ERROR: package-lock.json missing"; return 1; }
  [ -f "$APP_DIR/next.config.ts" ] || { log "ERROR: next.config.ts missing"; return 1; }
  [ -d "$APP_DIR/deploy" ] || { log "ERROR: deploy/ missing"; return 1; }
  [ -f "$ENV_FILE" ] || { log "ERROR: missing env file: $ENV_FILE"; return 1; }

  available_kb="$(df -Pk / | awk 'NR==2 {print $4}')"
  if [ "$available_kb" -lt "$MIN_FREE_KB" ]; then
    log "ERROR: insufficient disk space (${available_kb}KB free; need at least ${MIN_FREE_KB}KB)"
    return 1
  fi
}

clean_stage() {
  git clean -ffd
  rm -rf node_modules

  # Remove stale lockfiles outside the project tree.  A leftover
  # /home/meepo/package-lock.json causes Next.js to infer the wrong
  # outputFileTracingRoot, which can break `next start` at runtime.
  local parent_lock
  parent_lock="$(cd "$APP_DIR/.." && pwd)/package-lock.json"
  if [ -f "$parent_lock" ]; then
    log "removing stale lockfile: $parent_lock"
    rm -f "$parent_lock"
  fi
}

deps_stage() {
  npm install --no-audit --no-fund
}

build_stage() {
  cd "$APP_DIR"
  npm run build
}

runtime_data_stage() {
  sudo install -d -m 0775 -o meepo -g meepo "$DATA_DIR"
  sudo install -d -m 0775 -o meepo -g meepo "$UPLOADS_DIR"

  # Touch the DB file so the meepo user owns it before the app auto-bootstraps.
  if [ ! -f "$DB_FILE" ]; then
    sudo touch "$DB_FILE"
  fi
  sudo chown meepo:meepo "$DB_FILE"
  sudo chmod 0664 "$DB_FILE"

  # WAL mode creates -wal and -shm sidecar files; ensure directory is writable.
}

certbot_stage() {
  if ! command -v certbot >/dev/null 2>&1; then
    log "WARNING: certbot not installed; skipping certificate renewal"
    return 0
  fi

  if [ ! -d "/etc/letsencrypt/live/$CERT_DOMAIN" ]; then
    log "WARNING: no TLS certificates found for $CERT_DOMAIN"
    log "WARNING: run initial setup: sudo certbot certonly --webroot -w $CERTBOT_WEBROOT -d $CERT_DOMAIN -d www.$CERT_DOMAIN"
    return 0
  fi

  sudo certbot renew --non-interactive 2>&1 || {
    log "WARNING: certbot renew failed — check network, permissions, or challenge config"
  }

  return 0
}

nginx_stage() {
  if ! command -v nginx >/dev/null 2>&1; then
    log "WARNING: nginx not installed; skipping reverse-proxy config"
    return 0
  fi

  local src="$APP_DIR/deploy/mio-web.nginx.conf"
  local dest="/etc/nginx/sites-available/$NGINX_SITE"

  sudo install -d -m 0755 "$CERTBOT_WEBROOT"
  sudo cp "$src" "$dest"

  if [ ! -L "/etc/nginx/sites-enabled/$NGINX_SITE" ]; then
    sudo ln -sf "$dest" "/etc/nginx/sites-enabled/$NGINX_SITE"
  fi

  if sudo nginx -t; then
    sudo systemctl reload nginx
  else
    log "WARNING: nginx config test failed; skipping reload (check TLS certs for $CERT_DOMAIN)"
  fi

  return 0
}

restart_stage() {
  cd "$APP_DIR"
  sudo systemctl daemon-reload
  sudo systemctl restart "$SERVICE"
}

health_check_stage() {
  wait_for_active "$SERVICE"
  wait_for_http "$HEALTHCHECK_URL" 60
}

log "prepared deploy context for origin/$BRANCH"
log "target_sha=$TARGET_SHA"

run_stage sync sync_stage
run_stage preflight preflight_stage
run_stage clean clean_stage
run_stage deps deps_stage
run_stage build build_stage
run_stage runtime-data runtime_data_stage
run_stage certbot certbot_stage
run_stage nginx nginx_stage
run_stage restart restart_stage
run_stage health-check health_check_stage

log "success: $BRANCH deployed"
