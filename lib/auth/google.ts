// Google OAuth helpers. Mirrors lib/auth/github.ts. The route handlers in
// app/api/auth/google/* orchestrate the full flow: redirect with state,
// callback exchange, user + session creation.

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  frontendUrl: string;
  sessionSecret: string;
}

export function getGoogleOAuthConfig(): GoogleOAuthConfig {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL?.trim() ||
      (process.env.NODE_ENV === "production"
        ? "https://meepo.online/api/auth/google/callback"
        : "http://localhost:3001/api/auth/google/callback"),
    frontendUrl:
      process.env.FRONTEND_URL?.trim() ||
      (process.env.NODE_ENV === "production" ? "https://meepo.online" : "http://localhost:3001"),
    sessionSecret: process.env.SESSION_SECRET ?? "dev-secret-change-me",
  };
}

export function buildGoogleAuthorizeUrl(state: string, cfg = getGoogleOAuthConfig()): string {
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.callbackUrl,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

interface GoogleTokenResponse {
  access_token?: string;
  id_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
}

export async function exchangeGoogleCodeForToken(
  code: string,
  cfg = getGoogleOAuthConfig(),
): Promise<string | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      code,
      redirect_uri: cfg.callbackUrl,
      grant_type: "authorization_code",
    }).toString(),
  });
  const body = (await res.json().catch(() => ({}))) as GoogleTokenResponse;
  return body.access_token ?? null;
}

export interface GoogleUserProfile {
  google_id: string;
  display_name: string;
  avatar_url: string;
  email: string;
}

export async function fetchGoogleProfile(
  accessToken: string,
): Promise<GoogleUserProfile | null> {
  // OIDC userinfo endpoint. Returns { sub, name, picture, email, email_verified, ... }
  const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  const user = (await res.json().catch(() => null)) as
    | { sub?: string; name?: string; picture?: string; email?: string; email_verified?: boolean }
    | null;
  if (!user?.sub) return null;

  // Only accept verified emails — mirrors the github flow's primary+verified filter.
  const email = user.email_verified ? (user.email ?? "") : "";

  return {
    google_id: user.sub,
    display_name: user.name ?? email.split("@")[0] ?? "",
    avatar_url: user.picture ?? "",
    email,
  };
}
