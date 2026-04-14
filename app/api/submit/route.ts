import type { NextRequest } from "next/server";

import { created, fail, forbidden, unauthorized } from "@/lib/api/response";
import { currentUser } from "@/lib/auth/session";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { createSubmission } from "@/lib/domain/submissions";
import { isMeepoWriter } from "@/lib/domain/users";

export async function POST(req: NextRequest) {
  ensureBootstrapped();
  const user = currentUser(req);
  if (!user) return unauthorized();

  const body = (await req.json().catch(() => null)) as
    | {
        name?: string;
        one_line_pitch?: string;
        external_url?: string;
        repo_url?: string;
        screenshot_url?: string;
        tags?: string[];
        why_i_made_this?: string;
      }
    | null;
  if (!body) return fail("Invalid JSON", 400);

  const result = createSubmission(
    user.id,
    {
      name: body.name ?? "",
      one_line_pitch: body.one_line_pitch ?? "",
      external_url: body.external_url ?? "",
      repo_url: body.repo_url ?? "",
      screenshot_url: body.screenshot_url ?? "",
      tags: body.tags,
      why_i_made_this: body.why_i_made_this,
    },
    { isMeepoWriter: isMeepoWriter(user.email) },
  );
  if (result.ok === false) {
    if (result.status === 403) return forbidden(errorMessage(result.error));
    return fail(errorMessage(result.error), result.status);
  }
  return created({
    id: result.id,
    slug: result.slug,
    auto_approved: result.auto_approved,
    message: result.auto_approved
      ? "Your project is live"
      : "Submitted for review",
  });
}

function errorMessage(code: string): string {
  switch (code) {
    case "name_required":
      return "Missing required field: name";
    case "pitch_required":
      return "Missing required field: one_line_pitch";
    case "pitch_too_long":
      return "One-line pitch must be 150 characters or fewer";
    case "url_required":
      return "URL is required";
    case "screenshot_required":
      return "Screenshot is required";
    case "meepo_tag_forbidden":
      return "You are not authorized to use the Meepo tag";
    case "slug_conflict":
      return "A meep with a similar name already exists";
    default:
      return code;
  }
}
