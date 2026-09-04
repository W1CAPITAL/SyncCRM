"use server";

import {
  sheetsListProcessos,
  sheetsPing,
  sheetsWebhookConfigured,
  sheetsWriteRows,
  type SheetsWriteRow,
} from "@/lib/sheets/sheets-server";

export async function pingSheetsAction(): Promise<{
  ok: boolean;
  message: string;
}> {
  if (!sheetsWebhookConfigured()) {
    return {
      ok: false,
      message: "Configure SHEETS_WEBHOOK_URL e SHEETS_TOKEN no Vercel.",
    };
  }
  const r = await sheetsPing();
  if (!r.ok) return { ok: false, message: r.error || "Ping falhou" };
  return {
    ok: true,
    message: r.json?.app
      ? `OK · ${r.json.app}`
      : "Webhook respondeu ok",
  };
}

export async function loadCarteiraFromWebhookAction(): Promise<{
  ok: boolean;
  headers: string[];
  records: { id: string; rowIndex: number; data: Record<string, string> }[];
  error?: string;
  source: "webhook" | "none";
}> {
  if (!sheetsWebhookConfigured()) {
    return {
      ok: false,
      headers: [],
      records: [],
      error: "Webhook não configurado no servidor",
      source: "none",
    };
  }
  const list = await sheetsListProcessos({ limit: 8000 });
  if (!list.ok) {
    return {
      ok: false,
      headers: [],
      records: [],
      error: list.error || "list falhou",
      source: "none",
    };
  }
  if (!list.rows.length) {
    return {
      ok: true,
      headers: list.headers || [],
      records: [],
      source: "webhook",
    };
  }

  // Unifica chaves: usa headers do script ou união das keys
  const headerSet = new Set<string>();
  if (list.headers?.length) list.headers.forEach((h) => headerSet.add(h));
  for (const row of list.rows) {
    Object.keys(row || {}).forEach((k) => headerSet.add(k));
  }
  const headers = Array.from(headerSet);
  const records = list.rows.map((row, i) => {
    const data: Record<string, string> = {};
    headers.forEach((h, idx) => {
      const v = row[h] ?? row[`col_${idx}`] ?? "";
      data[`col_${idx}`] = v == null ? "" : String(v);
    });
    // também guarda por nome (útil no write)
    headers.forEach((h) => {
      if (row[h] != null && String(row[h]) !== "") data[h] = String(row[h]);
    });
    return { id: `rec_${i}`, rowIndex: i, data };
  });

  return { ok: true, headers, records, source: "webhook" };
}

export async function writeRowsToSheetAction(
  rows: SheetsWriteRow[]
): Promise<{ ok: boolean; message: string; updated?: number; added?: number }> {
  if (!sheetsWebhookConfigured()) {
    return {
      ok: false,
      message: "SHEETS_WEBHOOK_URL / TOKEN ausentes no Vercel",
    };
  }
  const r = await sheetsWriteRows(rows);
  if (!r.ok) return { ok: false, message: r.error || "Escrita falhou" };
  return {
    ok: true,
    message: `Planilha: ${r.updated || 0} atualizados, ${r.added || 0} novos`,
    updated: r.updated,
    added: r.added,
  };
}

/** Atendimento: atualiza Retorno + Status + AtendidoPor na planilha */
export async function registrarAtendimentoSheetAction(input: {
  protocolo: string;
  status?: string;
  ultimoRetorno?: string;
  proximoRetorno?: string;
  atendidoPor?: string;
  observacao?: string;
}): Promise<{ ok: boolean; message: string }> {
  const proto = String(input.protocolo || "").trim();
  if (!proto) return { ok: false, message: "Protocolo obrigatório" };
  const hoje = new Date().toISOString().slice(0, 10);
  const row: SheetsWriteRow = {
    Protocolo: proto,
    protocolo: proto,
    UltimoRetorno: input.ultimoRetorno || hoje,
    Retorno: input.ultimoRetorno || hoje,
    ProximoRetorno: input.proximoRetorno || "",
    Proximo_Retorno: input.proximoRetorno || "",
    Status: input.status || "ATENDIDO",
    Situacao: input.status || "ATENDIDO",
    AtendidoPor: input.atendidoPor || "SyncCRM",
    Observacao: input.observacao || "",
    Observacoes: input.observacao || "",
  };
  return writeRowsToSheetAction([row]);
}
