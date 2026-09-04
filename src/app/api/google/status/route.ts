import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  COOKIE_ACCESS,
  COOKIE_EMAIL,
  COOKIE_REFRESH,
  googleOAuthConfigured,
} from "@/lib/google/config";

export async function GET() {
  const jar = await cookies();
  const access = jar.get(COOKIE_ACCESS)?.value;
  const refresh = jar.get(COOKIE_REFRESH)?.value;
  const email = jar.get(COOKIE_EMAIL)?.value;
  return NextResponse.json({
    ok: true,
    configured: googleOAuthConfigured(),
    connected: !!(access || refresh),
    email: email || null,
  });
}
