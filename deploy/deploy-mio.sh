#!/usr/bin/env bash
# deploy-mio.sh — rsync-based deploy for Meepo Internet Oddities
# Usage: ./deploy-mio.sh meepo@ec2-host
#
# This script rsyncs PRE-BUILT local artifacts to the remote server.
# It NEVER runs npm, vite, or any build command on the remote server.
set -euo pipefail

# ── Configuration ────────────────────────────────────────
REMOTE_DIR="/srv/mio"
ENV_FILE="/etc/mio/mio-web.env"
SERVICE="mio-web"
HEALTH_URL="http://127.0.0.1:3001/api/health"
MIN_FREE_KB="${MIN_FREE_KB:-256000}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Argument parsing ────────────────────────────────────
if [ $# -lt 1 ]; then
  echo "Usage: $0 <ssh-target> [--dry-run]"
  echo "  e.g. $0 meepo@ec2-host"
  exit 1
fi

SSH_TARGET="$1"
DRY_RUN=""
if [ "${2:-}" = "--dry-run" ]; then
  DRY_RUN="--dry-run"
fi

# ── Helpers ──────────────────────────────────────────────
log() {
  echo "[deploy-mio] $(date -u +%H:%M:%SZ) $*"
}

fail() {
  log "FATAL: $*"
  exit 1
}

run_remote() {
  ssh -o ConnectTimeout=10 -o BatchMode=yes "$SSH_TARGET" "$@"
}

# ── Stage: Preflight (local) ────────────────────────────
log "=== PREFLIGHT (local) ==="

[ -d "$PROJECT_ROOT/dist" ] || fail "dist/ not found. Run 'npm run build' locally before deploying."
[ -d "$PROJECT_ROOT/server" ] || fail "server/ not found at project root."
[ -f "$PROJECT_ROOT/server/index.ts" ] || fail "server/index.ts not found."

log "Local artifacts OK: dist/ and server/ present"

# ── Stage: Preflight (remote) ───────────────────────────
log "=== PREFLIGHT (remote) ==="

log "Testing SSH connectivity..."
run_remote "true" || fail "Cannot connect to $SSH_TARGET via SSH"

log "Checking remote deploy directory..."
run_remote "[ -d '$REMOTE_DIR' ]" || fail "Remote directory $REMOTE_DIR does not exist. Create it first: sudo mkdir -p $REMOTE_DIR && sudo chown meepo:meepo $REMOTE_DIR"

log "Checking remote env file..."
run_remote "[ -f '$ENV_FILE' ]" || fail "Remote env file $ENV_FILE does not exist. Place it first: sudo mkdir -p /etc/mio && sudo cp mio-web.env.example $ENV_FILE"

log "Checking disk space..."
AVAILABLE_KB=$(run_remote "df -Pk /srv | awk 'NR==2 {print \$4}'")
if [ "$AVAILABLE_KB" -lt "$MIN_FREE_KB" ]; then
  fail "Insufficient disk space: ${AVAILABLE_KB}KB free, need ${MIN_FREE_KB}KB"
fi
log "Disk OK: ${AVAILABLE_KB}KB free"

log "Checking sudo access..."
run_remote "sudo -n true" || fail "Sudo must be passwordless for deploy user"

# ── Stage: Rsync ────────────────────────────────────────
log "=== RSYNC ==="

# Sync dist/ (frontend build output)
log "Syncing dist/..."
rsync -avz --delete $DRY_RUN \
  "$PROJECT_ROOT/dist/" \
  "$SSH_TARGET:$REMOTE_DIR/dist/"

# Sync server/ (backend TypeScript source — runs via --experimental-strip-types)
log "Syncing server/..."
rsync -avz --delete $DRY_RUN \
  "$PROJECT_ROOT/server/" \
  "$SSH_TARGET:$REMOTE_DIR/server/"

# Sync the systemd unit file to the deploy directory (for reference / manual install)
if [ -f "$SCRIPT_DIR/mio-web.service" ]; then
  log "Syncing systemd unit..."
  rsync -avz $DRY_RUN \
    "$SCRIPT_DIR/mio-web.service" \
    "$SSH_TARGET:$REMOTE_DIR/mio-web.service"
fi

if [ -n "$DRY_RUN" ]; then
  log "Dry run complete. No remote changes made."
  exit 0
fi

# ── Stage: Systemd ──────────────────────────────────────
log "=== SYSTEMD ==="

# Install service file if it was synced
run_remote "
  if [ -f '$REMOTE_DIR/mio-web.service' ]; then
    sudo cp '$REMOTE_DIR/mio-web.service' /etc/systemd/system/$SERVICE.service
    sudo systemctl daemon-reload
  fi
"
log "Systemd daemon reloaded"

# ── Stage: Restart ──────────────────────────────────────
log "=== RESTART ==="

run_remote "sudo systemctl restart $SERVICE"
log "Service $SERVICE restarted"

# ── Stage: Health Check ─────────────────────────────────
log "=== HEALTH CHECK ==="

HEALTH_OK=0
for i in $(seq 1 15); do
  if run_remote "curl -fsS '$HEALTH_URL'" >/dev/null 2>&1; then
    HEALTH_OK=1
    break
  fi
  log "Health check attempt $i/15 — waiting..."
  sleep 2
done

if [ "$HEALTH_OK" -ne 1 ]; then
  log "FAILED: Health check did not pass after 15 attempts"
  log "Fetching recent logs..."
  run_remote "sudo journalctl -u $SERVICE -n 50 --no-pager" || true
  fail "Deploy failed — service is not healthy"
fi

log "Health check passed"

# ── Done ────────────────────────────────────────────────
log "=== SUCCESS ==="
log "MIO deployed to $SSH_TARGET:$REMOTE_DIR"
log "Service: $SERVICE | Health: $HEALTH_URL"
