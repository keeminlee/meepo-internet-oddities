import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, statSync, createReadStream, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = resolve(__dirname, "..", "dist");
const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost");
const IS_PROD = process.env.NODE_ENV === "production";
const BUNDLED_DB_PATH = resolve(__dirname, "db.seed.json");
const DATA_ROOT = process.env.DATA_ROOT?.trim() || (IS_PROD ? "/var/lib/mio" : __dirname);
const DB_PATH = process.env.DB_PATH?.trim() || resolve(DATA_ROOT, "db.json");
const UPLOADS_DIR = process.env.UPLOADS_DIR?.trim() || resolve(DATA_ROOT, "uploads");

// Ensure runtime data paths exist. In production, keep mutable state outside the git checkout.
mkdirSync(dirname(DB_PATH), { recursive: true });
if (!existsSync(DB_PATH)) writeFileSync(DB_PATH, readFileSync(BUNDLED_DB_PATH, "utf-8"));
if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });

// ── OAuth / Auth config ─────────────────────────────────

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "";
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";
const FRONTEND_URL = process.env.FRONTEND_URL || (IS_PROD ? "https://meepo.online" : `http://localhost:8080`);
const CALLBACK_URL = process.env.CALLBACK_URL || (IS_PROD ? "https://meepo.online/api/auth/github/callback" : `http://localhost:${PORT}/api/auth/github/callback`);

// Meepo writer allowlist — comma-separated verified emails
const MEEPO_WRITERS: string[] = (process.env.MEEPO_WRITERS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function isMeepoWriter(email: string): boolean {
  return MEEPO_WRITERS.includes(email.toLowerCase());
}

// ── MIME types for static file serving ──────────────────

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
  ".webm": "video/webm",
  ".mp4": "video/mp4",
  ".txt": "text/plain",
  ".map": "application/json",
};

// ── DB helpers ──────────────────────────────────────────

interface DBUser {
  id: string;
  github_id: number;
  handle: string | null;
  display_name: string;
  avatar_url: string;
  email: string;
  created_at: string;
}

interface DBSession {
  token: string;
  user_id: string;
  created_at: string;
}

interface DB {
  creators: any[];
  projects: any[];
  submissions: any[];
  users: DBUser[];
  sessions: DBSession[];
}

function readDB(): DB {
  return JSON.parse(readFileSync(DB_PATH, "utf-8"));
}

function writeDB(db: DB): void {
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// ── HTTP helpers ────────────────────────────────────────

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": FRONTEND_URL,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
  };
}

function json(res: any, data: unknown, status = 200): void {
  res.writeHead(status, {
    "Content-Type": "application/json",
    ...corsHeaders(),
  });
  res.end(JSON.stringify(data));
}

function notFound(res: any): void {
  json(res, { error: "Not found" }, 404);
}

// ── Multipart parser ────────────────────────────────────

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB

interface ParsedFile {
  fieldName: string;
  filename: string;
  contentType: string;
  data: Buffer;
}

function parseMultipart(req: any): Promise<{ files: ParsedFile[]; fields: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    const contentType = req.headers["content-type"] || "";
    const boundaryMatch = contentType.match(/boundary=(.+)/);
    if (!boundaryMatch) return reject(new Error("No multipart boundary"));
    const boundary = boundaryMatch[1];

    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_UPLOAD_SIZE + 10000) {
        req.destroy();
        reject(new Error("Upload too large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("error", reject);
    req.on("end", () => {
      const buf = Buffer.concat(chunks);
      const files: ParsedFile[] = [];
      const fields: Record<string, string> = {};

      const boundaryBuf = Buffer.from(`--${boundary}`);
      const parts: Buffer[] = [];
      let start = 0;

      // Split by boundary
      while (true) {
        const idx = buf.indexOf(boundaryBuf, start);
        if (idx === -1) break;
        if (start > 0) {
          // Strip trailing \r\n before boundary
          let end = idx;
          if (buf[end - 1] === 0x0a) end--;
          if (buf[end - 1] === 0x0d) end--;
          parts.push(buf.subarray(start, end));
        }
        start = idx + boundaryBuf.length;
        // Skip \r\n or -- after boundary
        if (buf[start] === 0x0d && buf[start + 1] === 0x0a) start += 2;
        else if (buf[start] === 0x2d && buf[start + 1] === 0x2d) break; // end
      }

      for (const part of parts) {
        const headerEnd = part.indexOf("\r\n\r\n");
        if (headerEnd === -1) continue;
        const headers = part.subarray(0, headerEnd).toString();
        const body = part.subarray(headerEnd + 4);

        const nameMatch = headers.match(/name="([^"]+)"/);
        const filenameMatch = headers.match(/filename="([^"]+)"/);
        const ctMatch = headers.match(/Content-Type:\s*(.+)/i);

        if (nameMatch && filenameMatch && ctMatch) {
          files.push({
            fieldName: nameMatch[1],
            filename: filenameMatch[1],
            contentType: ctMatch[1].trim(),
            data: body,
          });
        } else if (nameMatch) {
          fields[nameMatch[1]] = body.toString().trim();
        }
      }

      resolve({ files, fields });
    });
  });
}

function parseBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const MAX = 1_000_000; // 1MB limit
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX) {
        req.destroy();
        reject(new Error("Body too large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

// ── Cookie helpers ──────────────────────────────────────

function parseCookies(req: any): Record<string, string> {
  const header = req.headers?.cookie || "";
  const cookies: Record<string, string> = {};
  for (const pair of header.split(";")) {
    const [key, ...rest] = pair.trim().split("=");
    if (key) cookies[key] = decodeURIComponent(rest.join("="));
  }
  return cookies;
}

function setSessionCookie(res: any, token: string): void {
  const maxAge = 30 * 24 * 60 * 60; // 30 days
  const secure = IS_PROD ? "; Secure" : "";
  const sameSite = IS_PROD ? "; SameSite=Lax" : "; SameSite=Lax";
  res.setHeader(
    "Set-Cookie",
    `meepo_session=${token}; HttpOnly; Path=/; Max-Age=${maxAge}${secure}${sameSite}`
  );
}

function clearSessionCookie(res: any): void {
  const secure = IS_PROD ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `meepo_session=; HttpOnly; Path=/; Max-Age=0${secure}; SameSite=Lax`
  );
}

// ── Auth helpers ────────────────────────────────────────

function getUserFromSession(db: DB, req: any): DBUser | null {
  const cookies = parseCookies(req);
  const token = cookies.meepo_session;
  if (!token) return null;
  const session = db.sessions.find((s) => s.token === token);
  if (!session) return null;
  return db.users.find((u) => u.id === session.user_id) || null;
}

// ── Resolve project with creator ────────────────────────

function resolveProject(db: DB, project: any): any {
  // Check legacy creators table first, then fall back to users table
  let creator = db.creators.find((c: any) => c.id === project.creator_id);
  if (!creator) {
    const user = db.users.find((u) => u.id === project.creator_id);
    if (user) {
      creator = {
        id: user.id,
        handle: user.handle || "",
        display_name: user.display_name,
        avatar_url: user.avatar_url || "",
        bio: "",
        creative_thesis: "",
        links: {},
      };
    }
  }
  return { ...project, creator: creator || null };
}

// ── Router ──────────────────────────────────────────────

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const path = url.pathname;
  const method = req.method || "GET";

  // CORS preflight
  if (method === "OPTIONS") {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  // Health check — no DB access needed
  if (method === "GET" && path === "/api/health") {
    json(res, { status: "ok" });
    return;
  }

  // ── OAuth routes ────────────────────────────────────────

  // GET /api/auth/github — redirect to GitHub OAuth
  if (method === "GET" && path === "/api/auth/github") {
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: CALLBACK_URL,
      scope: "read:user user:email",
      prompt: "consent",
    });
    res.writeHead(302, { Location: `https://github.com/login/oauth/authorize?${params}` });
    res.end();
    return;
  }

  // GET /api/auth/github/callback — exchange code for token, create/find user
  if (method === "GET" && path === "/api/auth/github/callback") {
    const code = url.searchParams.get("code");
    if (!code) {
      res.writeHead(302, { Location: `${FRONTEND_URL}?auth_error=missing_code` });
      res.end();
      return;
    }

    try {
      // Exchange code for access token
      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: CALLBACK_URL,
        }),
      });
      const tokenData = await tokenRes.json() as any;
      if (!tokenData.access_token) {
        res.writeHead(302, { Location: `${FRONTEND_URL}?auth_error=token_exchange_failed` });
        res.end();
        return;
      }

      // Fetch GitHub user profile
      const userRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: "application/json",
          "User-Agent": "meepo-server",
        },
      });
      const ghUser = await userRes.json() as any;
      if (!ghUser.id) {
        res.writeHead(302, { Location: `${FRONTEND_URL}?auth_error=github_user_fetch_failed` });
        res.end();
        return;
      }

      // Fetch email if not public
      let email = ghUser.email || "";
      if (!email) {
        const emailRes = await fetch("https://api.github.com/user/emails", {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            Accept: "application/json",
            "User-Agent": "meepo-server",
          },
        });
        const emails = await emailRes.json() as any[];
        const primary = emails?.find((e: any) => e.primary && e.verified);
        if (primary) email = primary.email;
      }

      const db = readDB();

      // Create or find user
      let user = db.users.find((u) => u.github_id === ghUser.id);
      if (!user) {
        user = {
          id: `user-${randomUUID().slice(0, 8)}`,
          github_id: ghUser.id,
          handle: null,
          display_name: ghUser.name || ghUser.login,
          avatar_url: ghUser.avatar_url || "",
          email,
          created_at: new Date().toISOString(),
        };
        db.users.push(user);
      } else {
        // Update profile fields on each login
        user.display_name = ghUser.name || ghUser.login;
        user.avatar_url = ghUser.avatar_url || "";
        if (email) user.email = email;
      }

      // Create session
      const sessionToken = randomUUID();
      db.sessions.push({
        token: sessionToken,
        user_id: user.id,
        created_at: new Date().toISOString(),
      });
      writeDB(db);

      setSessionCookie(res, sessionToken);
      res.writeHead(302, { Location: FRONTEND_URL });
      res.end();
      return;
    } catch (err) {
      console.error("OAuth callback error:", err);
      res.writeHead(302, { Location: `${FRONTEND_URL}?auth_error=server_error` });
      res.end();
      return;
    }
  }

  // GET /api/auth/me — return current user
  if (method === "GET" && path === "/api/auth/me") {
    const db = readDB();
    const user = getUserFromSession(db, req);
    if (!user) {
      json(res, { authenticated: false });
      return;
    }
    json(res, { authenticated: true, user, is_meepo_writer: isMeepoWriter(user.email) });
    return;
  }

  // POST /api/auth/logout — clear session
  if (method === "POST" && path === "/api/auth/logout") {
    const db = readDB();
    const cookies = parseCookies(req);
    const token = cookies.meepo_session;
    if (token) {
      db.sessions = db.sessions.filter((s) => s.token !== token);
      writeDB(db);
    }
    clearSessionCookie(res);
    json(res, { ok: true });
    return;
  }

  // ── Upload routes ───────────────────────────────────────

  // POST /api/upload — upload a screenshot image
  if (method === "POST" && path === "/api/upload") {
    const db = readDB();
    const user = getUserFromSession(db, req);
    if (!user) {
      json(res, { error: "Authentication required" }, 401);
      return;
    }

    try {
      const { files } = await parseMultipart(req);
      const file = files.find((f) => f.fieldName === "screenshot");
      if (!file) {
        json(res, { error: "No screenshot file provided" }, 400);
        return;
      }

      const ext = ALLOWED_IMAGE_TYPES[file.contentType];
      if (!ext) {
        json(res, { error: "Invalid file type. Allowed: PNG, JPEG, WebP" }, 400);
        return;
      }

      if (file.data.length > MAX_UPLOAD_SIZE) {
        json(res, { error: "File too large. Maximum 5MB" }, 400);
        return;
      }

      const filename = `${randomUUID()}${ext}`;
      const filepath = resolve(UPLOADS_DIR, filename);
      writeFileSync(filepath, file.data);

      json(res, { filename }, 201);
      return;
    } catch (err: any) {
      if (err.message === "Upload too large") {
        json(res, { error: "File too large. Maximum 5MB" }, 400);
        return;
      }
      console.error("Upload error:", err);
      json(res, { error: "Upload failed" }, 500);
      return;
    }
  }

  // GET /uploads/:filename — serve uploaded images
  if (method === "GET" && path.startsWith("/uploads/")) {
    const filename = path.slice("/uploads/".length);
    // Sanitize: only allow safe filenames (uuid.ext pattern)
    if (!/^[a-f0-9-]+\.(png|jpg|webp)$/.test(filename)) {
      notFound(res);
      return;
    }
    const filepath = resolve(UPLOADS_DIR, filename);
    if (!filepath.startsWith(UPLOADS_DIR) || !existsSync(filepath)) {
      notFound(res);
      return;
    }
    const ext = extname(filepath);
    const mime = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime, ...corsHeaders() });
    createReadStream(filepath).pipe(res);
    return;
  }

  try {
    const db = readDB();

    // GET /api/projects
    if (method === "GET" && path === "/api/projects") {
      const approved = db.projects.filter((p: any) => p.approved && !p.is_demo);
      const tag = url.searchParams.get("tag");
      const status = url.searchParams.get("status");
      let filtered = approved;
      if (tag) filtered = filtered.filter((p: any) => p.tags.includes(tag));
      if (status) filtered = filtered.filter((p: any) => p.status === status);
      json(res, filtered.map((p: any) => resolveProject(db, p)));
      return;
    }

    // GET /api/projects/featured
    if (method === "GET" && path === "/api/projects/featured") {
      const featured = db.projects.filter((p: any) => p.approved && p.featured && !p.is_demo);
      json(res, featured.map((p: any) => resolveProject(db, p)));
      return;
    }

    // GET /api/projects/newest
    if (method === "GET" && path === "/api/projects/newest") {
      const count = Number(url.searchParams.get("count")) || 6;
      const newest = db.projects
        .filter((p: any) => p.approved && !p.is_demo)
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, count);
      json(res, newest.map((p: any) => resolveProject(db, p)));
      return;
    }

    // GET /api/projects/:slug
    const projectMatch = path.match(/^\/api\/projects\/([a-z0-9-]+)$/);
    if (method === "GET" && projectMatch) {
      const slug = projectMatch[1];
      const project = db.projects.find((p: any) => p.slug === slug && p.approved);
      if (!project) return notFound(res);
      json(res, resolveProject(db, project));
      return;
    }

    // POST /api/projects/:slug/click
    const clickMatch = path.match(/^\/api\/projects\/([a-z0-9-]+)\/click$/);
    if (method === "POST" && clickMatch) {
      const slug = clickMatch[1];
      const project = db.projects.find((p: any) => p.slug === slug);
      if (!project) return notFound(res);
      project.clicks_sent = (project.clicks_sent || 0) + 1;
      writeDB(db);
      json(res, { clicks_sent: project.clicks_sent, external_url: project.external_url });
      return;
    }

    // GET /api/creators
    if (method === "GET" && path === "/api/creators") {
      json(res, db.creators);
      return;
    }

    // GET /api/creators/:handle
    const creatorMatch = path.match(/^\/api\/creators\/([a-z0-9-]+)$/);
    if (method === "GET" && creatorMatch) {
      const handle = creatorMatch[1];
      const creator = db.creators.find((c: any) => c.handle === handle);
      if (!creator) return notFound(res);
      const projects = db.projects
        .filter((p: any) => p.creator_id === creator.id && p.approved)
        .map((p: any) => resolveProject(db, p));
      json(res, { ...creator, projects });
      return;
    }

    // POST /api/auth/handle — set handle for authenticated user
    if (method === "POST" && path === "/api/auth/handle") {
      const user = getUserFromSession(db, req);
      if (!user) {
        json(res, { error: "Authentication required" }, 401);
        return;
      }
      const body = await parseBody(req);
      const handle = (body.handle || "").trim().toLowerCase();

      // Validate format: lowercase alphanumeric + hyphens, 3-20 chars
      if (!/^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$/.test(handle)) {
        json(res, { error: "Handle must be 3-20 characters, lowercase letters, numbers, and hyphens only" }, 400);
        return;
      }

      // Check uniqueness
      const existing = db.users.find((u) => u.handle === handle && u.id !== user.id);
      if (existing) {
        json(res, { error: "Handle already taken" }, 409);
        return;
      }

      user.handle = handle;
      writeDB(db);
      json(res, { ok: true, user });
      return;
    }

    // PATCH /api/auth/profile — update profile fields for authenticated user
    if (method === "PATCH" && path === "/api/auth/profile") {
      const user = getUserFromSession(db, req);
      if (!user) {
        json(res, { error: "Authentication required" }, 401);
        return;
      }
      const body = await parseBody(req);
      const displayName = typeof body.display_name === "string" ? body.display_name.trim() : "";

      if (!displayName || displayName.length < 1 || displayName.length > 50) {
        json(res, { error: "Display name must be 1-50 characters" }, 400);
        return;
      }

      user.display_name = displayName;
      writeDB(db);
      json(res, { ok: true, user });
      return;
    }

    // POST /api/submit
    if (method === "POST" && path === "/api/submit") {
      // Auth guard
      const user = getUserFromSession(db, req);
      if (!user) {
        json(res, { error: "Authentication required" }, 401);
        return;
      }

      const body = await parseBody(req);

      // Validate required fields
      const name = (body.name || "").trim();
      const one_line_pitch = (body.one_line_pitch || "").trim();
      if (!name) {
        json(res, { error: "Missing required field: name" }, 400);
        return;
      }
      if (!one_line_pitch) {
        json(res, { error: "Missing required field: one_line_pitch" }, 400);
        return;
      }

      // Enforce pitch character limit
      if (one_line_pitch.length > 150) {
        json(res, { error: "One-line pitch must be 150 characters or fewer" }, 400);
        return;
      }

      // Validate URL + screenshot required
      const external_url = (body.external_url || "").trim();
      const screenshot_url = (body.screenshot_url || "").trim();
      if (!external_url) {
        json(res, { error: "URL is required" }, 400);
        return;
      }
      if (!screenshot_url) {
        json(res, { error: "Screenshot is required" }, 400);
        return;
      }

      // Sanitize tags
      let tags: string[] = Array.isArray(body.tags) ? body.tags.slice(0, 5) : [];

      // Enforce Meepo tag gating
      if (tags.includes("Meepo") && !isMeepoWriter(user.email)) {
        json(res, { error: "You are not authorized to use the Meepo tag" }, 403);
        return;
      }

      // Generate slug
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      // Check for duplicate slug
      if (db.projects.some((p: any) => p.slug === slug)) {
        json(res, { error: "A meep with a similar name already exists" }, 409);
        return;
      }

      const submission: any = {
        id: randomUUID(),
        creator_id: user.id,
        owner_user_id: user.id,
        slug,
        name,
        project_avatar_url: "",
        one_line_pitch,
        screenshot_url,
        external_url,
        tags,
        source_type: "both",
        status: "Live",
        clicks_sent: 0,
        about: "",
        why_i_made_this: (body.why_i_made_this || "").trim().slice(0, 1000),
        featured: false,
        approved: false, // requires manual approval via /review page
        created_at: new Date().toISOString().split("T")[0],
      };

      db.projects.push(submission);
      db.submissions.push({
        project_id: submission.id,
        user_id: user.id,
        submitted_at: new Date().toISOString(),
      });
      writeDB(db);

      json(res, { id: submission.id, slug, message: "Submitted for review" }, 201);
      return;
    }

    // ── Review queue routes (MEEPO_WRITERS only) ─────────

    // GET /api/review — list pending (unapproved, non-rejected) meeps
    if (method === "GET" && path === "/api/review") {
      const user = getUserFromSession(db, req);
      if (!user) {
        json(res, { error: "Authentication required" }, 401);
        return;
      }
      if (!isMeepoWriter(user.email)) {
        json(res, { error: "Forbidden" }, 403);
        return;
      }
      const pending = db.projects
        .filter((p: any) => !p.approved && !p.rejected)
        .map((p: any) => resolveProject(db, p));
      json(res, pending);
      return;
    }

    // POST /api/review/:slug/approve — approve a pending meep
    const approveMatch = path.match(/^\/api\/review\/([a-z0-9-]+)\/approve$/);
    if (method === "POST" && approveMatch) {
      const user = getUserFromSession(db, req);
      if (!user) {
        json(res, { error: "Authentication required" }, 401);
        return;
      }
      if (!isMeepoWriter(user.email)) {
        json(res, { error: "Forbidden" }, 403);
        return;
      }
      const slug = approveMatch[1];
      const project = db.projects.find((p: any) => p.slug === slug);
      if (!project) return notFound(res);
      project.approved = true;
      writeDB(db);
      json(res, resolveProject(db, project));
      return;
    }

    // POST /api/review/:slug/reject — soft-delete a pending meep
    const rejectMatch = path.match(/^\/api\/review\/([a-z0-9-]+)\/reject$/);
    if (method === "POST" && rejectMatch) {
      const user = getUserFromSession(db, req);
      if (!user) {
        json(res, { error: "Authentication required" }, 401);
        return;
      }
      if (!isMeepoWriter(user.email)) {
        json(res, { error: "Forbidden" }, 403);
        return;
      }
      const slug = rejectMatch[1];
      const project = db.projects.find((p: any) => p.slug === slug);
      if (!project) return notFound(res);
      const body = await parseBody(req);
      project.rejected = true;
      project.rejection_reason = (body.reason || "").trim().slice(0, 500) || undefined;
      project.rejected_at = new Date().toISOString();
      project.rejected_by = user.id;
      writeDB(db);
      json(res, { ok: true, slug });
      return;
    }

    // GET /api/my-projects — return all meeps owned by authenticated user
    if (method === "GET" && path === "/api/my-projects") {
      const user = getUserFromSession(db, req);
      if (!user) {
        json(res, { error: "Authentication required" }, 401);
        return;
      }
      const myProjects = db.projects
        .filter((p: any) => p.owner_user_id === user.id)
        .map((p: any) => resolveProject(db, p));
      json(res, myProjects);
      return;
    }

    // PATCH /api/projects/:slug — edit a meep (owner only)
    const patchMatch = path.match(/^\/api\/projects\/([a-z0-9-]+)$/);
    if (method === "PATCH" && patchMatch) {
      const user = getUserFromSession(db, req);
      if (!user) {
        json(res, { error: "Authentication required" }, 401);
        return;
      }

      const slug = patchMatch[1];
      const project = db.projects.find((p: any) => p.slug === slug);
      if (!project) return notFound(res);

      // Ownership check
      if (project.owner_user_id !== user.id) {
        json(res, { error: "You can only edit your own meeps" }, 403);
        return;
      }

      const body = await parseBody(req);

      // Update allowed fields
      if (body.name !== undefined) {
        const name = body.name.trim();
        if (!name) {
          json(res, { error: "Name cannot be empty" }, 400);
          return;
        }
        project.name = name;
      }

      if (body.one_line_pitch !== undefined) {
        const pitch = body.one_line_pitch.trim();
        if (!pitch) {
          json(res, { error: "Pitch cannot be empty" }, 400);
          return;
        }
        if (pitch.length > 150) {
          json(res, { error: "One-line pitch must be 150 characters or fewer" }, 400);
          return;
        }
        project.one_line_pitch = pitch;
      }

      if (body.external_url !== undefined) {
        project.external_url = (body.external_url || "").trim();
      }

      if (body.screenshot_url !== undefined) {
        project.screenshot_url = (body.screenshot_url || "").trim();
      }

      if (body.why_i_made_this !== undefined) {
        project.why_i_made_this = (body.why_i_made_this || "").trim().slice(0, 1000);
      }

      if (body.tags !== undefined) {
        const tags: string[] = Array.isArray(body.tags) ? body.tags.slice(0, 5) : [];
        if (tags.includes("Meepo") && !isMeepoWriter(user.email)) {
          json(res, { error: "You are not authorized to use the Meepo tag" }, 403);
          return;
        }
        project.tags = tags;
      }

      // Update source_type based on current proof state
      const hasUrl = !!project.external_url;
      const hasScreenshot = !!project.screenshot_url;
      if (!hasUrl) {
        json(res, { error: "URL is required" }, 400);
        return;
      }
      if (!hasScreenshot) {
        json(res, { error: "Screenshot is required" }, 400);
        return;
      }
      project.source_type = "both";
      project.updated_at = new Date().toISOString();

      // If the meep was rejected, reset rejection fields and re-queue for review
      if (project.rejected) {
        project.rejected = false;
        project.rejection_reason = "";
        project.rejected_at = "";
        project.rejected_by = "";
        project.approved = false;
      }

      writeDB(db);
      json(res, resolveProject(db, project));
      return;
    }

    // ── Production static file serving ────────────────────
    if (IS_PROD && !path.startsWith("/api/")) {
      const filePath = resolve(DIST_DIR, "." + path);
      // Path traversal guard
      if (filePath.startsWith(DIST_DIR) && existsSync(filePath) && statSync(filePath).isFile()) {
        const ext = extname(filePath);
        const mime = MIME_TYPES[ext] || "application/octet-stream";
        res.writeHead(200, { "Content-Type": mime });
        createReadStream(filePath).pipe(res);
        return;
      }
      // SPA fallback: serve index.html for all non-file, non-API requests
      const indexPath = resolve(DIST_DIR, "index.html");
      if (existsSync(indexPath)) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        createReadStream(indexPath).pipe(res);
        return;
      }
    }

    notFound(res);
  } catch (err: any) {
    console.error("Server error:", err);
    json(res, { error: "Internal server error" }, 500);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`meepo server running on http://${HOST}:${PORT}${IS_PROD ? " (production)" : ""}`);
});
