import {
  COOKIE_ACCESS,
  COOKIE_EMAIL,
  COOKIE_REFRESH,
  GOOGLE_SCOPES,
  googleClientId,
  googleClientSecret,
  googleRedirectUri,
} from "./config";

export type GoogleTokens = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
};

export function buildAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: googleClientId(),
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: GOOGLE_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCode(code: string): Promise<GoogleTokens> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: googleClientId(),
      client_secret: googleClientSecret(),
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error_description || json.error || "Falha ao trocar code");
  }
  return json as GoogleTokens;
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: googleClientId(),
      client_secret: googleClientSecret(),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error_description || json.error || "Falha ao renovar token");
  }
  return json as GoogleTokens;
}

export async function fetchUserEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const j = await res.json();
    return j.email || null;
  } catch {
    return null;
  }
}

/** Cookie helpers for Route Handlers */
export function tokenCookiesSet(
  tokens: GoogleTokens,
  email?: string | null
): { name: string; value: string; options: Record<string, unknown> }[] {
  const secure = process.env.NODE_ENV === "production";
  const base = {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
  };
  const out: { name: string; value: string; options: Record<string, unknown> }[] = [
    {
      name: COOKIE_ACCESS,
      value: tokens.access_token,
      options: { ...base, maxAge: tokens.expires_in || 3500 },
    },
  ];
  if (tokens.refresh_token) {
    out.push({
      name: COOKIE_REFRESH,
      value: tokens.refresh_token,
      options: { ...base, maxAge: 60 * 60 * 24 * 180 },
    });
  }
  if (email) {
    out.push({
      name: COOKIE_EMAIL,
      value: email,
      options: { ...base, httpOnly: false, maxAge: 60 * 60 * 24 * 180 },
    });
  }
  return out;
}

export function tokenCookiesClear(): { name: string; options: Record<string, unknown> }[] {
  const base = { path: "/", maxAge: 0 };
  return [
    { name: COOKIE_ACCESS, options: base },
    { name: COOKIE_REFRESH, options: base },
    { name: COOKIE_EMAIL, options: { ...base, httpOnly: false } },
  ];
}
