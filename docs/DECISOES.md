# Registro de decisões (ADR)

Formato: contexto → decisão → consequências. Uma decisão por seção, numeradas e datadas. Decisões
revertidas ficam no registro com a nota "substituída por".

## ADR-001 · Next.js 16 com App Router em um único projeto — 2026-09-18

**Contexto.** Painel interno autenticado, API interna e páginas públicas de checkout.
**Decisão.** Um projeto Next.js 16 (App Router, `src/`, TypeScript estrito) hospeda tudo.
**Consequências.** Um deploy só; Server Components leem sessão e banco sem round-trip; checkout público no mesmo
design system.

## ADR-002 · Auth0 com `@auth0/nextjs-auth0` v4 — 2026-09-18

**Contexto.** Login corporativo seguro, MFA opcional, sem gerenciar senhas.
**Decisão.** SDK oficial v4, rotas `/auth/*` montadas por `proxy.ts` (Next 16), sessão em cookie criptografado.
**Consequências.** Nenhum formulário de senha no nosso código. Dependemos de um tenant configurado (docs/04).

## ADR-003 · Papéis como Roles do Auth0 expostos via claim namespaced — 2026-09-18

**Decisão.** Roles `admin`, `operador`, `leitura` no Auth0; Action copia para `https://reconecta.com.br/roles`;
`beforeSessionSaved` normaliza para `user.roles`. Hierarquia: admin ⊃ operador ⊃ leitura.
**Consequências.** Zero infraestrutura extra. Mudança de papel vale no próximo login.

## ADR-004 · Management API via `fetch` direto, sem SDK `auth0` — 2026-09-18

**Decisão.** Cliente mínimo em `lib/auth0-management.ts`: token client-credentials com cache e oito endpoints REST.
**Consequências.** Contrato pequeno, sem surpresas de versão.

## ADR-005 · Convite por e-mail de redefinição de senha — 2026-09-18

**Decisão.** Criar usuário com senha aleatória forte e disparar o e-mail Change Password do Auth0.

## ADR-006 · Tailwind 4 com tokens em `@theme`, sem biblioteca de componentes — 2026-09-18

**Decisão.** Tokens em CSS e primitivos próprios em `components/ui`.
**Consequências.** Controle total do visual; mantemos os primitivos nós mesmos.

## ADR-007 · Design claro por padrão — 2026-09-18

**Decisão.** Superfícies brancas e `neve`, texto navy, movimento concentrado no anel do login.

## ADR-008 · Checkout próprio com a API de cobranças, não o Checkout hospedado do Asaas — 2026-09-18

**Contexto.** O Asaas tem um checkout pronto (`POST /v3/checkouts`), mas sem boleto, sem order bump, no domínio deles
e sem como instalar GTM com eventos por etapa. A missão pede GTM completo, order bump e a marca Reconecta.
**Decisão.** Checkout nosso (`/c/{codigo}`) usando `POST /v3/payments` + `pixQrCode` + `identificationField` +
webhooks. O checkout hospedado fica como referência.
**Consequências.** Controle total de UX e rastreamento. Dados de cartão passam pelo nosso servidor (sem armazenar) e
exigem HTTPS. Somos responsáveis pela validação e pela tela de pagamento.

## ADR-009 · Order bump vira uma única cobrança — 2026-09-18

**Contexto.** Dúvida entre uma ou duas transações quando o cliente aceita o bump.
**Decisão.** Uma cobrança com o valor total; itens registrados em `pedido_itens`; `externalReference` = id do pedido.
**Consequências.** Um Pix/boleto/transação para o cliente, uma conciliação por pedido, parcelamento sobre o total.
Reembolso parcial via painel do Asaas. Bump com recorrência própria, se surgir, será cobrança separada após o pagamento.
Detalhes em docs/08.

## ADR-010 · Drizzle ORM com PGlite em desenvolvimento e PostgreSQL em produção — 2026-09-18

