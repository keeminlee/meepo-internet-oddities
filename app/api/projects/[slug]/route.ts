import type { NextRequest } from "next/server";

import { fail, forbidden, notFound, ok, unauthorized } from "@/lib/api/response";
import { currentUser } from "@/lib/auth/session";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { getProjectBySlug, updateProject } from "@/lib/domain/projects";
import { isMeepoWriter } from "@/lib/domain/users";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  ensureBootstrapped();
  const { slug } = await ctx.params;
  const project = getProjectBySlug(slug);
  return project ? ok(project) : notFound();
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  ensureBootstrapped();
  const user = currentUser(req);
  if (!user) return unauthorized();
  const { slug } = await ctx.params;
  const body = (await req.json().catch(() => null)) as
    | {
        name?: string;
        one_line_pitch?: string;
        external_url?: string;
        repo_url?: string;
        screenshot_url?: string;
        why_i_made_this?: string;
        tags?: string[];
        project_status?: string;
      }
    | null;
  if (!body) return fail("Invalid JSON", 400);
  const result = updateProject(
    slug,
    user.id,
    {
      name: body.name,
      one_line_pitch: body.one_line_pitch,
      external_url: body.external_url,
      repo_url: body.repo_url,
      screenshot_url: body.screenshot_url,
      why_i_made_this: body.why_i_made_this,
      tags: body.tags,
      project_status: body.project_status,
    },
    { isMeepoWriter: isMeepoWriter(user.email) },
  );
  if (result.ok === false) {
    if (result.status === 404) return notFound();
    if (result.status === 403) return forbidden(result.error);
    return fail(result.error, result.status);
  }
  return ok(result.project);
}
