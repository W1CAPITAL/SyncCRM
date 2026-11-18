# SyncCRM

**Gestão de dados e rotinas de CRM conectadas a planilhas.**

O SyncCRM é um projeto web Next.js voltado à exploração e sincronização de informações em planilhas. A arquitetura prevista inclui mapeamento de colunas, conexão Google autorizada, filas de escrita e histórico de alterações. Essas capacidades constam do [blueprint do produto](docs/blueprint.md); consulte o código e os testes antes de tratá-las como funcionalidades concluídas.

## Estrutura do projeto

- **Aplicação:** Next.js 15, React 19 e TypeScript.
- **Interface:** componentes Radix UI, Tailwind CSS e visualização de dados.
- **Integrações:** arquitetura de autenticação Google e conectividade com planilhas, documentada em [Google OAuth](docs/GOOGLE-OAUTH-SETUP.md).
- **Implantação:** configuração e instruções em [Deploy Vercel + Sheets](docs/DEPLOY-VERCEL-SHEETS.md).

## Iniciar o ambiente local

```bash
npm install
npm run dev
```

O servidor de desenvolvimento é configurado no script `dev` para a porta **9002**. Antes de conectar serviços, configure suas próprias credenciais conforme os guias do repositório; segredos não devem ser enviados ao navegador ou publicados no GitHub.

## Distribuição W1

Este projeto é uma aplicação web: **não há executável Windows publicado neste repositório**. Para instalar os produtos desktop mantidos pela W1 Capital, utilize a [Central de Aplicativos W1](https://github.com/W1CAPITAL/Central-de-Apps).

[Releases e instaladores](https://github.com/W1CAPITAL/Central-de-Apps/releases) · [Catálogo de projetos](https://github.com/W1CAPITAL/Central-de-Apps/blob/main/docs/ECOSSISTEMA-W1.md)

---

**W1 Capital** · Desenvolvimento e integração de soluções para operações e dados.
