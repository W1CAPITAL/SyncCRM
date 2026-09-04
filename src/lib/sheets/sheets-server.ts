/**
 * SyncCRM — escrita/leitura Google Sheets via Apps Script (/exec).
 * Mesmo contrato do LexisPredict híbrido.
 */

export type SheetsWriteRow = Record<string, string | number | boolean | null | undefined>;

export type SheetsResult = {
  ok: boolean;
  json?: any;
  error?: string;
  status?: number;
};

function webhookUrl(): string {
  return String(process.env.SHEETS_WEBHOOK_URL || process.env.LEXIS_SHEETS_WEBHOOK_URL || "")
    .trim()
    .replace(/\/dev(\b|$)/, "/exec");
}

function token(): string {
  return String(process.env.SHEETS_TOKEN || process.env.LEXIS_SHEETS_TOKEN || "").trim();
}

export function sheetsWebhookConfigured(): boolean {
  const u = webhookUrl();
  return !!u && /^https:\/\/script\.google\.com\//i.test(u);
}

function parseBody(text: string): SheetsResult {
  const slice = text.slice(0, 500);
  if (/<!DOCTYPE html|<html/i.test(slice)) {
    return {
      ok: false,
      error: "Webhook devolveu HTML (login/implantação). Use /exec e acesso 'Qualquer pessoa'.",
    };
  }
  try {
    const json = JSON.parse(text || "{}");
    return { ok: !!(json?.ok ?? true), json };
  } catch {
    return { ok: false, error: "Resposta não-JSON: " + slice.slice(0, 160) };
  }
}

async function sheetsGet(params: Record<string, string>): Promise<SheetsResult> {
  const url = webhookUrl();
  if (!url) return { ok: false, error: "SHEETS_WEBHOOK_URL vazia", status: 0 };
  const q = new URLSearchParams({ token: token(), ...params });
  try {
    const res = await fetch(`${url}?${q.toString()}`, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
    });
    const parsed = parseBody(await res.text());
    return { ...parsed, status: res.status };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Falha GET Sheets", status: 0 };
  }
}

async function sheetsPost(body: Record<string, unknown>, timeoutMs = 8000): Promise<SheetsResult> {
  const url = webhookUrl();
  if (!url) return { ok: false, error: "SHEETS_WEBHOOK_URL vazia", status: 0 };
  if (!token()) return { ok: false, error: "SHEETS_TOKEN não configurado", status: 0 };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
        Accept: "application/json,text/plain,*/*",
      },
      body: JSON.stringify({ token: token(), ...body }),
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
    });
    const parsed = parseBody(await res.text());
    return { ...parsed, status: res.status };
  } catch (e: any) {
    return {
      ok: false,
      error:
        e?.name === "AbortError"
          ? "Webhook Sheets excedeu o tempo."
          : e?.message || "Falha POST Sheets",
      status: 0,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function sheetsServerPost(
  body: Record<string, unknown>
): Promise<SheetsResult> {
  const action = String(body.action || "ping");
  const post = await sheetsPost(body, action === "upsert_batch" ? 12000 : 6000);
  if (post.ok) return post;

  if (action !== "write" && action !== "upsert_batch") {
    const flat: Record<string, string> = { action };
    for (const [k, v] of Object.entries(body)) {
      if (k === "action" || v === undefined || v === null) continue;
      flat[k] = typeof v === "object" ? JSON.stringify(v) : String(v);
    }
    const get = await sheetsGet(flat);
    if (get.ok) return get;
  }

  return {
    ok: false,
    error: post.error || `Webhook HTTP ${post.status || 0}`,
    status: post.status,
  };
}

export async function sheetsPing(): Promise<SheetsResult> {
  return sheetsGet({ action: "ping", ping: "1" });
}

export async function sheetsListProcessos(opts?: {
  limit?: number;
}): Promise<{ ok: boolean; rows: any[]; headers?: string[]; error?: string }> {
  const r = await sheetsServerPost({
    action: "list",
    limit: opts?.limit ?? 8000,
  });
  if (!r.ok) return { ok: false, rows: [], error: r.error };
  const rows = r.json?.rows || r.json?.processos || r.json?.data || [];
  const headers = r.json?.headers;
  return {
    ok: true,
    rows: Array.isArray(rows) ? rows : [],
    headers: Array.isArray(headers) ? headers.map(String) : undefined,
  };
}

export async function sheetsWriteRows(rows: SheetsWriteRow[]): Promise<{
  ok: boolean;
  updated?: number;
  added?: number;
  written?: number;
  error?: string;
}> {
  if (!rows.length) return { ok: true, updated: 0, added: 0, written: 0 };
  const r = await sheetsServerPost({
    action: "upsert_batch",
    rows,
    source: "SyncCRM",
    actor: "sync",
    actor_name: "SyncCRM",
  });
  if (!r.ok) return { ok: false, error: r.error, updated: 0, added: 0, written: 0 };
  const updated = Number(r.json?.updated ?? 0);
  const added = Number(r.json?.added ?? 0);
  return {
    ok: true,
    updated,
    added,
    written: Number(r.json?.written ?? updated + added),
  };
}
