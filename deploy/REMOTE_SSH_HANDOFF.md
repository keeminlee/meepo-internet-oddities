# REMOTE SSH HANDOFF — Meepo Internet Oddities Production Deployment

> **Generated:** 2026-04-12
> **Source plan:** `docs/week_4/04_12_2026/PLANS/mio-prod-deploy/`
> **This document is self-contained.** You do not need to read other plan files.

---

## 1. Role Definition

You are a **conservative server operator**. You receive pre-built artifacts from the local machine and perform safe server-side plumbing only: create directories, copy files, place env, install systemd units, configure nginx, reload services, and verify health.

You are **not a builder**. You do not write product code, build frontend assets, compile TypeScript, install npm packages, or make architectural decisions.

---

## 2. Do-Not-Do List (9 Prohibitions)

You **MUST NOT** do any of the following:

1. **Build on-server** — Do not run `npm`, `npx`, `vite`, `tsc`, or any build tool on the EC2. All artifacts arrive pre-built.
2. **Refactor** — Do not change application code structure, rename files, or reorganize directories beyond what this handoff specifies.
3. **Dependency experimentation** — Do not install, upgrade, or remove Node packages on the server.
4. **Unrelated cleanup** — Do not touch files, services, or configs outside the MIO deployment scope.
5. **Broad repo changes** — Do not modify the git repository on the server. You work with rsynced artifacts, not a git checkout.
6. **Autonomous invention** — Do not add features, create scripts, or introduce tools not specified in this handoff.
7. **Graph/index jobs** — Do not run any knowledge graph, indexing, or heavy computational work.
8. **Recursive self-improvement** — Do not modify your own operating instructions or attempt multi-step autonomous work beyond this handoff.
9. **Any heavy process likely to destabilize the EC2** — This instance also runs Starstory (meepo-bot). Anything that risks CPU/memory pressure, disk exhaustion, or process interference is forbidden.

---

## 3. Expected Inputs (What the Human Must Have Ready)

Before you begin, the human must confirm all of the following are available:

| Input | Expected value | Notes |
|-------|---------------|-------|
| SSH access | You are running on the EC2 via remote SSH | Already true if you're reading this |
| Artifacts rsynced | `/srv/mio/dist/` and `/srv/mio/server/` exist | Human runs `deploy-mio.sh` from local, or manually rsyncs |
| Env file | `/etc/mio/mio-web.env` exists with correct values | See §3a below |
| Domain DNS | `meepo.online` and `www.meepo.online` point to this EC2's public IP | Human must verify DNS propagation |
| Systemd unit file | `/srv/mio/mio-web.service` was rsynced | deploy-mio.sh copies this automatically |
| nginx config file | On the server or provided by human | See §3b below |
| sudo access | Passwordless sudo for the deploy user | Required for systemd and nginx operations |

### 3a. Environment File (`/etc/mio/mio-web.env`)

```env
PORT=3001
HOST=0.0.0.0
NODE_ENV=production
```

The human creates this file:
```bash
sudo mkdir -p /etc/mio
sudo tee /etc/mio/mio-web.env << 'EOF'
PORT=3001
HOST=0.0.0.0
NODE_ENV=production
EOF
```

### 3b. Files to Deploy (Artifact Manifest from Local Build)

These files must be present at `/srv/mio/` after rsync. They are produced by the local build (step 4) and transferred by `deploy-mio.sh` or manual rsync/scp.

**Frontend build output (`dist/`):**

| File | Size | Purpose |
|------|------|---------|
| `dist/index.html` | 1,279 B | SPA entry point |
| `dist/assets/index-DMYao8sk.js` | 390,353 B | Main JS bundle (hashed) |
| `dist/assets/index-q1jKGE2G.css` | 62,916 B | Main CSS bundle (hashed) |
| `dist/favicon.ico` | 20,373 B | App icon |
| `dist/placeholder.svg` | 28,665 B | Placeholder image |
| `dist/robots.txt` | 174 B | Robots file |

**Backend source (`server/`):**

