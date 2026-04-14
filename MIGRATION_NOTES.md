# Migration Notes — Vite + db.json → Next.js + SQLite

> **Migration completed:** 04_13_2026
> **Plan tree:** `docs/week_4/04_13_2026/PLANS/mio-nextjs-sqlite-migration/`

---

## What Changed

### Architecture

| Before | After |
|--------|-------|
| Vite 5 + React 18 SPA | Next.js 15.5 (App Router) + React 18 |
| Custom Node HTTP server (`server/index.ts`) | Next.js API route handlers (`app/api/`) |
| `db.json` flat file persistence | SQLite via better-sqlite3 (`data/mio.db`) |
| Static data arrays drive frontend | All pages read from SQLite via API routes |
| No auth | GitHub OAuth (session cookies) |
| No review UI | Admin review queue (`/admin`) |
| Uploads in `server/uploads/` | Durable upload dir via `MIO_UPLOAD_DIR` env |

### File Layout

```
meepo-internet-oddities/
├── app/                     # Next.js App Router pages + API routes
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Homepage (browse projects)
│   ├── globals.css          # Tailwind directives
│   ├── admin/               # Review queue (auth-gated)
│   ├── creator/[handle]/    # Creator profile page
│   ├── project/[slug]/      # Project detail page
│   ├── submit/              # Submit form page
│   ├── uploads/             # Upload serving route
│   └── api/
│       ├── auth/            # GitHub OAuth endpoints
│       ├── creators/        # Creator list + detail
│       ├── health/          # Health check
│       ├── my-projects/     # User's own projects
│       ├── projects/        # Project CRUD + click tracking
│       ├── review/          # Review queue + approve/reject
│       ├── submit/          # Submission endpoint
│       └── upload/          # File upload endpoint
├── lib/
│   ├── api/                 # Response helpers
│   ├── auth/                # Session + OAuth logic
│   ├── constants.ts         # Brand constants, tags, statuses
│   ├── db/                  # SQLite driver, schema, bootstrap, seed
│   ├── domain/              # Business logic (projects, creators, submissions, users)
│   ├── uploads.ts           # Upload path resolution
│   └── utils.ts             # Shared utilities
├── components/ui/           # shadcn/ui primitives
├── hooks/                   # use-mobile, use-toast
├── data/                    # Runtime data (gitignored)
│   ├── mio.db               # SQLite database
│   └── uploads/             # Uploaded files
├── _legacy/                 # Old Vite + server stack (preserved for reference)
│   ├── src/                 # Original React SPA source
│   ├── server/              # Original Node server + db.json
│   └── ...                  # Old config files
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── package.json
├── .env.example             # Template for environment variables
└── .gitignore
```

---

## How to Run

### Prerequisites

- Node.js 20+ (tested on Node 25)
- npm

### First Run

```bash
cd meepo-internet-oddities
npm install
cp .env.example .env.local   # Fill in GitHub OAuth creds
npm run dev                   # Starts on http://localhost:3000
```

On first request, the app auto-bootstraps:
1. Creates SQLite schema (`data/mio.db`)
2. Seeds from `_legacy/server/db.json` if the DB is empty
3. Migrates uploads from `_legacy/server/uploads/` to `data/uploads/`

### Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start dev server (port 3000) |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run db:migrate` | Run schema migrations manually |
| `npm run db:seed` | Seed database from legacy db.json |
| `npm run uploads:migrate` | Copy uploads from legacy dir to data/uploads |
| `npm test` | Run tests (vitest) |

### Environment Variables

See `.env.example` for full list. Key variables:

| Variable | Purpose | Default |
|----------|---------|---------|
| `MIO_DB_PATH` | SQLite database path | `<repo>/data/mio.db` |
| `MIO_UPLOAD_DIR` | Durable uploads directory | `<repo>/data/uploads` |
| `GITHUB_CLIENT_ID` | GitHub OAuth app ID | (required for auth) |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app secret | (required for auth) |
| `GITHUB_CALLBACK_URL` | OAuth callback URL | `http://localhost:3000/api/auth/github/callback` |
| `FRONTEND_URL` | Public URL for redirects | `http://localhost:3000` |

---

## Data Persistence

- SQLite database at `MIO_DB_PATH` (default: `data/mio.db`)
- WAL mode enabled for concurrent read performance
- Uploads at `MIO_UPLOAD_DIR` (default: `data/uploads/`)
- Both paths should be set to locations OUTSIDE the repo checkout in production

---

## Auth Model

- GitHub OAuth gates: submit, edit, review approve/reject, upload
- `MEEPO_WRITERS` env var controls admin access (comma-separated emails)
- Session stored in HTTP-only cookies
- Public routes (browse, project detail, creator profile, click tracking) require no auth

---

## Known Limitations

1. **Demo data filtered out** — 14 seed projects have `is_demo = 1` and are excluded from public API. Only real submissions appear.
2. **No production deploy config** — ~~No Dockerfile, systemd unit, or nginx config yet.~~ Deploy config updated for Next.js + SQLite in `deploy/`.
3. **`next build` slow on HDD** — Build works but takes a long time on HDD-over-USB storage.
4. **Lockfile warning** — Next.js warns about multiple lockfiles in the monorepo. Can silence with `outputFileTracingRoot` in next.config.ts.
5. **Legacy `.env`** — The old `.env` (for the Vite server) still exists in the repo root. The Next.js app reads `.env` and `.env.local` automatically.
6. **No tests for new code** — API routes and domain logic have no test coverage yet.

---

## Migration from Legacy

The legacy stack is fully preserved in `_legacy/` for reference:
- `_legacy/src/` — Original React SPA (static data arrays, React Router, hooks)
- `_legacy/server/` — Original Node HTTP server + `db.json` + uploads
- `_legacy/vite.config.ts`, `_legacy/index.html`, etc. — Old build config

The `_legacy/` directory is excluded from TypeScript compilation and Tailwind scanning.
