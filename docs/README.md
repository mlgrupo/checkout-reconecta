# Documentação · Checkout Reconecta

Plataforma de checkout da Reconecta construída sobre a infraestrutura de pagamentos do Asaas.
Esta pasta é a fonte de verdade do projeto: decisões, configuração, design e integrações.

## Índice

| # | Documento | O que responde |
|---|-----------|----------------|
| 01 | [Visão geral](01-visao-geral.md) | O que estamos construindo, para quem, missão do MVP e estado por fase. |
| 02 | [Arquitetura](02-arquitetura.md) | Stack, estrutura de pastas, fluxos e permissões. |
| 03 | [Design system](03-design-system.md) | Cores, tipografia, componentes e regras de coesão. |
| 04 | [Autenticação (Auth0)](04-autenticacao-auth0.md) | Passo a passo do tenant, roles, Action e aplicação M2M. |
| 05 | [Gestão de usuários](05-gestao-de-usuarios.md) | Tela de usuários e endpoints da Management API. |
| 06 | [Integração Asaas](06-integracao-asaas.md) | Ambientes, endpoints, webhook, cartões de teste, checklist. |
| 07 | [Marca e logos](07-marca-e-logos.md) | Logo Reconecta, selo Asaas por link, lockup. |
| 08 | [Checkout e order bump](08-checkout-e-order-bump.md) | Fluxo de venda, decisão da cobrança única, status, segurança. |
| 09 | [GTM e eventos](09-gtm-e-eventos.md) | Instalação, lista de eventos, configuração de tags, teste. |
| 10 | [Banco de dados e deploy](10-banco-de-dados-e-deploy.md) | Drizzle, PGlite/Postgres, migrações, Railway, checklist. |
| — | [Decisões (ADR)](DECISOES.md) | Registro das decisões técnicas e o porquê de cada uma. |
| — | [Changelog](../CHANGELOG.md) | O que mudou em cada etapa. |

## Pastas de apoio

- `docs/asaas/` — documentação, PDFs e exemplos recebidos do Asaas.
- `docs/marca/` — kits de marca e arquivos-fonte das logos (os SVGs finais vão para `public/brand/`).

## Como rodar

```bash
pnpm install
cp .env.example .env   # já funciona sem chaves: Asaas em simulação e banco local
pnpm dev               # http://localhost:3000
```

Sem Auth0 configurado o painel não abre, mas o checkout público funciona: crie dados de exemplo com
`curl -X POST http://localhost:3000/api/dev/seed` e abra a URL devolvida.

Comandos úteis: `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm db:generate`.