| File | Purpose |
|------|---------|
| `server/index.ts` | Node HTTP server (runs directly via `--experimental-strip-types`) |
| `server/db.json` | Flat-file database (16 creators, 16 projects, 1 submission) |

**Total payload:** ~504 KB (dist/) + server/ source files

**Deploy support files (rsynced to `/srv/mio/`):**

| File | Purpose |
|------|---------|
| `mio-web.service` | systemd unit template |

---

## 4. Safe Remote Task Sequence

Execute these steps **in order**. Do not skip steps. Do not reorder.

### Step 4.1 — Inspect Current Host State

```bash
# Check what's already running
systemctl list-units --type=service --state=running | grep -E 'meepo|mio|starstory'

# Check existing nginx sites
ls -la /etc/nginx/sites-enabled/

# Check existing port usage
ss -tlnp | grep -E '3001|3000|80|443'

# Check Node version
node --version

# Test --experimental-strip-types support
echo 'const x: number = 1; console.log(x)' > /tmp/ts-test.ts
node --experimental-strip-types /tmp/ts-test.ts
rm /tmp/ts-test.ts
```

**HARD STOP — Node runtime mismatch:** If `node --experimental-strip-types` does not work cleanly (errors, missing flag, incorrect output), **STOP immediately and report**. Do not improvise a build/transpile path on-server. Do not install a different Node version without human approval. Report the exact Node version and error.

### Step 4.2 — Verify Artifacts Arrived

```bash
# Check deploy directory exists and has content
ls -la /srv/mio/
ls -la /srv/mio/dist/
ls -la /srv/mio/server/
ls -la /srv/mio/dist/assets/

# Verify key files exist
test -f /srv/mio/dist/index.html && echo "OK: index.html" || echo "MISSING: index.html"
test -f /srv/mio/dist/assets/index-DMYao8sk.js && echo "OK: main JS" || echo "MISSING: main JS"
test -f /srv/mio/dist/assets/index-q1jKGE2G.css && echo "OK: main CSS" || echo "MISSING: main CSS"
test -f /srv/mio/server/index.ts && echo "OK: server/index.ts" || echo "MISSING: server/index.ts"
test -f /srv/mio/server/db.json && echo "OK: server/db.json" || echo "MISSING: server/db.json"
```

If any file is missing, **STOP and report**. Do not proceed without the full artifact set.

### Step 4.3 — Verify Env File

```bash
test -f /etc/mio/mio-web.env && echo "OK: env file exists" || echo "MISSING: env file"
cat /etc/mio/mio-web.env
```

Confirm it contains `PORT=3001`, `HOST=0.0.0.0`, `NODE_ENV=production`. If missing or incorrect, **STOP and report** — the human must create it (see §3a).

### Step 4.4 — Verify Port Availability

```bash
ss -tlnp | grep ':3001'
```

If port 3001 is already in use by another service, **STOP and report**. Do not change the port or reassign services without human approval.

### Step 4.5 — Install systemd Service

```bash
# Copy unit file into systemd
sudo cp /srv/mio/mio-web.service /etc/systemd/system/mio-web.service

# Reload systemd daemon
sudo systemctl daemon-reload

# Enable service (auto-start on boot)
sudo systemctl enable mio-web
```

### ⏸️ HUMAN APPROVAL POINT — Before First Service Start

**Pause here.** Report what you have done so far and confirm with the human before starting the service for the first time. The human should verify:
- Artifacts are in place
- Env file is correct
- systemd unit is installed
- No port conflicts exist
- Starstory services are healthy

### Step 4.6 — Start MIO Service

```bash
sudo systemctl start mio-web

# Check status immediately
sudo systemctl status mio-web --no-pager

# Check it's actually listening
sleep 2
ss -tlnp | grep ':3001'
```

### Step 4.7 — Verify Health Endpoint

```bash
curl -fsS http://127.0.0.1:3001/api/health
```

Expected response: `{"status":"ok"}`

If health check fails, check logs:
```bash
sudo journalctl -u mio-web -n 50 --no-pager
```

If the service is crashing or unhealthy, **STOP and report**. Do not attempt to debug application code or modify source files.

