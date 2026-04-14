#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/meepo/mio"
SYSTEMD_DIR="/etc/systemd/system"
ENV_DIR="/etc/mio"

if ! sudo -n true >/dev/null 2>&1; then
  echo "sudo must be passwordless for runtime asset install." >&2
  exit 1
fi

echo "[runtime] installing systemd unit file"
sudo install -m 0644 "$APP_DIR/deploy/mio-web.service" "$SYSTEMD_DIR/mio-web.service"

echo "[runtime] installing deploy hook"
sudo install -m 0755 "$APP_DIR/deploy/deploy-mio.sh" /usr/local/bin/deploy-mio

echo "[runtime] ensuring $ENV_DIR exists"
sudo install -d -m 0750 -g meepo "$ENV_DIR"

if [[ ! -f "$ENV_DIR/mio-web.env" ]]; then
  echo "[runtime] creating $ENV_DIR/mio-web.env from template"
  sudo install -m 0640 -g meepo "$APP_DIR/deploy/mio-web.env.example" "$ENV_DIR/mio-web.env"
fi

echo "[runtime] reloading systemd"
sudo systemctl daemon-reload

echo "[runtime] enabling mio-web service"
sudo systemctl enable mio-web.service

if command -v nginx >/dev/null 2>&1; then
  echo "[runtime] installing nginx site config"
  sudo cp "$APP_DIR/deploy/mio-web.nginx.conf" /etc/nginx/sites-available/mio-web
  if [ ! -L /etc/nginx/sites-enabled/mio-web ]; then
    sudo ln -s /etc/nginx/sites-available/mio-web /etc/nginx/sites-enabled/mio-web
  fi
  echo "[runtime] creating certbot webroot"
  sudo install -d -m 0755 /var/www/certbot
  echo "[runtime] testing nginx config"
  if sudo nginx -t 2>&1; then
    sudo systemctl reload nginx
  else
    echo "[runtime] WARNING: nginx config test failed; TLS certs may not exist yet"
    echo "[runtime] run: sudo certbot certonly --webroot -w /var/www/certbot -d meepo.online -d www.meepo.online"
  fi
fi

DATA_DIR="/var/lib/mio"
echo "[runtime] ensuring data directory $DATA_DIR"
sudo install -d -m 0775 -o meepo -g meepo "$DATA_DIR"
sudo install -d -m 0775 -o meepo -g meepo "$DATA_DIR/uploads"

echo "[runtime] install complete"
