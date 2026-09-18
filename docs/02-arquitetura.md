# 02 · Arquitetura

## Stack

| Camada | Escolha | Por quê |
|--------|---------|---------|
| Framework | Next.js 16 (App Router, `src/`) | Server Components para páginas protegidas, Route Handlers para a API, páginas públicas de checkout no mesmo deploy. |
| Linguagem | TypeScript estrito | Contratos explícitos com Auth0 e Asaas. |
| Estilo | Tailwind CSS 4 com tokens em `@theme` | Design system em CSS puro, sem config JS. |
| Autenticação | Auth0 via `@auth0/nextjs-auth0` v4 | Login hospedado, sessão em cookie, sem gerenciar senhas. |
| Gestão de usuários | Auth0 Management API v2 (fetch direto) | Contrato pequeno e explícito. |
| Banco | Drizzle ORM + PostgreSQL (PGlite em dev) | Mesmo SQL local e em produção; migrações versionadas. |
| Pagamentos | Asaas API v3 (cobranças, Pix, boleto, cartão, webhooks) | Provedor da parceria. Cliente próprio + modo simulação. |
| Validação | Zod 4 | Env, corpos de requisição e formulários. |
| Rastreamento | Google Tag Manager via dataLayer | Eventos padrão GA4 + específicos do checkout. |

## Estrutura de pastas

```
src/
  app/
    layout.tsx · providers.tsx          fontes, Auth0Provider, toasts
    page.tsx                            redireciona para /painel ou /entrar
    entrar/                             tela de login (pública)
    (app)/                              painel protegido (layout exige sessão)
      painel/ · pedidos/ · produtos/ · links/ · usuarios/ · configuracoes/ · conta/
    c/[codigo]/                         checkout público
    c/[codigo]/pedido/[id]/             página do pedido (Pix, boleto, cartão, sucesso)
    dev/galeria/                        galeria do design system (só em desenvolvimento)
    api/
      admin/produtos · links · pedidos · usuarios · roles · imagens · configuracoes · asaas/webhook
      checkout/[codigo]/pedidos         cria pedido + cobrança (público)
      pedidos/[id]                      status público (polling)
      asaas/webhook                     recebe eventos do Asaas
      imagens/[id]                      serve imagens de produto
      conta/redefinir-senha             próprio usuário
      dev/seed                          dados de exemplo (só em desenvolvimento)
  components/
    ui/          primitivos (Button, Campo, Selo, Painel, Gaveta, Avatar, Toast, EntradaDinheiro, ícones)
    brand/       MarcaParceria, SeloAsaas, AnelParceria
    shell/       Shell, CabecalhoPagina, AcessoRestrito
    checkout/    Checkout (formulário), Pagamento (status), MolduraCheckout
    produtos/ · links/ · pedidos/ · users/ · configuracoes/ · conta/   telas do painel
    gtm/         instalação do container
  db/
    schema.ts    tabelas (Drizzle) · index.ts conexão (PGlite ou Postgres) + migrações
  lib/
    asaas/       tipos, cliente real, cliente simulado, seletor
    pedidos/     criar (pedido + cobrança), status (mapeamento, sincronização, webhook), consultas
    produtos.ts · links.ts · imagens.ts · configuracoes.ts   serviços de domínio
    auth0.ts · auth/roles.ts · auth/session.ts · auth0-management.ts
    gtm/eventos.ts   helper do dataLayer
    formato.ts       dinheiro, CPF/CNPJ, telefone, cartão, slugs
    dominio.ts       constantes compartilhadas (métodos, status)
    validacao/admin.ts   schemas Zod dos formulários administrativos
    env.ts · api.ts · http-cliente.ts · utils.ts
  instrumentation.ts   conecta ao banco e migra no boot
  proxy.ts             rotas /auth/* do Auth0
drizzle/               migrações SQL geradas
public/brand/          reconecta.svg (placeholder até a oficial)
docs/                  esta documentação
```

## Fluxos

### Login e autorização

1. `/entrar` → `/auth/login` (SDK) → Universal Login → `/auth/callback`.
2. `beforeSessionSaved` copia o claim de papéis para `user.roles`.
3. `(app)/layout.tsx` exige sessão. Páginas e handlers checam papel com `podeAtuarComo` (admin ⊃ operador ⊃ leitura).

| Área | Papel mínimo |
|------|--------------|
| Painel, pedidos (ver) | leitura |
| Produtos e links (criar/editar) | operador |
| Excluir produto/link, usuários, configurações, simular pagamento | admin |

### Venda

`/c/{codigo}` → `POST /api/checkout/{codigo}/pedidos` → `lib/pedidos/criar.ts` → Asaas → `/c/{codigo}/pedido/{id}`
→ polling em `GET /api/pedidos/{id}` + webhook em `POST /api/asaas/webhook` → `lib/pedidos/status.ts`.
Detalhes em docs/08.

### Dados

`obterDb()` devolve a conexão (singleton). Sem `DATABASE_URL` usa PGlite em `.data/`. Migrações em `drizzle/` são
aplicadas no boot. Detalhes em docs/10.

## Variáveis de ambiente

Todas em `.env.example`, com comentários. `lib/env.ts` valida no boot e expõe `prontidao`, usada pelo painel.

## Convenções

- Server Components por padrão; `"use client"` só com interação.
- Links para `/auth/*` são `<a>` puros.
- Segredos só em módulos com `import "server-only"`. Constantes usadas no navegador vêm de `lib/dominio.ts`.
- Dinheiro sempre em centavos (inteiro). Datas com fuso.
- Nada de `setState` síncrono em `useEffect`; formulários reiniciam por `key`.
- Nomes em português para domínio e UI; inglês para o que vem das bibliotecas.
