# Checkout Reconecta

Plataforma de checkout da Reconecta em parceria com o Asaas: produtos, links de checkout com order bump, Pix/boleto/cartão
via API do Asaas, eventos GTM e painel interno. Next.js 16 (App Router, `src/`), TypeScript estrito, Tailwind 4, Auth0,
Drizzle + PostgreSQL (PGlite em dev). Documentação completa em `docs/` (comece por `docs/README.md`).

## Comandos

```bash
pnpm dev          # servidor local (banco PGlite em .data/, Asaas em simulação)
pnpm lint         # eslint (inclui regras do React Compiler)
pnpm typecheck    # tsc --noEmit
pnpm build        # build de produção
pnpm db:generate  # gera migração após mudar src/db/schema.ts
curl -X POST localhost:3000/api/dev/seed   # produto + bump + link de exemplo (só em dev)
```

## Regras do projeto

- Interface, mensagens, docs e nomes de domínio em **pt-BR**. Nomes vindos de bibliotecas ficam em inglês.
- Design system: só os tokens de `src/app/globals.css` (branco, azul, dourado, bordô). Nunca preto puro, nunca cinza genérico.
  Dourado é raro (um destaque por tela; no checkout é o order bump); bordô só para ações irreversíveis. Ver `docs/03`.
- Selo do Asaas sempre pela URL oficial (`SeloAsaas`), nunca arquivo local; logo da Reconecta em `public/brand/reconecta.svg`.
- Server Components por padrão. `"use client"` só com interação. Segredos só em módulos com `import "server-only"`.
  Constantes usadas no navegador vêm de `src/lib/dominio.ts`, nunca de `src/db/schema.ts`.
- Links para `/auth/*` são `<a>` puros (sem `<Link>`).
- Proteção: páginas usam `exigirUsuario()` + `podeAtuarComo()`; route handlers usam `exigirApi("papel")`.
  Papéis: `admin` ⊃ `operador` ⊃ `leitura`.
- Route files (`route.ts`) só exportam métodos HTTP e `dynamic`; schemas Zod ficam em `src/lib/validacao/`.
- Dinheiro sempre em centavos (inteiro). Datas com fuso. Status de pedido só via `lib/pedidos/status.ts`.
- Order bump = uma única cobrança no Asaas com o total (ADR-009). Não criar duas cobranças.
- Todo acesso ao Asaas passa por `lib/asaas` (`asaas` respeita `ASAAS_ENV`: simulacao | sandbox | production).
- Não chame `setState` de forma síncrona dentro de `useEffect` (lint falha). Use `key` para reinicializar formulários e
  callbacks de promise para dados.
- Toda decisão técnica relevante vira uma entrada em `docs/DECISOES.md`; toda entrega atualiza `CHANGELOG.md`.
- Nunca versionar `.env`. O template é `.env.example`. `.data/` (PGlite) também fica fora do git.
