# CURRENT_STATE.md — Meepo Internet Oddities

> **Last verified:** 2026-04-12, from code on `main` at commit `6417991`

---

## Product summary

Meepo is a creator platform for "authored software" — a curated directory of weird, personal, AI-built web artifacts with visible maker identities. The frontend is a React SPA (Vite + React 18 + Tailwind + shadcn/ui). The backend is a zero-dependency Node HTTP server reading/writing a flat JSON file (`server/db.json`). Brand: "Strange minds behind strange software."

---

## Currently functional

### Backend API (`server/index.ts`, port 3001)

All endpoints verified from code:

| Method | Path | What it does |
|--------|------|-------------|
| GET | `/api/projects` | List approved projects, optional `?tag=` and `?status=` filters |
| GET | `/api/projects/featured` | Approved + featured projects |
| GET | `/api/projects/newest?count=N` | Approved projects sorted by `created_at` desc, default 6 |
| GET | `/api/projects/:slug` | Single approved project with resolved creator |
| POST | `/api/projects/:slug/click` | Increment `clicks_sent`, persist to db.json, return count + external_url |
| GET | `/api/creators` | All creators |
| GET | `/api/creators/:handle` | Single creator + their approved projects |
| POST | `/api/submit` | Create project submission (approved=false), auto-create creator if new, persist to db.json |
| OPTIONS | `*` | CORS preflight (Access-Control-Allow-Origin: *) |

- 1MB body limit on POST
- Slug generation from project name (lowercase, alphanumeric + hyphens)
- Duplicate slug check returns 409
- Required field validation on submit: `name`, `external_url`, `one_line_pitch`, `built_with`, `creator_name`
- Submissions land with `approved: false` — manual approval gate exists by design

### Data layer (`server/db.json`)

- **16 creators** (15 seed + 1 real submission from "Keemin")
- **16 projects** (15 seed + 1 real submission, unapproved)
- **1 submission record** (the Keemin submission with contact email and timestamp)
- Schema per project: `id`, `creator_id`, `slug`, `name`, `project_avatar_url`, `one_line_pitch`, `screenshot_url`, `external_url`, `built_with`, `tags[]`, `status`, `clicks_sent`, `about`, `why_i_made_this`, `featured`, `approved`, `created_at`
- Schema per creator: `id`, `handle`, `display_name`, `avatar_url`, `bio`, `creative_thesis`, `links{}`
- All seed projects are `approved: true`. The one real submission is `approved: false`.

### Frontend — Homepage (`src/pages/Index.tsx`)

- Hero section with brand copy and CTA buttons
- Tag-based filtering ("Discover by vibe") across 11 tag categories
- Three project grid sections: Featured transmissions, Fresh arrivals, Needs first believers (Seeking Users + Seeking Collaborator)
- Sticky nav header with "Post your project" button
- **Data source: static `src/data/projects.ts`** — NOT the API

### Frontend — Project Detail (`src/pages/ProjectDetail.tsx`)

- Full project page: screenshot, status badge, "built with" badge, click count display, name, pitch, maker identity block, tags, "Visit project" external link, "Artifact note" section, "Why I made this" maker note, "Why it's cool" section
- **Data source: static `src/data/projects.ts`** — NOT the API
- Route: `/project/:slug`

### Frontend — Components

- `ProjectCard` — card with screenshot, maker-first identity, status/built-with badges, tags, click count
- `BuiltWithBadge`, `StatusBadge`, `TagBadge`, `TagFilter`, `NavLink` — UI atoms
- Full shadcn/ui component library installed (`src/components/ui/`)

---

## Partially functional / constrained

### Submit Dialog (`src/components/SubmitDialog.tsx`)

- **UI is complete**: form fields for name, URL, pitch, screenshot URL, maker name, email, built-with selector, status selector, tag picker (max 5 implied by backend), "Why I made this" textarea, ownership confirmation checkbox
- **Does NOT call the API.** `handleSubmit` shows a toast (`"Project submitted! We'll review it soon. 🎉"`) and closes the dialog. No fetch to `POST /api/submit`. The `useSubmitProject()` hook exists in `src/hooks/use-api.ts` but is not imported or used.
- The backend submission endpoint works (proven by the Keemin submission in db.json, likely submitted via direct API call), but the frontend form is cosmetic.

### API hooks (`src/hooks/use-api.ts`)

- Complete React Query hooks exist for all API endpoints: `useProjects`, `useFeaturedProjects`, `useNewestProjects`, `useProject`, `useCreators`, `useCreator`, `useTrackClick`, `useSubmitProject`
- **None of these hooks are imported by any page or component.** The frontend is entirely driven by static TypeScript data arrays.
- The hooks are correctly typed against `ProjectWithCreator` and `Creator` from `src/types/index.ts`.

