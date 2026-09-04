import { NextResponse } from "next/server";
import { googleOAuthConfigured } from "@/lib/google/config";
import { buildAuthUrl } from "@/lib/google/oauth";
import { randomBytes } from "crypto";

export async function GET() {
  if (!googleOAuthConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET ausentes no Vercel.",
      },
      { status: 500 }
    );
  }
  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(buildAuthUrl(state));
  res.cookies.set("synccrm_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
