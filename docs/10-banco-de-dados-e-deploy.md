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

O repositório já traz `railway.json` (build com pnpm, start `pnpm start`, healthcheck em `/api/saude`).
O Next escuta na porta que o Railway injeta em `PORT`.

1. **Projeto**: crie um projeto novo (ex.: `Checkout Reconecta`) ou use o existente da Reconecta.
2. **Postgres**: **New → Database → PostgreSQL**. Ele expõe a variável `DATABASE_URL` no próprio serviço.
   Se preferir reaproveitar o projeto "Banco de dados RECONECTA", crie um banco novo lá e copie a URL.
3. **Serviço web**: **New → GitHub Repo → `mlgrupo/checkout-reconecta`**, branch `main`. O Railway detecta o
   `railway.json`. Node 20+ (Nixpacks escolhe sozinho pelo `engines` do `package.json`).
4. **Variáveis** do serviço web (Settings → Variables). Use referência para o banco: `${{Postgres.DATABASE_URL}}`.

   ```
   NODE_ENV=production
   APP_BASE_URL=https://SEU-DOMINIO.up.railway.app     (o domínio gerado no passo 5; atualize depois)
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   AUTH0_DOMAIN / AUTH0_CLIENT_ID / AUTH0_CLIENT_SECRET / AUTH0_SECRET
   AUTH0_MGMT_CLIENT_ID / AUTH0_MGMT_CLIENT_SECRET
   ASAAS_ENV=sandbox                                    (production quando for ao ar)
   ASAAS_API_KEY=...
   ASAAS_WEBHOOK_TOKEN=...                              (gere: openssl rand -hex 24)
   ASAAS_WEBHOOK_BASE_URL=                              (vazio: usa APP_BASE_URL)
   ASAAS_SANDBOX_PAYER_API_KEY=...                      (opcional, só sandbox)
   NEXT_PUBLIC_GTM_ID=GTM-...                           (opcional)
   ```

5. **Domínio**: Settings → Networking → **Generate Domain** (porta 3000) ou aponte o seu. Coloque em `APP_BASE_URL`
   e cadastre no Auth0 (`/auth/callback` e logout).
6. **Deploy**: o primeiro deploy roda as migrações no boot (`instrumentation.ts`). Confira `/api/saude` → `{"ok":true,"banco":"postgres"}`.
7. **Webhook**: painel → Configurações → **Registrar webhook no Asaas**. A URL registrada é a pública do Railway.

Cada push em `main` gera um novo deploy. Para homologação separada, crie um segundo ambiente no Railway com
`ASAAS_ENV=sandbox` e outro banco.

### Sem Postgres

Se o serviço subir sem `DATABASE_URL`, ele usa PGlite em disco local e avisa no log: os dados somem a cada deploy.
Serve só para um teste rápido de webhook, nunca para vender.

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
