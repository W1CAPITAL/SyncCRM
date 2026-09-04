import { NextRequest, NextResponse } from "next/server";
import { appBaseUrl } from "@/lib/google/config";
import { exchangeCode, fetchUserEmail, tokenCookiesSet } from "@/lib/google/oauth";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const err = url.searchParams.get("error");
  const state = url.searchParams.get("state");
  const expected = req.cookies.get("synccrm_oauth_state")?.value;

  const base = appBaseUrl();
  if (err) {
    return NextResponse.redirect(`${base}/?google=error&msg=${encodeURIComponent(err)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${base}/?google=error&msg=sem_code`);
  }
  if (expected && state && expected !== state) {
    return NextResponse.redirect(`${base}/?google=error&msg=state`);
  }

  try {
    const tokens = await exchangeCode(code);
    const email = await fetchUserEmail(tokens.access_token);
    const res = NextResponse.redirect(`${base}/?google=connected`);
    for (const c of tokenCookiesSet(tokens, email)) {
      res.cookies.set(c.name, c.value, c.options as any);
    }
    res.cookies.set("synccrm_oauth_state", "", { path: "/", maxAge: 0 });
    return res;
  } catch (e: any) {
    return NextResponse.redirect(
      `${base}/?google=error&msg=${encodeURIComponent(e?.message || "oauth_fail")}`
    );
  }
}