### Step 4.8 — Install nginx Configuration

```bash
# Check if an MIO nginx config was rsynced or needs to be created from template
ls -la /srv/mio/mio-web.nginx.conf 2>/dev/null || echo "nginx config not on server — human must provide"
```

If the nginx config file is available at `/srv/mio/mio-web.nginx.conf` (or provided by the human):

```bash
# Install nginx site config
sudo cp /srv/mio/mio-web.nginx.conf /etc/nginx/sites-available/mio-web

# Enable the site
sudo ln -sf /etc/nginx/sites-available/mio-web /etc/nginx/sites-enabled/mio-web

# Test nginx configuration
sudo nginx -t
```

**If `nginx -t` fails**, do not reload. **STOP and report** the exact error.

### ⏸️ HUMAN APPROVAL POINT — Before nginx Reload

**Pause here.** Report the `nginx -t` output and confirm with the human before reloading nginx. This is critical because nginx also serves Starstory — a bad config reload would take down both sites.

### Step 4.9 — Reload nginx

```bash
sudo systemctl reload nginx
```

### Step 4.10 — TLS Certificate (Human-Gated)

TLS setup requires interactive certbot. Report readiness and let the human decide:

```bash
# Check if certbot is installed
which certbot 2>/dev/null && echo "certbot available" || echo "certbot not found"

# Check if meepo.online cert already exists
sudo ls /etc/letsencrypt/live/meepo.online/ 2>/dev/null && echo "cert exists" || echo "no cert yet"
```

If the human approves TLS setup:
```bash
sudo certbot --nginx -d meepo.online -d www.meepo.online
```

**Do not run certbot without human approval.** Certbot modifies nginx config and makes external ACME requests.

---

## 5. Conflict / Stop Conditions

You **MUST stop and report** (do not improvise or work around) if you encounter any of the following:

| # | Condition | Why |
|---|-----------|-----|
| 1 | **Port conflict** — port 3001 is already in use by another service | Reassigning ports affects other services and nginx configs |
| 2 | **Unclear proxy ownership** — existing nginx config for meepo.online or conflicting server_name blocks | Could break Starstory or another service |
| 3 | **Missing credentials** — SSH keys, sudo access, DNS credentials, or certbot prerequisites unavailable | Cannot proceed safely without proper access |
| 4 | **Missing artifacts** — any file from the artifact manifest (§3b) is absent from `/srv/mio/` | Incomplete deployment will fail at runtime |
| 5 | **Ambiguous service naming** — a service named `mio-web` or similar already exists with different config | Could conflict with or overwrite existing services |
| 6 | **Risk of affecting Starstory prod** — any command, config change, or service operation that could impact Starstory (meepo-bot) services, nginx routes, or data | Starstory must remain fully operational |
| 7 | **Commands requiring heavy on-server build** — any situation where the only path forward requires `npm install`, `npm run build`, `vite build`, `tsc`, or similar on the EC2 | Builds crash the t3.small; all building is done locally |

### Node Runtime Mismatch — HARD STOP

If the EC2 Node runtime does not support `node --experimental-strip-types` cleanly, **STOP and report immediately**.

- Do not install a different Node version.
- Do not improvise a build/transpile path on-server.
- Do not install ts-node, tsx, or any TypeScript runtime.
- Report the exact `node --version` output and the error message.

This is a **non-negotiable hard stop**. The human will decide how to resolve the runtime mismatch.

---

## 6. Human Approval Points

| Point | When | What to report |
|-------|------|----------------|
| **Before first service start** | After steps 4.1–4.5 | Artifact verification results, env file contents, systemd install status, port availability, Starstory health |
| **Before nginx reload** | After step 4.8 (`nginx -t`) | Full `nginx -t` output, list of all enabled nginx sites, any warnings |
| **Before certbot** | After step 4.10 readiness check | Whether certbot is available, whether a cert already exists, DNS propagation status |

At each approval point, **stop executing and wait for the human to confirm** before proceeding.

---

## 7. Post-Deploy Verification Checklist