**Contexto.** Precisamos de banco para produtos, links e pedidos; queremos rodar local sem instalar nada e produção
gerenciada.
**Decisão.** Drizzle (`pg-core`) com dois drivers pelo mesmo schema: PGlite (arquivo em `.data/`) sem `DATABASE_URL`,
`pg` com `DATABASE_URL`. Migrações geradas pelo drizzle-kit e aplicadas no boot.
**Consequências.** Mesmo SQL nos dois ambientes; onboarding de um comando. PGlite não serve para produção nem serverless.

## ADR-011 · Imagens de produto guardadas no banco — 2026-09-18

**Contexto.** Sem bucket configurado; sistema de arquivos do Railway é efêmero.
**Decisão.** `bytea` na tabela `imagens`, limite 2 MB, servidas por `/api/imagens/{id}` com cache imutável. URL externa
também aceita.
**Consequências.** Zero infraestrutura extra; entra no backup do Postgres. Migrar para bucket quando o volume crescer,
trocando só `lib/imagens.ts`.

## ADR-012 · Modo simulação do Asaas — 2026-09-18

**Contexto.** Sem chave do sandbox, precisávamos testar o checkout inteiro e permitir demonstrações.
**Decisão.** `ASAAS_ENV=simulacao` seleciona um cliente em memória com o mesmo contrato (`PortaAsaas`), QR Code real
gerado localmente e os cartões recusados do sandbox. "Simular pagamento" no painel reproduz o webhook.
**Consequências.** Fluxo testável de ponta a ponta sem rede. É o padrão do `.env.example`; produção exige `production`.

## ADR-013 · Eventos GTM via dataLayer com nomes do GA4 — 2026-09-18

**Decisão.** Nomes padrão (`view_item`, `begin_checkout`, `add_to_cart`, `generate_lead`, `add_payment_info`,
`purchase`) mais específicos (`pix_gerado`, `aguardando_pagamento`, `pagamento_recusado`, `pagamento_expirado`).
Disparo único por pedido controlado em `sessionStorage`; id do container configurável pelo painel.
**Consequências.** Tags de GA4 e Meta configuram-se sem código. `purchase` só no navegador; server-side fica para uma
próxima fase.

## ADR-014 · Papéis hierárquicos no painel — 2026-09-18

**Decisão.** `leitura` vê pedidos e painel; `operador` também cria produtos e links; `admin` exclui, gerencia usuários,
configurações e simula pagamentos.

## ADR-015 · Juros de parcelamento pela Tabela Price, calculados no servidor — 2026-09-18

**Decisão.** Cada link define parcelamento máximo, quantas parcelas são sem juros e a taxa mensal. Até o limite sem
juros, a parcela é o total dividido, arredondado para cima, e o comprador paga o preço à vista. Acima dele, a parcela
sai da Tabela Price e os juros vão para o comprador. A conta vive em `src/lib/parcelas.ts`, sem dependências, e o
servidor a refaz em `criarPedido` — o navegador só informa o número de parcelas.

**Por quê.** Tabela Price é a convenção do mercado brasileiro, então o número que aparece no checkout é o mesmo que a
pessoa veria em qualquer maquininha. Uma função só, compartilhada entre navegador e servidor, elimina a divergência de
centavos entre o que foi mostrado e o que foi cobrado. Recalcular no servidor impede que um valor adulterado no cliente
vire preço.

**Consequências.** Ao Asaas vai `installmentCount` mais `totalValue` já com juros, e ele distribui os centavos que
sobram entre as parcelas. No pedido, `valor_total_centavos` guarda a venda e `juros_centavos` o repasse, separados, de
modo que o relatório de produto não fica contaminado pelos juros. A taxa é armazenada em centésimos de por cento
(`299` = 2,99% ao mês) para não usar ponto flutuante no banco. Links antigos ficam com taxa zero e não mudam de
comportamento.

## Pendentes

- Hospedagem de produção (Railway, já conectado ao ambiente) e domínio.
- Split/subcontas Asaas: depende das condições da parceria.
- `purchase` server-side (Measurement Protocol / Conversions API) para vendas confirmadas com a aba fechada.
- E-mail transacional próprio (confirmação de compra) além das notificações do Asaas.
