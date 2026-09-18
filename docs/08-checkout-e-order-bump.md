# 08 · Checkout e order bump

## O que existe

| Peça | URL | O que faz |
|------|-----|-----------|
| Página de checkout | `/c/{codigo}` | Produto, dados do cliente, meio de pagamento, order bump, botão de pagar. |
| Página do pedido | `/c/{codigo}/pedido/{id}` | QR Code Pix ou boleto, confirmação de cartão, sucesso, recusa ou expiração. Atualiza sozinha. |
| Criação do pedido | `POST /api/checkout/{codigo}/pedidos` | Valida, grava o pedido, cria cliente e cobrança no Asaas. |
| Status público | `GET /api/pedidos/{id}` | Consultado a cada 4 s pela página do pedido; sincroniza com o Asaas se preciso. |
| Webhook | `POST /api/asaas/webhook` | Recebe os eventos do Asaas e atualiza o pedido. |

O `id` do pedido é um UUID aleatório e funciona como chave de acesso à própria página: quem tem o link vê o pedido.
Nenhum dado sensível além de nome, e-mail e itens é exposto.

## Fluxo

```
cliente abre /c/{codigo}
  → preenche nome, e-mail, CPF/CNPJ, celular
  → escolhe Pix, cartão ou boleto
  → (aceita ou não o order bump)
  → clica em pagar
POST /api/checkout/{codigo}/pedidos
  1. valida tudo (CPF/CNPJ com dígitos verificadores, e-mail, celular, cartão com Luhn e validade)
  2. grava pedido + itens + evento "criado"
  3. Asaas: busca cliente por CPF/CNPJ (ou cria)
  4. Asaas: cria UMA cobrança com o valor total
  5. Pix: busca QR Code · Boleto: busca linha digitável · Cartão: resultado imediato
  6. grava tudo no pedido e responde
navega para /c/{codigo}/pedido/{id}
  → Pix/boleto: mostra instruções e consulta o status a cada 4 s
  → Cartão: já mostra confirmado, recusado ou em análise
webhook do Asaas (ou a consulta periódica) marca o pedido como pago
  → a página troca para "Pagamento confirmado" e dispara `purchase` no GTM
```

## Order bump: uma cobrança só

**Decisão.** Produto principal e order bump viram **uma única cobrança no Asaas** com o valor somado.
Os dois itens ficam registrados em `pedido_itens` para relatório, conciliação e GTM.

**Por quê.**

- O cliente paga uma vez: um QR Code, um boleto ou uma transação no cartão. Não existe o cenário "pagou o produto e esqueceu o bump" nem dois boletos para explicar.
- A conciliação é por pedido: o `externalReference` da cobrança é o id do pedido, e a descrição lista os dois itens ("Pedido #12: Mentoria + Workbook").
- Taxa do Asaas cobrada uma vez, e parcelamento no cartão sobre o total.
- Reembolso parcial (só do bump) continua possível pelo painel do Asaas, pois o valor de cada item está no pedido.

**Alternativa descartada: duas cobranças.** Traria dois Pix para pagar, dois status para acompanhar, dois webhooks para
sincronizar e a chance real de o cliente pagar só uma delas. Foi considerada e rejeitada. Se um dia o bump precisar de
recorrência própria (assinatura), aí sim será uma cobrança separada, criada depois do pagamento principal.

**Comportamento na tela.** A oferta aparece como um cartão dourado com caixa de seleção antes do botão de pagar.
Ao aceitar, o cartão some e o item entra no resumo com o link "remover". O botão passa a mostrar o novo total.
Eventos `add_to_cart` e `remove_from_cart` são enviados ao GTM em cada troca.

**Configuração.** No link de checkout: produto do bump, preço especial (opcional, mostra o preço original riscado),
chamada e texto de apoio. Sem preço especial, vale o preço do produto.

## Status do pedido

| Status | Quando | Final? |
|--------|--------|--------|
| `aguardando` | Cobrança criada, sem pagamento ainda | não |
| `em_analise` | Cartão em análise de risco no Asaas | não |
| `pago` | `PAYMENT_CONFIRMED` ou `PAYMENT_RECEIVED` (ou cartão aprovado na hora) | sim |
| `recusado` | Cartão recusado na criação ou pelo antifraude | sim |
| `expirado` | `PAYMENT_OVERDUE` (boleto vencido / Pix expirado) | sim |
| `cancelado` | Cobrança removida no Asaas ou falha ao criar | sim |
| `estornado` | Reembolso ou chargeback | sim |

Regras: um pedido `pago` só muda para `estornado` ou `cancelado`; eventos atrasados do Asaas nunca o devolvem para
`aguardando`. Todo evento fica na linha do tempo do pedido (painel → Pedidos → clique no pedido).

## Sem webhook (localhost)

Enquanto o Asaas não consegue chamar sua URL, o status ainda funciona: `GET /api/pedidos/{id}` consulta o Asaas quando
o pedido não é final e a última sincronização tem mais de 10 s. Em produção o webhook é o caminho principal e a consulta
periódica é só rede de segurança.

## Cartão: o que passa pelo nosso servidor

O Asaas não oferece SDK de tokenização no navegador; os dados do cartão são enviados via HTTPS ao nosso servidor e
repassados imediatamente ao Asaas. **Nunca** são gravados nem logados: o pedido guarda só bandeira e últimos 4 dígitos
devolvidos pelo Asaas. Exigências do Asaas atendidas: `remoteIp` do pagador, dados do titular (CPF, CEP, número,
telefone), timeout de 70 s.

Em produção use sempre HTTPS. O Asaas bloqueia contas que capturam cartão sem SSL.

## UTM e origem

A página captura `utm_*`, `gclid`, `fbclid`, `ttclid`, `src` e `sck` da URL e grava no pedido junto com IP e user agent.
Aparecem no detalhe do pedido e servem para atribuição no GTM.

## Testar sem o Asaas

Com `ASAAS_ENV=simulacao` (padrão do `.env.example`) o checkout funciona sem chave: cobranças fictícias, QR Code real
gerado localmente, cartões recusados `5184019740373151` e `4916561358240741` (os mesmos do sandbox). No painel, o
botão **Simular pagamento** do pedido reproduz um webhook `PAYMENT_RECEIVED`.

Em desenvolvimento, `POST /api/dev/seed` cria um produto, um bump e um link de exemplo.
