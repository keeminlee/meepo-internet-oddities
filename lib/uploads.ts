// Durable uploads path. MIO_UPLOAD_DIR points at an absolute location OUTSIDE
// the repo checkout (e.g. /var/lib/mio/uploads or ~/.mio/uploads) so a deploy
// or `git checkout` never wipes user-submitted files. Falls back to
// `<cwd>/data/uploads` for local dev; that directory is gitignored.

import { resolve } from "node:path";

export function uploadsDir(): string {
  const env = process.env.MIO_UPLOAD_DIR?.trim();
  if (env) return resolve(env);
  return resolve(process.cwd(), "data", "uploads");
}

export const ALLOWED_UPLOAD_TYPES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

// Safe filenames match the `uuid.ext` shape the upload handler writes.
export const SAFE_UPLOAD_FILENAME = /^[a-f0-9-]+\.(png|jpg|webp)$/;

export const UPLOAD_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
};