After all steps complete and human approvals are granted, verify each item:

```bash
# 1. Service status — mio-web is active and running
sudo systemctl status mio-web --no-pager
# Expected: active (running)

# 2. Process listening — Node is bound to port 3001
ss -tlnp | grep ':3001'
# Expected: node process on 0.0.0.0:3001

# 3. Health endpoint — API responds correctly
curl -fsS http://127.0.0.1:3001/api/health
# Expected: {"status":"ok"}

# 4. Homepage — static frontend serves through backend
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/
# Expected: 200

# 5. nginx proxy — reverse proxy routes to MIO
curl -s -o /dev/null -w "%{http_code}" -H "Host: meepo.online" http://127.0.0.1/
# Expected: 200 (or 301 redirect to https)

# 6. Domain response (run only after DNS is pointing here)
curl -s -o /dev/null -w "%{http_code}" https://meepo.online/
# Expected: 200

# 7. TLS working (run only after certbot)
curl -s -o /dev/null -w "%{http_code}" https://meepo.online/api/health
# Expected: 200 with valid TLS

# 8. Logs healthy — no crash loops or errors
sudo journalctl -u mio-web -n 20 --no-pager
# Expected: clean startup messages, no repeated restarts

# 9. Starstory unaffected — existing services still running
sudo systemctl status meepo-bot --no-pager
sudo systemctl status meepo-web --no-pager 2>/dev/null || echo "meepo-web service may not exist — check with human"
# Expected: active (running), no recent restarts coinciding with MIO deploy

# 10. No unexpected port conflicts
ss -tlnp | grep -E '3000|3001|80|443'
# Expected: 3001=mio-web, 3000=meepo-bot (or whatever Starstory uses), 80/443=nginx
```

### Success Criteria

All of the following must be true:
- [ ] `mio-web` service is `active (running)`
- [ ] `/api/health` returns `{"status":"ok"}` on port 3001
- [ ] Homepage serves correctly through nginx
- [ ] `meepo.online` resolves and serves MIO (after DNS)
- [ ] TLS is valid (after certbot)
- [ ] Logs show no crash loops
- [ ] Starstory services are unaffected — no restarts, no errors
- [ ] No port conflicts between MIO and existing services

---

## Reference: Service Architecture

```
                    ┌──────────────────────────┐
                    │    nginx (port 80/443)    │
                    │                          │
                    │  meepo.online ──────┐    │
                    │  starstory.online ──┐│    │
                    └─────────────────────┼┼────┘
                                          ││
                          ┌───────────────┘│
                          │                │
                          ▼                ▼
                 ┌─────────────┐  ┌──────────────┐
                 │  mio-web    │  │  meepo-bot   │
                 │  port 3001  │  │  (Starstory)  │
                 │  /srv/mio   │  │  existing     │
                 └─────────────┘  └──────────────┘
```

**Process isolation:** Separate systemd units, separate directories, separate env files, separate logs. Deploying or restarting MIO does not affect Starstory.

---

## Reference: Key Paths

| Item | Path |
|------|------|
| App directory | `/srv/mio` |
| Frontend files | `/srv/mio/dist/` |
| Backend source | `/srv/mio/server/index.ts` |
| Database | `/srv/mio/server/db.json` |
| Env file | `/etc/mio/mio-web.env` |
| systemd unit | `/etc/systemd/system/mio-web.service` |
| nginx config | `/etc/nginx/sites-available/mio-web` |
| nginx enabled | `/etc/nginx/sites-enabled/mio-web` |
| Logs | `journalctl -u mio-web` |

## Reference: Key Commands

| Action | Command |
|--------|---------|
| Start service | `sudo systemctl start mio-web` |
| Stop service | `sudo systemctl stop mio-web` |
| Restart service | `sudo systemctl restart mio-web` |
| Check status | `sudo systemctl status mio-web` |
| View logs | `sudo journalctl -u mio-web -f` |
| Test nginx | `sudo nginx -t` |
| Reload nginx | `sudo systemctl reload nginx` |
| Health check | `curl -fsS http://127.0.0.1:3001/api/health` |
