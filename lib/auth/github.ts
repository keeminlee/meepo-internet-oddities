// GitHub OAuth helpers. The route handlers in app/api/auth/github/* orchestrate
// the full flow: redirect with state, callback exchange, user + session creation.

export interface GithubOAuthConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  frontendUrl: string;
  sessionSecret: string;
}

export function getOAuthConfig(): GithubOAuthConfig {
  return {
    clientId: process.env.GITHUB_CLIENT_ID ?? "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    callbackUrl:
      process.env.GITHUB_CALLBACK_URL?.trim() ||
      (process.env.NODE_ENV === "production"
        ? "https://meepo.online/api/auth/github/callback"
        : "http://localhost:3000/api/auth/github/callback"),
    frontendUrl:
      process.env.FRONTEND_URL?.trim() ||
      (process.env.NODE_ENV === "production" ? "https://meepo.online" : "http://localhost:3000"),
    sessionSecret: process.env.SESSION_SECRET ?? "dev-secret-change-me",
  };
}

export function buildAuthorizeUrl(state: string, cfg = getOAuthConfig()): string {
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.callbackUrl,
    scope: "read:user user:email",
    state,
    prompt: "consent",
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export interface GithubTokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
}

export async function exchangeCodeForToken(
  code: string,
  cfg = getOAuthConfig(),
): Promise<string | null> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      code,
      redirect_uri: cfg.callbackUrl,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as GithubTokenResponse;
  return body.access_token ?? null;
}

export interface GithubUserProfile {
  github_id: number;
  display_name: string;
  avatar_url: string;
  email: string;
}

export async function fetchGithubProfile(
  accessToken: string,
): Promise<GithubUserProfile | null> {
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "User-Agent": "meepo-server",
    },
  });
  const user = (await userRes.json().catch(() => null)) as
    | { id?: number; name?: string; login?: string; avatar_url?: string; email?: string | null }
    | null;
  if (!user?.id) return null;

  let email = (user.email ?? "").trim();
  if (!email) {
    const emailsRes = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "User-Agent": "meepo-server",
      },
    });
    const emails = (await emailsRes.json().catch(() => [])) as Array<{
      email: string;
      primary: boolean;
      verified: boolean;
    }>;
    const primary = emails.find((e) => e.primary && e.verified);
    if (primary) email = primary.email;
  }

  return {
    github_id: user.id,
    display_name: user.name ?? user.login ?? "",
    avatar_url: user.avatar_url ?? "",
    email,
  };
}
