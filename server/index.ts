import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, statSync, createReadStream } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, "db.json");
const DIST_DIR = resolve(__dirname, "..", "dist");
const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost");
const IS_PROD = process.env.NODE_ENV === "production";

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

interface DB {
  creators: any[];
  projects: any[];
  submissions: any[];
}

function readDB(): DB {
  return JSON.parse(readFileSync(DB_PATH, "utf-8"));
}

function writeDB(db: DB): void {
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// ── HTTP helpers ────────────────────────────────────────

function json(res: any, data: unknown, status = 200): void {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

function notFound(res: any): void {
  json(res, { error: "Not found" }, 404);
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

// ── Resolve project with creator ────────────────────────

function resolveProject(db: DB, project: any): any {
  const creator = db.creators.find((c: any) => c.id === project.creator_id);
  return { ...project, creator: creator || null };
}

// ── Router ──────────────────────────────────────────────

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const path = url.pathname;
  const method = req.method || "GET";

  // CORS preflight
  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  // Health check — no DB access needed
  if (method === "GET" && path === "/api/health") {
    json(res, { status: "ok" });
    return;
  }

  try {
    const db = readDB();

    // GET /api/projects
    if (method === "GET" && path === "/api/projects") {
      const approved = db.projects.filter((p: any) => p.approved);
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
      const featured = db.projects.filter((p: any) => p.approved && p.featured);
      json(res, featured.map((p: any) => resolveProject(db, p)));
      return;
    }

    // GET /api/projects/newest
    if (method === "GET" && path === "/api/projects/newest") {
      const count = Number(url.searchParams.get("count")) || 6;
      const newest = db.projects
        .filter((p: any) => p.approved)
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

    // POST /api/submit
    if (method === "POST" && path === "/api/submit") {
      const body = await parseBody(req);

      // Validate required fields
      const required = ["name", "external_url", "one_line_pitch", "built_with", "creator_name"];
      const missing = required.filter((f) => !body[f]?.trim());
      if (missing.length) {
        json(res, { error: `Missing required fields: ${missing.join(", ")}` }, 400);
        return;
      }

      // Sanitize: only allow expected fields through
      const slug = body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      // Check for duplicate slug
      if (db.projects.some((p: any) => p.slug === slug)) {
        json(res, { error: "A project with a similar name already exists" }, 409);
        return;
      }

      // Create or find creator
      let creator = db.creators.find(
        (c: any) => c.handle === (body.creator_handle || "").toLowerCase().replace(/[^a-z0-9]/g, "")
      );
      if (!creator && body.creator_handle) {
        creator = {
          id: `creator-${randomUUID().slice(0, 8)}`,
          handle: body.creator_handle.toLowerCase().replace(/[^a-z0-9]/g, ""),
          display_name: body.creator_name,
          avatar_url: "",
          bio: body.creator_bio || "",
          creative_thesis: body.creator_thesis || "",
          links: {},
        };
        db.creators.push(creator);
      }

      const submission: any = {
        id: randomUUID(),
        creator_id: creator?.id || "",
        slug,
        name: body.name.trim(),
        project_avatar_url: "",
        one_line_pitch: body.one_line_pitch.trim(),
        screenshot_url: body.screenshot_url || "",
        external_url: body.external_url.trim(),
        built_with: body.built_with,
        tags: Array.isArray(body.tags) ? body.tags.slice(0, 5) : [],
        status: body.status || "Live",
        clicks_sent: 0,
        about: body.about || "",
        why_i_made_this: body.why_i_made_this || "",
        featured: false,
        approved: false, // requires manual approval
        created_at: new Date().toISOString().split("T")[0],
      };

      db.projects.push(submission);
      db.submissions.push({
        project_id: submission.id,
        contact_email: body.contact_email || "",
        submitted_at: new Date().toISOString(),
      });
      writeDB(db);

      json(res, { id: submission.id, slug, message: "Submitted for review" }, 201);
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
