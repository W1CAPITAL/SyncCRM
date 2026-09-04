import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_ACCESS, COOKIE_REFRESH } from "@/lib/google/config";
import { refreshAccessToken, tokenCookiesSet } from "@/lib/google/oauth";
import { sheetsGetValues, extractSpreadsheetId } from "@/lib/google/sheets-api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const spreadsheetId = extractSpreadsheetId(String(body.spreadsheetId || body.url || ""));
    if (!spreadsheetId) {
      return NextResponse.json({ ok: false, error: "spreadsheetId inválido" }, { status: 400 });
    }

    const jar = await cookies();
    let access = jar.get(COOKIE_ACCESS)?.value;
    const refresh = jar.get(COOKIE_REFRESH)?.value;

    let refreshed: any = null;
    if (!access && refresh) {
      refreshed = await refreshAccessToken(refresh);
      access = refreshed.access_token;
    }
    if (!access) {
      return NextResponse.json(
        { ok: false, error: "Conecte o Google primeiro", needAuth: true },
        { status: 401 }
      );
    }

    const result = await sheetsGetValues(access, spreadsheetId, body.range || "A:ZZ");
    const res = NextResponse.json(result);
    if (refreshed) {
      for (const c of tokenCookiesSet(refreshed)) {
        res.cookies.set(c.name, c.value, c.options as any);
      }
    }
    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "read fail" }, { status: 500 });
  }
}
