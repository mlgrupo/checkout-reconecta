# 06 · Integração com o Asaas

> Estado: **implementada e testada em modo simulação**. Falta a chave do sandbox para validar contra a API real.

## Ambientes

| `ASAAS_ENV` | O que acontece | Quando usar |
|-------------|----------------|-------------|
| `simulacao` | Nenhuma chamada ao Asaas. Cobranças fictícias em memória, QR Code gerado localmente, cartões de teste recusados. | Desenvolvimento e demonstração sem chave. |
| `sandbox` | API `https://api-sandbox.asaas.com/v3` com a chave do sandbox. Pagamentos podem ser confirmados manualmente. | Homologação. |
| `production` | API `https://api.asaas.com/v3` com a chave de produção. | Ao vivo. |

Chave do sandbox: crie a conta em <https://sandbox.asaas.com>, depois **Configurações → Integrações → API** e gere a chave.
Coloque em `ASAAS_API_KEY`.

## Variáveis

| Variável | Uso |
|----------|-----|
| `ASAAS_ENV` | `simulacao`, `sandbox` ou `production` (maiúsculas também aceitas). |
| `ASAAS_API_KEY` | Chave da conta recebedora (a da Reconecta) no ambiente escolhido. |
| `ASAAS_WEBHOOK_TOKEN` | Token que o Asaas devolve no header `asaas-access-token`. Gere um valor forte. |
| `ASAAS_WEBHOOK_BASE_URL` | URL pública que o Asaas chama, sem barra final. Vazio usa `APP_BASE_URL`. Use quando a app roda atrás de túnel ou em host diferente. |
| `ASAAS_SANDBOX_PAYER_API_KEY` | Opcional, só sandbox: chave de uma **segunda** conta sandbox (pagadora). Com ela, "Simular pagamento" de um Pix paga o QR Code de verdade (`POST /pix/qrCodes/pay`), o dinheiro entra na conta recebedora e o Asaas dispara o webhook real. Exige chave Pix cadastrada na conta recebedora e saldo na pagadora. Sem ela, usamos `POST /sandbox/payment/{id}/confirm`. |
| `ASAAS_CREDENTIALS_ENC_KEY` | Reservada para criptografar credenciais de subcontas quando houver split. Não é lida nesta fase. |

## Passo a passo no painel do Asaas

Onde encontrar cada valor. Os menus abaixo são os do painel do Asaas (sandbox e produção têm a mesma navegação).

### 1. Conta sandbox

<https://sandbox.asaas.com> → cadastre a conta. No sandbox os documentos são aprovados automaticamente e nenhum
valor real circula. Use a mesma razão social da conta de produção para os testes ficarem parecidos.

### 2. `ASAAS_API_KEY`

**Menu do usuário → Integrações → API** → *Gerar nova chave*.

- Só usuários administradores conseguem gerar.
- **A chave aparece uma única vez.** Copie na hora; não dá para recuperar depois.
- Sandbox e produção têm chaves diferentes. A do sandbox começa com `$aact_hmlg_`.
- Dá para nomear, definir validade, desativar e apagar chaves. Cada conta guarda até 10.

> **Armadilha do cifrão.** A chave do Asaas começa com `$`. Dentro de um arquivo `.env`, o carregador do Next
> (dotenv com expansão de variáveis) entende `$aact_hmlg_...` como o nome de uma variável, não encontra nada e
> **grava vazio, sem erro nenhum**. Aspas simples ou duplas não resolvem. A única forma que funciona é escapar
> cada cifrão com barra invertida:
>
> ```
> ASAAS_API_KEY=\$aact_hmlg_000MzkwODA2...
> ```
>
> Em painéis de variáveis (Railway, Vercel) cole o valor original, sem escapar: lá não passa por dotenv.
> Para conferir se a chave chegou, veja `asaasChave` em `/api/saude`.

### 3. `ASAAS_ENV`

Não vem do Asaas, é da nossa plataforma: `simulacao` (sem chave), `sandbox` ou `production`. Troque junto com a chave.

### 4. Chave Pix da conta recebedora

Não é variável de ambiente, mas é pré-requisito para o Pix funcionar direito.

**Sem chave Pix cadastrada, o QR Code gerado vale só até as 23:59 do mesmo dia.** Com chave, vale 12 meses após o
vencimento da cobrança.

- Painel: **Menu do usuário → Pix → Minhas chaves → Criar chave** (escolha *chave aleatória*).
- Ou pela API: `POST /v3/pix/addressKeys` com `{"type":"EVP"}`.
- Limites: 5 chaves para pessoa física, 20 para jurídica. Espere 1 minuto entre duas criações.
- A conta precisa estar aprovada para criar chave.

