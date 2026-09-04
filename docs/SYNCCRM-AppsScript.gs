/**
 * SYNCCRM + LEXIS — Webhook planilha 2 vias
 * ==========================================
 * 1) Extensões → Apps Script → cole ESTE arquivo (substitua tudo)
 * 2) TOKEN = mesmo valor de SHEETS_TOKEN no Vercel
 * 3) Implantar → Nova implantação → Aplicativo da web
 *    - Executar como: Eu
 *    - Quem tem acesso: QUALQUER PESSOA
 * 4) Autorize → copie URL que termina em /exec
 * 5) Vercel env:
 *    SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/.../exec
 *    SHEETS_TOKEN=w1-fase1-2026
 *
 * Aba da carteira: nome "Processos" (ou a primeira aba).
 * Coluna chave: Protocolo (ou Processo / CNJ).
 * Colunas usadas no write: Retorno, Proximo_Retorno / ProximoRetorno,
 * Status, Situacao, AtendidoPor, Observacoes, Cliente, Telefone, Advogado.
 */

var TOKEN = "w1-fase1-2026";
var PROC_SHEET = "Processos";
var HEADER_ROW = 1;

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function norm_(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function activeSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(PROC_SHEET);
  if (!sh) sh = ss.getSheets()[0];
  return sh;
}

function headers_(sh) {
  var lastCol = Math.max(sh.getLastColumn(), 1);
  return sh.getRange(HEADER_ROW, 1, HEADER_ROW, lastCol).getValues()[0].map(String);
}

function checkToken_(p) {
  var t = String((p && (p.token || p.Token)) || "").trim();
  return t && t === TOKEN;
}

function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    if (!checkToken_(p)) return jsonOut_({ ok: false, error: "token inválido" });
    var action = String(p.action || "ping").toLowerCase();
    if (action === "ping") {
      return jsonOut_({ ok: true, app: "synccrm-lexis-sync", ts: new Date().toISOString() });
    }
    if (action === "list") return jsonOut_(list_(p));
    return jsonOut_({ ok: false, error: "action desconhecida: " + action });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) || "{}";
    var p = {};
    try {
      p = JSON.parse(raw);
    } catch (err) {
      return jsonOut_({ ok: false, error: "JSON inválido" });
    }
    if (!checkToken_(p)) return jsonOut_({ ok: false, error: "token inválido" });
    var action = String(p.action || "ping").toLowerCase();
    if (action === "ping") {
      return jsonOut_({ ok: true, app: "synccrm-lexis-sync", ts: new Date().toISOString() });
    }
    if (action === "list") return jsonOut_(list_(p));
    if (action === "upsert_batch" || action === "write") return jsonOut_(write_(p));
    return jsonOut_({ ok: false, error: "action desconhecida: " + action });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function list_(p) {
  var sh = activeSheet_();
  var headers = headers_(sh);
  var lastRow = sh.getLastRow();
  if (lastRow <= HEADER_ROW) return { ok: true, rows: [], headers: headers, count: 0 };
  var data = sh.getRange(HEADER_ROW + 1, 1, lastRow, headers.length).getValues();
  var limit = Math.min(Number(p.limit) || 8000, 12000);
  var rows = [];
  for (var i = 0; i < data.length && rows.length < limit; i++) {
    var obj = {};
    var empty = true;
    for (var c = 0; c < headers.length; c++) {
      var v = data[i][c];
      if (v !== "" && v != null) empty = false;
      obj[headers[c]] = v instanceof Date ? Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd") : v;
    }
    if (empty) continue;
    rows.push(obj);
  }
  return { ok: true, rows: rows, headers: headers, count: rows.length };
}

function write_(p) {
  var sh = activeSheet_();
  var headers = headers_(sh);
  var rowsIn = p.rows;
  if (typeof rowsIn === "string") {
    try {
      rowsIn = JSON.parse(rowsIn);
    } catch (e) {
      return { ok: false, error: "rows JSON inválido" };
    }
  }
  if (!Array.isArray(rowsIn)) rowsIn = [p];

  var keyIdx = 0;
  for (var h = 0; h < headers.length; h++) {
    if (/protocolo|processo|cnj/.test(norm_(headers[h]))) {
      keyIdx = h;
      break;
    }
  }

  var lastRow = sh.getLastRow();
  var map = {};
  if (lastRow > HEADER_ROW) {
    var col = sh.getRange(HEADER_ROW + 1, keyIdx + 1, lastRow, keyIdx + 1).getValues();
    for (var r = 0; r < col.length; r++) {
      var dig = String(col[r][0] || "").replace(/\D/g, "");
      if (dig) map[dig] = HEADER_ROW + 1 + r;
    }
  }

  var updated = 0,
    inserted = 0;
  for (var i = 0; i < rowsIn.length; i++) {
    var rec = rowsIn[i] || {};
    var proto = String(rec.Protocolo || rec.protocolo || rec.Processo || rec.processo || "").trim();
    var dig = proto.replace(/\D/g, "");
    if (!dig) continue;

    // aliases → cabeçalhos reais
    if (rec.UltimoRetorno && !rec.Retorno) rec.Retorno = rec.UltimoRetorno;
    if (rec.ProximoRetorno && !rec.Proximo_Retorno) rec.Proximo_Retorno = rec.ProximoRetorno;
    if (rec.Observacao && !rec.Observacoes) rec.Observacoes = rec.Observacao;

    if (map[dig]) {
      var rowNum = map[dig];
      var current = sh.getRange(rowNum, 1, rowNum, headers.length).getValues()[0];
      for (var c = 0; c < headers.length; c++) {
        var nk = norm_(headers[c]);
        for (var key in rec) {
          if (!Object.prototype.hasOwnProperty.call(rec, key)) continue;
          if (norm_(key) === nk && rec[key] !== undefined && rec[key] !== null && String(rec[key]) !== "") {
            current[c] = rec[key];
          }
        }
      }
      sh.getRange(rowNum, 1, rowNum, headers.length).setValues([current]);
      updated++;
    } else {
      var line = headers.map(function (hk) {
        var nk = norm_(hk);
        for (var key in rec) {
          if (norm_(key) === nk) return rec[key];
        }
        if (/protocolo|processo|cnj/.test(nk)) return proto;
        return "";
      });
      sh.appendRow(line);
      inserted++;
      map[dig] = sh.getLastRow();
    }
  }
  return { ok: true, updated: updated, added: inserted, written: updated + inserted };
}
