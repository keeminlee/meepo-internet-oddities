import { NextResponse } from "next/server";

import { buildGoogleAuthorizeUrl, getGoogleOAuthConfig } from "@/lib/auth/google";
import { OAUTH_STATE_COOKIE, issueState, stateCookieMaxAge } from "@/lib/auth/oauth-state";

export function GET() {
  const cfg = getGoogleOAuthConfig();
  if (!cfg.clientId) {
    return NextResponse.json(
      { error: "Google OAuth not configured (missing GOOGLE_CLIENT_ID)" },
      { status: 500 },
    );
  }
  const state = issueState(cfg.sessionSecret);
  const res = NextResponse.redirect(buildGoogleAuthorizeUrl(state, cfg));
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