### Dual data model

- `src/data/projects.ts` — 15 static projects with a **different schema** than the API (e.g., `url` vs `external_url`, `pitch` vs `one_line_pitch`, `makerName` vs `creator.display_name`, `builtWith` vs `built_with`, `clicksSent` vs `clicks_sent`, `whyMade` vs `why_i_made_this`)
- `src/data/creators.ts` — 15 static creators matching the db.json seed data
- `src/types/index.ts` — defines `Project`, `Creator`, `ProjectWithCreator` using the **API schema** (snake_case), not the static data schema
- `ProjectCard` imports the `Project` type from `@/data/projects` (the static shape), not from `@/types` (the API shape)
- This means switching to API-driven data would require either adapting the components or mapping the API response

### Click tracking

- Backend `POST /api/projects/:slug/click` works and persists
- `useTrackClick()` hook exists but is not wired to any UI element
- The "Visit project" button on ProjectDetail does NOT track clicks — it's a plain `<a>` tag
- Click counts displayed on cards/detail come from static data, not live API values

---

## Not yet functional

### Creator profile pages

- `src/pages/CreatorProfile.tsx` exists with full layout (header, bio, creative thesis, links, project grid)
- **No route registered in `App.tsx`** — the page is unreachable. App.tsx only defines `/`, `/project/:slug`, and `*` (404).
- The page imports `getCreatorByHandle` from `@/data/creators` and `getAllProjects` from `@/data/projects` — static data

### Vite dev proxy

- Root plan noted `/api` proxy to backend, but **vite.config.ts has no proxy configuration**
- In development, the frontend (port 8080) cannot reach the backend (port 3001) via relative `/api` paths
- This is currently irrelevant since no page actually calls the API, but would need to be added before the API hooks can work in dev

### Production build / deployment

- No production configuration exists (no deploy scripts, no systemd units, no nginx config, no env files)
- No `vite.config.ts` proxy for production either — prod needs a reverse proxy (nginx) to unify frontend static files and backend API under one domain
- `npm run build` (Vite build) should work to produce `dist/` but has not been verified in this audit

### Tests

- Only one placeholder test: `src/test/example.test.ts` — `expect(true).toBe(true)`
- Vitest configured with jsdom environment, `@/` alias, and a setup file

### OG / social metadata

- `index.html` has OpenGraph and Twitter Card tags but **images point to `lovable.dev`** (the scaffold generator), not Meepo-specific assets
- `og:title` and `meta description` are correctly branded as Meepo

---

## Local vs production state

| Aspect | Local | Production |
|--------|-------|------------|
| Frontend | `npm run dev` → Vite dev server on port 8080 | Not deployed |
| Backend | `node --experimental-strip-types server/index.ts` → port 3001 | Not deployed |
| Database | `server/db.json` flat file (16 creators, 16 projects, 1 submission) | N/A |
| Domain | localhost | `meepo.online` registered (referenced in constants.ts) |
| Build | `npm run build` → `dist/` (untested) | No build pipeline |
| HTTPS | N/A | Not configured |
| Process management | Manual | No systemd unit |
| Reverse proxy | None (no Vite proxy either) | No nginx config |

---

## Deployment status

**Not deployed.** No deployment artifacts exist in this repo. The domain `meepo.online` is referenced in `src/lib/constants.ts` but there is no infrastructure configuration. The target EC2 instance runs meepo-bot (Starstory) — MIO would coexist with process isolation.

---

## Known risks / unclear areas

1. **Dual data model divergence** — The static frontend data (`src/data/projects.ts`) and the API data (`server/db.json`) have different schemas and could drift. When switching to API-driven rendering, a schema mapping or migration is needed.
2. **Submit form is non-functional** — Users see a success toast but nothing is actually submitted from the UI. The backend endpoint works, so this is a frontend wiring issue only.
3. **No Vite proxy** — Switching to API-driven data in dev requires adding a proxy config to `vite.config.ts`.
4. **CORS is wide open** — `Access-Control-Allow-Origin: *` in the backend. Fine for dev, needs tightening for production.
5. **db.json concurrency** — The backend reads and writes the entire JSON file on every request with no locking. Concurrent writes could lose data. Acceptable at current scale but worth noting.
6. **OG images are Lovable defaults** — Social sharing cards show Lovable branding, not Meepo.
7. **No auth on admin actions** — There is no admin interface or auth. Project approval requires editing db.json directly.
8. **package.json name** — Still `vite_react_shadcn_ts` (the scaffold name), not `meepo-internet-oddities`.
9. **CreatorProfile is orphaned** — The page component exists but has no route, making creator pages unreachable.
10. **Node v25 `--experimental-strip-types` dependency** — Server runs .ts directly without transpilation, which requires Node 25+ with the experimental flag.
