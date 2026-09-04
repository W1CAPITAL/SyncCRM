import { cookies } from "next/headers";
import {
  COOKIE_ACCESS,
  COOKIE_EMAIL,
  COOKIE_REFRESH,
} from "./config";
import { refreshAccessToken } from "./oauth";

/** Obtém access token válido (renova se preciso). */
export async function getValidAccessToken(): Promise<{
  ok: boolean;
  accessToken?: string;
  email?: string;
  error?: string;
}> {
  const jar = await cookies();
  let access = jar.get(COOKIE_ACCESS)?.value;
  const refresh = jar.get(COOKIE_REFRESH)?.value;
  const email = jar.get(COOKIE_EMAIL)?.value;

  if (access) return { ok: true, accessToken: access, email };

  if (!refresh) {
    return { ok: false, error: "Google não conectado. Clique em Conectar Google." };
  }

  try {
    const tokens = await refreshAccessToken(refresh);
    // Nota: em Server Components/Actions, set cookie precisa ser no Route Handler.
    // Aqui devolvemos o token renovado; o caller de API deve persistir.
    return {
      ok: true,
      accessToken: tokens.access_token,
      email,
      // @ts-expect-error pass through for route handlers
      _refreshed: tokens,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Sessão Google expirada. Conecte de novo." };
  }
}
