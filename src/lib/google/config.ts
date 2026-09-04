/** OAuth Google Sheets — SyncCRM */

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

export function googleClientId() {
  return String(process.env.GOOGLE_CLIENT_ID || "").trim();
}

export function googleClientSecret() {
  return String(process.env.GOOGLE_CLIENT_SECRET || "").trim();
}

/** URL pública do app no Vercel, sem barra final */
export function appBaseUrl() {
  const explicit = String(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "").trim();
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  return "http://localhost:9002";
}

export function googleRedirectUri() {
  const fixed = String(process.env.GOOGLE_REDIRECT_URI || "").trim();
  if (fixed) return fixed;
  return `${appBaseUrl()}/api/google/callback`;
}

export function googleOAuthConfigured() {
  return !!(googleClientId() && googleClientSecret());
}

export const COOKIE_ACCESS = "synccrm_g_access";
export const COOKIE_REFRESH = "synccrm_g_refresh";
export const COOKIE_EMAIL = "synccrm_g_email";
