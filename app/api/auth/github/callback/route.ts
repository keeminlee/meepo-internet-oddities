import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { setSessionCookie } from "@/lib/auth/session";
import { exchangeCodeForToken, fetchGithubProfile, getOAuthConfig } from "@/lib/auth/github";
import { OAUTH_STATE_COOKIE, verifyState } from "@/lib/auth/oauth-state";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { createSession } from "@/lib/domain/sessions";
import { findOrCreateFromGithub } from "@/lib/domain/users";

export async function GET(req: NextRequest) {
  ensureBootstrapped();
  const cfg = getOAuthConfig();
  const code = req.nextUrl.searchParams.get("code") ?? "";
  const state = req.nextUrl.searchParams.get("state") ?? "";
  const cookieState = req.cookies.get(OAUTH_STATE_COOKIE)?.value ?? "";

  if (!code) return redirectWithError(cfg.frontendUrl, "missing_code");
  if (!verifyState(state, cookieState, cfg.sessionSecret)) {
    return redirectWithError(cfg.frontendUrl, "state_mismatch");
  }

  const token = await exchangeCodeForToken(code, cfg);
  if (!token) return redirectWithError(cfg.frontendUrl, "token_exchange_failed");

  const profile = await fetchGithubProfile(token);
  if (!profile) return redirectWithError(cfg.frontendUrl, "github_user_fetch_failed");

  const user = findOrCreateFromGithub(profile);
  const sessionToken = createSession(user.id);

  const res = NextResponse.redirect(cfg.frontendUrl);
  setSessionCookie(res, sessionToken);
  res.cookies.set({
    name: OAUTH_STATE_COOKIE,
    value: "",
    httpOnly: true,
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

function redirectWithError(frontend: string, code: string): NextResponse {
  const url = new URL(frontend);
  url.searchParams.set("auth_error", code);
  return NextResponse.redirect(url.toString());
}
