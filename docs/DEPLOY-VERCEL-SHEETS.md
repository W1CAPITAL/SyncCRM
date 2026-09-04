# SyncCRM + Lexis — planilha 2 vias (Vercel)

## Problema antigo
SyncCRM só **lia** a planilha (gviz CSV). `onEdit` era vazio → nada gravava no Google Sheets.

## Solução (igual Lexis híbrido)
1. Apps Script com `doGet` + `doPost` (`docs/SYNCCRM-AppsScript.gs`)
2. Server actions em `src/app/actions/sheets-sync-actions.ts`
3. Cliente chama `writeRowsToSheetAction` / `registrarAtendimentoSheetAction`

## Deploy Vercel (repo SyncCRM)
Environment variables:

```
SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/XXXX/exec
SHEETS_TOKEN=w1-fase1-2026
```

(TOKEN deve ser **igual** ao `var TOKEN` no Apps Script.)

## Apps Script
1. Abra a planilha → Extensões → Apps Script
2. Cole `docs/SYNCCRM-AppsScript.gs` (apague código antigo)
3. Ajuste `TOKEN` se quiser
4. Implantar → Nova implantação → **Aplicativo da web**
   - Executar como: **Eu**
   - Quem tem acesso: **Qualquer pessoa**
5. Autorize a conta Google
6. Copie a URL `/exec` → cole no Vercel `SHEETS_WEBHOOK_URL`
7. Redeploy

## Teste
1. No app: **Testar webhook** (deve responder `synccrm-lexis-sync`)
2. Sincronizar planilha (prefere webhook; senão cai no gviz)
3. Em Prazos → **CONCLUIR** → deve gravar Retorno + Status na planilha

## Cabeçalhos recomendados (W1)
Protocolo | Cliente | Telefone | Status | Retorno | Proximo_Retorno | Advogado | Observacoes | AtendidoPor
