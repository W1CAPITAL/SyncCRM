SyncCRM: Plataforma SaaS de Gestão e Auditoria
O SyncCRM é uma plataforma SaaS de Customer Relationship Management (CRM) de nível corporativo, com arquitetura modular inspirada no ecossistema Salesforce. Desenvolvido para atuar como a camada principal e autônoma de operação, o sistema utiliza o Supabase como motor relacional para rastreabilidade e auditoria rigorosa, integrando-se de forma bidirecional e segura com o Google Sheets. O projeto é construído em Next.js 15 e implantado globalmente na infraestrutura de borda da Cloudflare.  

🚀 Principais Funcionalidades
Arquitetura Estilo Salesforce (CRM-First): Interface de alto desempenho separando claramente a visão operacional (tabelas densas com virtualização de linhas) da visão estratégica (Dashboards Executivos e Relatórios de BI).  

Motor de Auditoria (Audit Trail): Registro persistente e histórico de todas as alterações. A rastreabilidade total garante segurança em nível de linha (RLS) através do banco de dados PostgreSQL nativo do Supabase.  

Edge Computing (Cloudflare): Desacoplado de plataformas BaaS limitantes como o Firebase, o sistema roda com latência ultrabaixa utilizando Cloudflare Workers e o adaptador OpenNext.  

Integração Resiliente com Google Sheets: Sincronização em lotes (batch updates) via API REST, preservando fórmulas e formatações originais, e utilizando a planilha como um espelho ágil de integração.  

Inteligência Artificial Cognitiva: Mapeamento semântico autônomo de colunas e painéis de análise jurídica acionados pelo OpenRouter (operando o modelo openai/gpt-4o-mini) de forma isolada e segura na camada do servidor.  

🛠️ Stack Tecnológica
Frontend: Next.js 15 (App Router), React, Tailwind CSS, shadcn/ui.  

Backend & API: Next.js Route Handlers interceptados por Cloudflare Workers via adaptador @opennextjs/cloudflare.  

Banco de Dados & Auditoria: Supabase (PostgreSQL) com políticas estritas de RLS.  

Integrações: Google Sheets API v4 (REST Server-to-Server)  e OpenRouter API.  

📦 Configuração e Instalação
1. Pré-requisitos
Node.js (versão 18+ compatível com Next.js 15)

Conta ativa na Cloudflare e CLI wrangler instalada globalmente

Projeto configurado no Supabase

Conta de Serviço (Service Account) do Google Cloud Platform (GCP) com acesso habilitado à API do Sheets

2. Variáveis de Ambiente
Crie um arquivo .dev.vars na raiz do projeto (o padrão seguro para o ambiente Cloudflare local) e defina suas credenciais :env  

Banco de Dados e Auditoria (Supabase)
NEXT_PUBLIC_SUPABASE_URL="seu_supabase_url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sua_anon_key"

Autenticação de Servidor para o Google Sheets
GOOGLE_SHEETS_PRIVATE_KEY="sua_chave_privada_jwk_ou_pem"
GOOGLE_SHEETS_CLIENT_EMAIL="seu_email_de_servico@projeto.iam.gserviceaccount.com"

IA (OpenRouter)
OPENROUTER_API_KEY="sua_chave_openrouter"


### 3. Executando Localmente
Instale as dependências com `npm`, `yarn` ou `pnpm` e inicie o ambiente de desenvolvimento:
```bash
npm install
npm run dev
4. Implantação no Cloudflare
A implantação na nuvem utiliza o OpenNext para gerar um pacote otimizado para o V8 Isolate. Certifique-se de que o seu wrangler.jsonc contenha a declaração correta da binding WORKER_SELF_REFERENCE para evitar erros de compilação.  

Para construir e publicar, execute:

Bash
npm run build
npx wrangler deploy
🛡️ Segurança e Governança
Nesta arquitetura modernizada, o fluxo de dados é 100% blindado no backend. O sistema adota uma abordagem de isolamento multilocatário (multi-tenant), onde os logs de auditoria são alimentados diretamente pelo PostgreSQL e jamais podem ser adulterados no lado do cliente. Operações críticas e manipulação das chaves das planilhas são gerenciadas exclusivamente em Route Handlers ocultos da interface pública do navegador.
