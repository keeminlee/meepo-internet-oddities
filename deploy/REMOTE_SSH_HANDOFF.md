# REMOTE SSH HANDOFF — Meepo Internet Oddities Production Deployment

> **Generated:** 2026-04-12
> **Updated:** 2026-04-12 — git-clone-and-build deploy model
> **Source plan:** `docs/week_4/04_12_2026/PLANS/mio-git-deploy/`
> **This document is self-contained.** You do not need to read other plan files.

---

## 1. Role Definition

You are a **conservative server operator**. The application lives in a **git checkout** on the EC2 at `/home/meepo/mio`. Deploys are performed by running the `deploy-mio` command, which handles git fetch, npm ci, vite build, service restart, and health check automatically.

You perform safe server-side plumbing only: verify state, run the deploy hook, configure nginx, reload services, and verify health.

You are **not a builder or developer**. You do not write product code, modify deploy scripts, change systemd units manually, or make architectural decisions. You do not run build commands directly — `deploy-mio` handles all building.

---

## 2. Do-Not-Do List (9 Prohibitions)

You **MUST NOT** do any of the following:

1. **Build in VS Code terminal** — Do NOT run `npm ci`, `npm run build`, `vite build`, `tsc`, or any build/install command inside the VS Code integrated terminal. These consume EC2 memory and can crash the instance. Use `deploy-mio` instead, which runs outside VS Code.
2. **Modify deploy scripts** — Do not edit `deploy-mio.sh`, `install-mio-runtime.sh`, or any deploy infrastructure without human review and approval.
3. **Modify systemd units manually** — Do not edit `/etc/systemd/system/mio-web.service` directly. Changes go through `install-mio-runtime.sh`.
4. **Refactor** — Do not change application code structure, rename files, or reorganize directories beyond what this handoff specifies.
5. **Unrelated cleanup** — Do not touch files, services, or configs outside the MIO deployment scope.
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
| Git repo cloned | `/home/meepo/mio` is a git checkout of `meepo-internet-oddities` | Human runs `git clone https://github.com/keeminlee/meepo-internet-oddities.git /home/meepo/mio` |
| Env file | `/etc/mio/mio-web.env` exists with correct values | See §3a below |
| Domain DNS | `meepo.online` and `www.meepo.online` point to this EC2's public IP | Human must verify DNS propagation |
| Deploy hook installed | `/usr/local/bin/deploy-mio` exists | Installed by `install-mio-runtime.sh` (see §4.2) |
| sudo access | Passwordless sudo for the deploy user | Required for systemd and nginx operations |

### 3a. Environment File (`/etc/mio/mio-web.env`)

```env
PORT=3001
HOST=0.0.0.0
NODE_ENV=production
```

The `install-mio-runtime.sh` script creates this from the template if it doesn't exist. To create or edit manually:
```bash
sudo mkdir -p /etc/mio
sudo tee /etc/mio/mio-web.env << 'EOF'
PORT=3001
HOST=0.0.0.0
NODE_ENV=production
EOF
```

---

## 4. Safe Remote Task Sequence

Execute these steps **in order**. Do not skip steps. Do not reorder.

### First-Time Setup (New EC2)

#### Step 4.1 — Inspect Current Host State

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

#### Step 4.2 — Clone the Repo and Run Runtime Installer

```bash
# Clone the repo (first-time only)
git clone https://github.com/keeminlee/meepo-internet-oddities.git /home/meepo/mio

# Run the runtime installer
cd /home/meepo/mio
bash deploy/install-mio-runtime.sh
```

The runtime installer:
- Installs the systemd unit (`mio-web.service`) into `/etc/systemd/system/`
- Installs the deploy hook (`deploy-mio.sh`) as `/usr/local/bin/deploy-mio`
- Creates `/etc/mio/mio-web.env` from template if it doesn't exist
- Reloads systemd and enables the service

#### Step 4.3 — Edit Environment File

```bash
# Review the env file (created from template by install-mio-runtime.sh)
cat /etc/mio/mio-web.env

# Edit with production values if needed
sudo nano /etc/mio/mio-web.env
```

Confirm it contains `PORT=3001`, `HOST=0.0.0.0`, `NODE_ENV=production`. If incorrect, edit it now.

#### Step 4.4 — Verify Port Availability

```bash
ss -tlnp | grep ':3001'
```

If port 3001 is already in use by another service, **STOP and report**. Do not change the port or reassign services without human approval.

### ⏸️ HUMAN APPROVAL POINT — Before First Deploy

**Pause here.** Report what you have done so far and confirm with the human before running the first deploy. The human should verify:
- Repo is cloned at `/home/meepo/mio`
- Runtime installer completed successfully
- Env file has correct production values
- No port conflicts exist
- Starstory services are healthy

#### Step 4.5 — Run First Deploy

```bash
# Run the deploy hook (installed at /usr/local/bin/deploy-mio)
deploy-mio
```

This command performs: git fetch → checkout latest → npm ci → vite build → systemctl restart mio-web → health check. All output is logged to stdout.

**CRITICAL:** Do NOT run `deploy-mio` from the VS Code integrated terminal. Use an SSH shell session or `screen`/`tmux` to avoid memory pressure on the VS Code remote server process.

#### Step 4.6 — Verify Health Endpoint

