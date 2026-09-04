/**
 * Google Sheets API v4 — leitura e escrita com access token do usuário.
 */

export function extractSpreadsheetId(input: string): string {
  const s = String(input || "").trim();
  const m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]{20,})/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(s)) return s;
  return "";
}

export async function sheetsGetValues(
  accessToken: string,
  spreadsheetId: string,
  range = "A:ZZ"
): Promise<{ ok: boolean; values?: string[][]; error?: string }> {
  const id = extractSpreadsheetId(spreadsheetId);
  if (!id) return { ok: false, error: "ID da planilha inválido" };
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      error: json?.error?.message || `Sheets API HTTP ${res.status}`,
    };
  }
  const values = (json.values || []) as string[][];
  return { ok: true, values };
}

export async function sheetsUpdateRowByProtocolo(
  accessToken: string,
  spreadsheetId: string,
  opts: {
    protocolo: string;
    fields: Record<string, string>;
    /** nomes de coluna → valor; faz match por cabeçalho linha 1 */
    sheetName?: string;
  }
): Promise<{ ok: boolean; updated?: boolean; inserted?: boolean; error?: string }> {
  const id = extractSpreadsheetId(spreadsheetId);
  if (!id) return { ok: false, error: "ID da planilha inválido" };

  const range = opts.sheetName ? `${opts.sheetName}!A:ZZ` : "A:ZZ";
  const got = await sheetsGetValues(accessToken, id, range);
  if (!got.ok || !got.values?.length) {
    return { ok: false, error: got.error || "Planilha vazia" };
  }

  const headers = got.values[0].map((h) => String(h || "").trim());
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .trim();

  const protoDigits = String(opts.protocolo || "").replace(/\D/g, "");
  if (!protoDigits) return { ok: false, error: "Protocolo vazio" };

  let keyIdx = headers.findIndex((h) => /protocolo|processo|cnj/.test(norm(h)));
  if (keyIdx < 0) keyIdx = 0;

  let rowIndex = -1; // 0-based in values array
  for (let i = 1; i < got.values.length; i++) {
    const cell = String(got.values[i][keyIdx] || "").replace(/\D/g, "");
    if (cell && cell === protoDigits) {
      rowIndex = i;
      break;
    }
  }

  // Monta linha
  const fieldMap: Record<string, string> = {};
  for (const [k, v] of Object.entries(opts.fields)) {
    if (v === undefined || v === null || v === "") continue;
    fieldMap[norm(k)] = String(v);
  }

  // aliases
  if (fieldMap["ultimoretorno"] && !fieldMap["retorno"]) fieldMap["retorno"] = fieldMap["ultimoretorno"];
  if (fieldMap["proximoretorno"] && !fieldMap["proximo_retorno"]) {
    fieldMap["proximo retorno"] = fieldMap["proximoretorno"];
    fieldMap["proximo_retorno"] = fieldMap["proximoretorno"];
  }

  if (rowIndex >= 0) {
    const row = [...got.values[rowIndex]];
    while (row.length < headers.length) row.push("");
    headers.forEach((h, c) => {
      const nk = norm(h);
      for (const [fk, fv] of Object.entries(fieldMap)) {
        if (fk === nk || (fk.length >= 4 && (nk.includes(fk) || fk.includes(nk)))) {
          row[c] = fv;
        }
      }
    });
    // ensure protocolo
    row[keyIdx] = got.values[rowIndex][keyIdx] || opts.protocolo;

    const a1Row = rowIndex + 1; // 1-based sheet
    const endCol = colToA1(headers.length);
    const updateRange = opts.sheetName
      ? `${opts.sheetName}!A${a1Row}:${endCol}${a1Row}`
      : `A${a1Row}:${endCol}${a1Row}`;

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(updateRange)}?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values: [row] }),
      }
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: json?.error?.message || `Update HTTP ${res.status}` };
    }
    return { ok: true, updated: true };
  }

  // insert
  const line = headers.map((h) => {
    const nk = norm(h);
    for (const [fk, fv] of Object.entries(fieldMap)) {
      if (fk === nk || (fk.length >= 4 && (nk.includes(fk) || fk.includes(nk)))) return fv;
    }
    if (/protocolo|processo|cnj/.test(nk)) return opts.protocolo;
    return "";
  });
  const appendRange = opts.sheetName ? `${opts.sheetName}!A:ZZ` : "A:ZZ";
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(appendRange)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [line] }),
    }
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: json?.error?.message || `Append HTTP ${res.status}` };
  }
  return { ok: true, inserted: true };
}

function colToA1(n: number): string {
  let s = "";
  let x = n;
  while (x > 0) {
    const m = (x - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s || "A";
}
