import { NextResponse } from "next/server";

import { buildAuthorizeUrl, getOAuthConfig } from "@/lib/auth/github";
import { OAUTH_STATE_COOKIE, issueState, stateCookieMaxAge } from "@/lib/auth/oauth-state";

export function GET() {
  const cfg = getOAuthConfig();
  if (!cfg.clientId) {
    return NextResponse.json(
      { error: "GitHub OAuth not configured (missing GITHUB_CLIENT_ID)" },
      { status: 500 },
    );
  }
  const state = issueState(cfg.sessionSecret);
  const res = NextResponse.redirect(buildAuthorizeUrl(state, cfg));
  res.cookies.set({
    name: OAUTH_STATE_COOKIE,
    value: state,
    httpOnly: true,
    path: "/",
    maxAge: stateCookieMaxAge(),
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