```bash
curl -fsS http://127.0.0.1:3001/api/health
```

Expected response: `{"status":"ok"}`

If health check fails, check logs:
```bash
sudo journalctl -u mio-web -n 50 --no-pager
```

If the service is crashing or unhealthy, **STOP and report**. Do not attempt to debug application code or modify source files.

#### Step 4.7 — Install nginx Configuration

```bash
# Check if an MIO nginx config exists in the repo
ls -la /home/meepo/mio/deploy/mio-web.nginx.conf 2>/dev/null || echo "nginx config not in repo — human must provide"
```

If the nginx config file is available (or provided by the human):

```bash
# Install nginx site config
sudo cp /home/meepo/mio/deploy/mio-web.nginx.conf /etc/nginx/sites-available/mio-web

# Enable the site
sudo ln -sf /etc/nginx/sites-available/mio-web /etc/nginx/sites-enabled/mio-web

# Test nginx configuration
sudo nginx -t
```

**If `nginx -t` fails**, do not reload. **STOP and report** the exact error.

### ⏸️ HUMAN APPROVAL POINT — Before nginx Reload

**Pause here.** Report the `nginx -t` output and confirm with the human before reloading nginx. This is critical because nginx also serves Starstory — a bad config reload would take down both sites.

#### Step 4.8 — Reload nginx

```bash
sudo systemctl reload nginx
```

#### Step 4.9 — TLS Certificate (Human-Gated)

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

### Subsequent Deploys

For all deploys after the initial setup, the process is:

```bash
# Just run the deploy hook
deploy-mio

# Or with explicit path:
sudo /usr/local/bin/deploy-mio
```

That's it. `deploy-mio` handles git fetch, npm ci, vite build, service restart, and health check automatically.

---

## 5. Conflict / Stop Conditions

You **MUST stop and report** (do not improvise or work around) if you encounter any of the following:

| # | Condition | Why |
|---|-----------|-----|
| 1 | **Port conflict** — port 3001 is already in use by another service | Reassigning ports affects other services and nginx configs |
| 2 | **Unclear proxy ownership** — existing nginx config for meepo.online or conflicting server_name blocks | Could break Starstory or another service |
| 3 | **Missing credentials** — SSH keys, sudo access, DNS credentials, or certbot prerequisites unavailable | Cannot proceed safely without proper access |
| 4 | **Missing git repo** — `/home/meepo/mio/.git` does not exist | deploy-mio requires a git checkout |
| 5 | **Ambiguous service naming** — a service named `mio-web` or similar already exists with different config | Could conflict with or overwrite existing services |
| 6 | **Risk of affecting Starstory prod** — any command, config change, or service operation that could impact Starstory (meepo-bot) services, nginx routes, or data | Starstory must remain fully operational |
| 7 | **VS Code terminal builds** — any situation where the only path forward requires running npm/vite/build commands in the VS Code integrated terminal | Builds in VS Code terminal crash the t3.small; use `deploy-mio` instead |

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
| **Before first deploy** | After steps 4.1–4.4 | Repo cloned, runtime installed, env file contents, port availability, Starstory health |
| **Before nginx reload** | After step 4.7 (`nginx -t`) | Full `nginx -t` output, list of all enabled nginx sites, any warnings |
| **Before certbot** | After step 4.9 readiness check | Whether certbot is available, whether a cert already exists, DNS propagation status |

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
                 │ /home/      │  │  existing     │
                 │  meepo/mio  │  │              │
                 └─────────────┘  └──────────────┘
```

**Process isolation:** Separate systemd units, separate directories, separate env files, separate logs. Deploying or restarting MIO does not affect Starstory.

---

## Reference: Key Paths

| Item | Path |
|------|------|
| App directory (git checkout) | `/home/meepo/mio` |
| Frontend files (after build) | `/home/meepo/mio/dist/` |
| Backend source | `/home/meepo/mio/server/index.ts` |
| Database | `/home/meepo/mio/server/db.json` |
| Env file | `/etc/mio/mio-web.env` |
| systemd unit | `/etc/systemd/system/mio-web.service` |
| Deploy hook | `/usr/local/bin/deploy-mio` |
| Deploy script (source) | `/home/meepo/mio/deploy/deploy-mio.sh` |
| Runtime installer | `/home/meepo/mio/deploy/install-mio-runtime.sh` |
| nginx config | `/etc/nginx/sites-available/mio-web` |
| nginx enabled | `/etc/nginx/sites-enabled/mio-web` |
| Logs | `journalctl -u mio-web` |

## Reference: Key Commands

| Action | Command |
|--------|---------|
| **Deploy (full cycle)** | `deploy-mio` or `sudo /usr/local/bin/deploy-mio` |
| Re-install runtime assets | `bash /home/meepo/mio/deploy/install-mio-runtime.sh` |
| Start service | `sudo systemctl start mio-web` |
| Stop service | `sudo systemctl stop mio-web` |
| Restart service | `sudo systemctl restart mio-web` |
| Check status | `sudo systemctl status mio-web` |
| View logs | `sudo journalctl -u mio-web -f` |
| Test nginx | `sudo nginx -t` |
| Reload nginx | `sudo systemctl reload nginx` |
| Health check | `curl -fsS http://127.0.0.1:3001/api/health` |
