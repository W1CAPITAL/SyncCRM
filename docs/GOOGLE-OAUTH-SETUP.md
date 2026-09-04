# SyncCRM — Google OAuth + Sheets API (sem webhook)

## O que este modo faz
- Você clica **Conectar Google** no CRM
- Autoriza a conta que tem a planilha
- O app **lê e grava** (Retorno, Status, etc.) via **Google Sheets API v4**
- **Não usa** Apps Script / webhook

---

## Checklist (faça nesta ordem)

### 1. Google Cloud Console
1. Acesse https://console.cloud.google.com/
2. Crie um projeto (ex.: `synccrm-w1`) ou use um existente
3. **APIs e serviços → Biblioteca** → busque **Google Sheets API** → **Ativar**
4. **APIs e serviços → Tela de consentimento OAuth**
   - Tipo: **Externo** (ou Interno se for Workspace da empresa)
   - Nome do app: `SyncCRM`
   - E-mail de suporte: o seu
   - Domínios autorizados: seu domínio Vercel (ex.: `synccrm.vercel.app`) quando pedir
   - Escopos: adicione
     - `https://www.googleapis.com/auth/spreadsheets`
     - `https://www.googleapis.com/auth/userinfo.email`
   - Usuários de teste (enquanto em "Teste"): adicione o e-mail Google que vai usar
5. **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**
   - Tipo: **Aplicativo da Web**
   - Nome: `SyncCRM Vercel`
   - **URIs de redirecionamento autorizados** (obrigatório):
     ```
     https://SEU-PROJETO.vercel.app/api/google/callback
     http://localhost:9002/api/google/callback
     ```
   - Copie **ID do cliente** e **Segredo do cliente**

### 2. Vercel (projeto SyncCRM)
Environment Variables:

| Nome | Valor |
|------|--------|
| `GOOGLE_CLIENT_ID` | ID do cliente OAuth |
| `GOOGLE_CLIENT_SECRET` | Segredo do cliente |
| `NEXT_PUBLIC_APP_URL` | `https://SEU-PROJETO.vercel.app` (sem barra no final) |

Opcional:
| `GOOGLE_REDIRECT_URI` | se quiser forçar o callback (deve ser igual ao cadastrado no Google) |

**Redeploy** depois de salvar as env.

### 3. Código
Aplique o ZIP deste pacote no repo `W1CAPITAL/SyncCRM`, commit e push (ou arraste no Vercel).

### 4. Uso no app
1. Abra o SyncCRM no Vercel
2. Clique **Conectar Google** (sidebar)
3. Escolha a conta que **é dona ou editora** da planilha
4. Aceite as permissões
5. Cole o link/ID da planilha e **Sincronizar**
6. Em **Prazos** → **CONCLUIR** → confira a linha na planilha (Retorno + Status)

### 5. Planilha
- A conta Google conectada precisa de permissão **Editor** na planilha
- Cabeçalho na **linha 1** com algo como:
  `Protocolo | Cliente | Status | Retorno | Proximo_Retorno | Telefone | Advogado | AtendidoPor`
- A chave de atualização é a coluna **Protocolo / Processo / CNJ**

---

## Problemas comuns

| Sintoma | Causa | Ação |
|---------|--------|------|
| redirect_uri_mismatch | Callback não cadastrado | Iguale Vercel URL + Google Console |
| access_denied | App em teste sem seu e-mail | Adicione usuário de teste na tela OAuth |
| Planilha privada não lê | Sem OAuth | Conectar Google |
| Grava no app e não na planilha | Token ausente / API off | Status → Conectar; ative Sheets API |
| 403 insufficient scopes | Escopo errado | Reconecte (consent de novo) |

---

## Segurança
- Tokens ficam em **cookies httpOnly** do navegador (não no código)
- Cada usuário autoriza **a própria** conta Google
- Em produção, publique o app OAuth ou mantenha lista de test users
