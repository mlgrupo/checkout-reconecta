# 10 · Banco de dados e deploy

## Banco

Drizzle ORM sobre PostgreSQL. Duas formas de rodar, mesmo código e mesmas migrações:

| Modo | Quando | Como |
|------|--------|------|
| **PGlite** | Desenvolvimento local, sem instalar nada | `DATABASE_URL` vazio. Postgres embarcado grava em `.data/pglite/` (ignorado pelo git). |
| **PostgreSQL** | Produção e homologação | `DATABASE_URL=postgres://...` (Railway, Neon, Supabase, RDS...). |

As migrações em `drizzle/` são aplicadas automaticamente quando o servidor sobe (`src/instrumentation.ts`).

### Alterar o schema

1. Edite `src/db/schema.ts`.
2. `pnpm db:generate` gera o SQL em `drizzle/`. Revise o arquivo.
3. Reinicie o servidor: a migração é aplicada.
4. Commit do schema e da migração juntos.

`pnpm db:studio` abre o Drizzle Studio para inspecionar dados (precisa de `DATABASE_URL`).

### Tabelas

| Tabela | Conteúdo |
|--------|----------|
| `produtos` | Nome, slug, descrição, preço em centavos, imagem (id ou URL), ativo. |
| `imagens` | Imagens de produto (bytea) servidas por `/api/imagens/{id}`. Limite 2 MB. |
| `links_checkout` | Código público, produto, order bump (produto, preço, textos), meios, parcelas, URL de sucesso. |
| `pedidos` | Cliente, método, total, status, ids e URLs do Asaas, Pix/boleto/cartão, UTM, IP. `numero` é sequencial. |
| `pedido_itens` | Itens do pedido (`principal` / `order_bump`) com preço no momento da compra. |
| `eventos_pedido` | Linha do tempo: criação, cobrança, webhooks, mudanças de status. |
| `eventos_webhook` | Todo webhook recebido, chave = id do evento (idempotência), erro se houver. |
| `configuracoes` | Chave/valor: `gtm_id`, `nome_loja`, `email_suporte`, `whatsapp_suporte`. |

Valores monetários são **inteiros em centavos**. Datas com fuso (`timestamptz`).

## Deploy no Railway

O Railway já está conectado a este ambiente. Passos:

1. **Postgres**: no projeto Railway, adicione o plugin PostgreSQL. Copie `DATABASE_URL`.
2. **Serviço web**: aponte para o repositório `mlgrupo/checkout-reconecta`. Build `pnpm install && pnpm build`,
   start `pnpm start`. Node 20+.
3. **Variáveis** (Settings → Variables):

   ```
   APP_BASE_URL=https://SEU-DOMINIO
   DATABASE_URL=...            (referência ao Postgres)
   AUTH0_DOMAIN / AUTH0_CLIENT_ID / AUTH0_CLIENT_SECRET / AUTH0_SECRET
   AUTH0_MGMT_CLIENT_ID / AUTH0_MGMT_CLIENT_SECRET
   ASAAS_ENV=sandbox           (production quando for ao ar)
   ASAAS_API_KEY=...
   ASAAS_WEBHOOK_TOKEN=...     (gere: openssl rand -hex 24)
   NEXT_PUBLIC_GTM_ID=GTM-...  (opcional)
   NODE_ENV=production
   ```

4. **Domínio**: gere o domínio no Railway ou aponte o seu. Atualize no Auth0 (callback/logout) e em `APP_BASE_URL`.
5. **Webhook**: no painel → Configurações → **Registrar webhook no Asaas**.
6. **Auth0**: cadastre as URLs de produção (docs/04 §2).

Alternativa: Vercel funciona igual (Postgres externo obrigatório; sem PGlite em serverless).

## Backups

Com Postgres gerenciado, ative o backup automático do provedor. As imagens ficam no banco, então entram no backup.
Quando o volume de imagens crescer, migrar para bucket (Railway Buckets / S3) trocando só `src/lib/imagens.ts`.

## Checklist de produção

- [ ] `ASAAS_ENV=production` e chave de produção.
- [ ] `ASAAS_WEBHOOK_TOKEN` forte e webhook registrado com a URL de produção.
- [ ] HTTPS ativo (obrigatório para cartão).
- [ ] Auth0 com URLs de produção e provedor de e-mail próprio.
- [ ] `DATABASE_URL` de produção com backup ligado.
- [ ] Logo oficial em `public/brand/reconecta.svg`.
- [ ] GTM configurado e testado com Tag Assistant.
- [ ] `/api/dev/*` e `/dev/galeria` respondem 404 (automático com `NODE_ENV=production`).