### 5. `ASAAS_WEBHOOK_TOKEN`

Este valor **você inventa** — é o segredo que o Asaas devolve no header `asaas-access-token` para provarmos que o
evento veio dele. Regras do Asaas: 32 a 255 caracteres, sem espaços, sem sequências óbvias e **nunca** a chave de API.

Gere um com `openssl rand -hex 24`. O mesmo valor vai no `.env`/Railway e no cadastro do webhook.

### 6. `ASAAS_WEBHOOK_BASE_URL` e o registro do webhook

A URL precisa ser pública. Em produção é o domínio do Railway; em desenvolvimento, um túnel.

O jeito mais rápido é pelo nosso painel: **Configurações → Registrar webhook no Asaas**. Ele cria o webhook já com a
URL certa, o token e todos os eventos.

Para fazer à mão: **Menu do usuário → Integrações → Webhooks → Criar Webhook**, com os campos:

| Campo | Valor |
|-------|-------|
| Nome | Checkout Reconecta |
| URL | `https://SEU-DOMINIO/api/asaas/webhook` |
| E-mail | quem recebe aviso se a fila parar |
| Versão da API | v3 |
| Token de autenticação | o mesmo `ASAAS_WEBHOOK_TOKEN` (há um botão *Gerar token*) |
| Habilitado | sim |
| Tipo de envio | sequencial |
| Eventos | os de cobrança (`PAYMENT_*`) |

Cada conta aceita até 10 webhooks com URLs diferentes.

### 7. `ASAAS_SANDBOX_PAYER_API_KEY` (opcional)

Para pagar um QR Code Pix de verdade no sandbox são necessárias **duas** contas: a recebedora (a nossa, com chave Pix
cadastrada) e uma **pagadora, com saldo**. Crie uma segunda conta em <https://sandbox.asaas.com>, gere a chave de API
dela (mesmo caminho do passo 2), adicione saldo de teste e coloque essa chave aqui.

Com ela preenchida, o botão **Simular pagamento** de um pedido Pix chama `POST /v3/pix/qrCodes/pay` na conta
pagadora: o dinheiro sai de lá, entra na nossa e o Asaas dispara o webhook real. Sem ela, usamos
`POST /v3/sandbox/payment/{id}/confirm`, que confirma a cobrança sem movimentar saldo.

### 8. `ASAAS_CREDENTIALS_ENC_KEY`

Não vem do Asaas. É uma chave nossa, reservada para criptografar credenciais de subcontas quando houver split.
Gere com `openssl rand -hex 32`.

## Por que checkout próprio e não o "Checkout Asaas"

O Asaas oferece um checkout hospedado (`POST /v3/checkouts`), mas ele:

- só aceita Pix e cartão (sem boleto);
- roda no domínio do Asaas, sem o nosso design e sem a possibilidade de instalar o GTM e disparar eventos por etapa;
- não tem order bump.

Por isso o checkout é nosso e usamos a API de cobranças. O documento de referência que nos foi passado
(`create-new-checkout`) serviu para confirmar esses limites. Ver `DECISOES.md` (ADR-008).

## Endpoints usados

`src/lib/asaas/cliente.ts` — header `access_token`, JSON, timeout 30 s (70 s para cartão).

| Uso | Endpoint |
|-----|----------|
| Buscar cliente por CPF/CNPJ | `GET /customers?cpfCnpj=` |
| Criar cliente | `POST /customers` (`notificationDisabled: true`, para o Asaas não mandar e-mails paralelos) |
| Criar cobrança | `POST /payments` com `billingType` PIX / BOLETO / CREDIT_CARD, `value`, `dueDate`, `description`, `externalReference` = id do pedido |
| Cartão | mesmo `POST /payments` com `creditCard`, `creditCardHolderInfo`, `remoteIp` e, se parcelado, `installmentCount` + `totalValue` |
| QR Code Pix | `GET /payments/{id}/pixQrCode` → `encodedImage`, `payload`, `expirationDate` |
| Linha digitável | `GET /payments/{id}/identificationField` |
| Consultar cobrança | `GET /payments/{id}` (sincronização quando não há webhook) |
| Confirmar no sandbox | `POST /sandbox/payment/{id}/confirm` (botão "Simular pagamento" no painel) |
| Webhooks | `GET /webhooks`, `POST /webhooks` (botão "Registrar webhook" no painel) |

