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

## Checklist para receber a chave do sandbox

- [ ] `ASAAS_ENV=sandbox` e `ASAAS_API_KEY` no `.env`.
- [ ] Criar um pedido Pix pelo checkout e conferir a cobrança no painel do Asaas.
- [ ] Clicar em **Simular pagamento** no pedido e ver o status virar pago.
- [ ] Subir para uma URL pública (túnel ou Railway) e registrar o webhook.
- [ ] Repetir com boleto e cartão aprovado/recusado.

## Materiais recebidos

- Documentação de referência: <https://docs.asaas.com/reference/create-new-checkout> (checkout hospedado, não usado) e
  <https://docs.asaas.com/llms.txt> (índice completo).
- Selo oficial (sempre por link): ver docs/07.

Cole PDFs e condições comerciais em `docs/asaas/`.
