# CURRENT_STATE.md — Meepo Internet Oddities

> **Last verified:** 2026-04-13, post-migration validation pass
> **Architecture:** Next.js 15.5 (App Router) + SQLite (better-sqlite3) + React 18 + Tailwind + shadcn/ui

---

## Product summary

Meepo is a creator platform for "authored software" — a curated directory of distinctive, personal, AI-built web artifacts with visible maker identities. The app is a Next.js 15 monolith with App Router, server-side API route handlers, and SQLite persistence. Brand: "The Era of Software-as-a-Society."

---

## Currently functional

### API Routes (`app/api/`)

All endpoints verified via HTTP requests against running dev server:

| Method | Path | What it does | Auth |
|--------|------|-------------|------|
| GET | `/api/health` | Health check (`{"status":"ok"}`) | No |
| GET | `/api/projects` | List approved non-demo projects, optional `?tag=` and `?status=` | No |
| GET | `/api/projects/featured` | Approved + featured non-demo projects | No |
| GET | `/api/projects/newest?count=N` | Approved non-demo projects by created_at desc | No |
| GET | `/api/projects/:slug` | Single approved project with resolved creator | No |
| POST | `/api/projects/:slug/click` | Increment `clicks_sent`, return count + external_url | No |
| PATCH | `/api/projects/:slug` | Edit a project (owner only) | Yes |
| GET | `/api/creators` | All creators | No |
| GET | `/api/creators/:handle` | Single creator + their projects | No |
| POST | `/api/submit` | Create pending submission in SQLite | Yes |
| GET | `/api/review` | List pending submissions (MEEPO_WRITERS only) | Yes (admin) |
| POST | `/api/review/:slug/approve` | Approve a submission | Yes (admin) |
| POST | `/api/review/:slug/reject` | Reject with optional reason | Yes (admin) |
| GET | `/api/my-projects` | User's own projects | Yes |
| POST | `/api/upload` | Upload screenshot/avatar | Yes |
| GET | `/api/auth/github` | Start GitHub OAuth flow | No |
| GET | `/api/auth/github/callback` | OAuth callback handler | No |
| GET | `/api/auth/me` | Current user info | No |
| POST | `/api/auth/logout` | End session | No |

### Data layer (SQLite)

- **Database:** `data/mio.db` (WAL mode, foreign keys on)
- **16 projects** (15 demo seed + 1 real "meepo"), 15 creators, 1 real user
- Schema: projects, creators, users, submissions tables
- Auto-bootstraps on first request: creates schema, seeds from `_legacy/server/db.json`
- Click tracking persists to SQLite (verified: increment + restart = data retained)

### Frontend Pages

| Route | Page | Data source |
|-------|------|-------------|
| `/` | Homepage — hero, tag filter, project grids | SQLite via API |
| `/project/:slug` | Project detail — screenshot, stats, maker identity, click tracking | SQLite via API |
| `/creator/:handle` | Creator profile — bio, thesis, their projects | SQLite via API |
| `/submit` | Submit form — name, URL, pitch, screenshot upload, tags | Posts to API |
| `/admin` | Review queue — pending submissions, approve/reject buttons | SQLite via API (auth-gated) |

### Features verified working

- Homepage loads and renders projects from SQLite (200, 29KB)
- Project detail page renders (200, 28KB)
- Creator profile page renders (200, 25KB)
- Click tracking: increment works (3→4), persists across server restart
- Submit form page loads (200, 21KB), POST returns 401 without auth (correct)
- Admin page loads with auth redirect to GitHub OAuth (307)
- API routes all return correct status codes and JSON
- Data survives server restart (SQLite persistence confirmed)

### Components

- Full shadcn/ui component library in `components/ui/`
- React Query hooks for all API endpoints in `_legacy/src/hooks/use-api.ts`
- Tailwind CSS with custom theme configuration

---

## Auth model

- **GitHub OAuth** gates all write operations (submit, edit, review, upload)
- **MEEPO_WRITERS** env var (comma-separated emails) controls admin access
- Session stored in HTTP-only cookies
- Public routes require no auth: browse, project detail, creator profile, click tracking
- Admin routes redirect to `/api/auth/github` when unauthenticated

### Creator profile pages

- `src/pages/CreatorProfile.tsx` exists with full layout (header, bio, creative thesis, links, project grid)
- **No route registered in `App.tsx`** — the page is unreachable. App.tsx only defines `/`, `/project/:slug`, and `*` (404).
- The page imports `getCreatorByHandle` from `@/data/creators` and `getAllProjects` from `@/data/projects` — static data

### Vite dev proxy

- Root plan noted `/api` proxy to backend, but **vite.config.ts has no proxy configuration**
- In development, the frontend (port 8080) cannot reach the backend (port 3001) via relative `/api` paths
- This is currently irrelevant since no page actually calls the API, but would need to be added before the API hooks can work in dev

### Production build / deployment

---

## Uploads

- Upload path configurable via `MIO_UPLOAD_DIR` env var (default: `data/uploads/`)
- Files served via `app/uploads/` route with path traversal guard
- Migration CLI (`npm run uploads:migrate`) copies from legacy `_legacy/server/uploads/`

---

## Local vs production state

| Aspect | Local | Production |
|--------|-------|------------|
| App | `npm run dev` → Next.js dev server on port 3000 | Not deployed |
| Database | SQLite at `data/mio.db` (WAL mode) | N/A |
| Uploads | `data/uploads/` | N/A |
| Domain | localhost | `meepo.online` registered (referenced in constants.ts) |
| Build | `npm run build` → `.next/` | No build pipeline |
| HTTPS | N/A | Not configured |
| Process management | Manual | No systemd unit |

---

## Deployment status

**Not deployed.** No deployment artifacts exist in this repo. The domain `meepo.online` is referenced in `lib/constants.ts`. The target EC2 instance runs meepo-bot (Starstory) — MIO would coexist with process isolation. For production: set `MIO_DB_PATH` and `MIO_UPLOAD_DIR` to paths outside the repo checkout.

---

## Known limitations

1. **Demo data excluded** — 14 seed projects have `is_demo = 1` and are filtered from public API. Only real submissions appear.
2. **No production deploy config** — No Dockerfile, systemd unit, or nginx config yet.
3. **No test coverage** — API routes and domain logic have no tests beyond the placeholder.
4. **Legacy `.env` coexists** — Old env vars (PORT, HOST) from the Vite server still present. Next.js reads `.env` automatically.
5. **OG/social metadata** — Basic metadata in layout.tsx; no per-page dynamic OG images yet.
6. **Edit-after-rejection flow** — Backend supports it (PATCH on own rejected project), but frontend UX for this flow is minimal.

---

## Legacy stack

The pre-migration codebase is preserved in `_legacy/` for reference:
- `_legacy/src/` — React SPA (static data arrays, React Router, hooks)
- `_legacy/server/` — Node HTTP server + `db.json` + `db.seed.json` + uploads
- `_legacy/vite.config.ts`, `_legacy/index.html`, etc. — Old build config

Excluded from TypeScript compilation and Tailwind scanning via `tsconfig.json` and `tailwind.config.ts`.