Vencimentos: Pix vence no dia; boleto em 3 dias (`DIAS_VENCIMENTO_BOLETO` em `src/lib/pedidos/criar.ts`).

## Webhook

- URL: `{ASAAS_WEBHOOK_BASE_URL ou APP_BASE_URL}/api/asaas/webhook`. Precisa ser pública: o Asaas não alcança
  `localhost`. Em desenvolvimento use um túnel (`cloudflared tunnel --url http://localhost:3000` ou ngrok) e coloque a
  URL do túnel em `ASAAS_WEBHOOK_BASE_URL`; em homologação/produção, o deploy no Railway (docs/10).
- Autenticação: header `asaas-access-token` comparado com `ASAAS_WEBHOOK_TOKEN` (comparação em tempo constante).
- Idempotência: o `id` do evento é chave primária em `eventos_webhook`; repetições respondem `duplicado`.
- Resposta 200 assim que o evento é gravado e aplicado; erro interno responde 500 para o Asaas reenviar.
- Eventos assinados: todos os `PAYMENT_*` relevantes (lista em `src/app/api/admin/asaas/webhook/route.ts`), envio sequencial.
- Mapeamento de status em `src/lib/pedidos/status.ts` (`mapearStatusAsaas` e `statusPeloEvento`).

Registro: painel → Configurações → **Registrar webhook no Asaas** (precisa de URL pública e do token no `.env`).
O Asaas pausa a fila após 15 falhas consecutivas e guarda eventos por 14 dias; se isso acontecer, reative em
**Integrações → Webhooks** no painel do Asaas.

## Cartões de teste (sandbox e simulação)

| Resultado | Cartão |
|-----------|--------|
| Aprovado | Qualquer número válido (Luhn), validade futura, CVV de 3 dígitos. Ex.: `4111 1111 1111 1111` |
| Recusado (Mastercard) | `5184 0197 4037 3151` |
| Recusado (Visa) | `4916 5613 5824 0741` |

Na simulação, números terminados em `0000` também são recusados.

## Limites e cuidados

- Valor mínimo por cobrança: a plataforma exige R$ 5,00 por produto. Confirme o mínimo do Asaas para boleto na conta.
- Dados de cartão passam pelo servidor e vão direto ao Asaas; nada é gravado (docs/08).
- Os dados de cliente do Asaas são reaproveitados por CPF/CNPJ; nome e e-mail do pedido ficam no nosso banco.
- Split e subcontas não estão implementados: dependem das condições da parceria.

## Teste de ponta a ponta feito em 18/09/2026

Contra a conta sandbox real, com a plataforma rodando local e `ASAAS_ENV=sandbox`:

| Verificação | Resultado |
|-------------|-----------|
| Pix com order bump | Uma cobrança de R$ 544,00 com os dois itens registrados |
| QR Code | Veio do Asaas (`00020101021226820014br.gov.bcb.pix...`), com imagem e validade de 1 ano |
| Cobrança no Asaas | Encontrada pelo `externalReference` do pedido, tipo PIX, status PENDING |
| Confirmação no sandbox | `POST /sandbox/payment/{id}/confirm` → o pedido virou **pago** na plataforma |
| Boleto | Linha digitável real de 47 dígitos, vencimento em 3 dias, valor sem o bump |
| Cartão aprovado em 3x | Pago na hora, bandeira e últimos dígitos gravados |
| Cartão recusado | 402 com a mensagem do próprio Asaas |
| Dados inválidos | 400 apontando cada campo |

A validade de 1 ano do QR Code só apareceu depois de cadastrar a chave Pix; antes disso expirava no mesmo dia.

## Checklist para receber a chave do sandbox

- [x] `ASAAS_ENV=sandbox` e `ASAAS_API_KEY` configurados (lembrando de escapar o cifrão em arquivos `.env`).
- [x] Chave Pix cadastrada na conta recebedora.
- [x] Webhook registrado apontando para a URL pública.
- [x] Pedido Pix, boleto, cartão aprovado e cartão recusado testados de ponta a ponta.
- [ ] Repetir o teste com a URL pública recebendo o webhook de verdade (depende de um pedido criado em produção).

## Materiais recebidos

- Documentação de referência: <https://docs.asaas.com/reference/create-new-checkout> (checkout hospedado, não usado) e
  <https://docs.asaas.com/llms.txt> (índice completo).
- Selo oficial (sempre por link): ver docs/07.

Cole PDFs e condições comerciais em `docs/asaas/`.
