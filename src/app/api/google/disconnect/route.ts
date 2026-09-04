import { NextResponse } from "next/server";
import { tokenCookiesClear } from "@/lib/google/oauth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  for (const c of tokenCookiesClear()) {
    res.cookies.set(c.name, "", c.options as any);
  }
  return res;
}
