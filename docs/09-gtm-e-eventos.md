# 09 · Google Tag Manager e eventos

## Instalar

1. Crie o container no GTM (tipo Web) e copie o id `GTM-XXXXXXX`.
2. No painel → **Configurações → Google Tag Manager**, cole o id e salve. Alternativa: variável `NEXT_PUBLIC_GTM_ID`
   (o painel tem prioridade).
3. O container é injetado em todas as páginas públicas (`/c/...`). O painel interno não é rastreado.

## Eventos enviados ao dataLayer

Todos os eventos levam `plataforma: "checkout-reconecta"`. Os que têm objeto `ecommerce` seguem o formato do GA4
(`currency`, `value`, `items[]`, e `transaction_id` / `payment_type` quando fazem sentido). Antes de cada push com
`ecommerce` enviamos `{ ecommerce: null }`, como o Google recomenda.

| Evento | Quando dispara | Dados |
|--------|----------------|-------|
| `view_item` | A página de checkout carregou | ecommerce com o produto principal |
| `begin_checkout` | Primeiro foco em qualquer campo | ecommerce |
| `add_to_cart` | Cliente aceitou o order bump | ecommerce só com o bump |
| `remove_from_cart` | Cliente removeu o order bump | ecommerce só com o bump |
| `generate_lead` | Nome, e-mail, CPF/CNPJ e celular ficaram válidos (uma vez) | ecommerce, `email_informado: true` |
| `checkout_dados_completos` | Junto com `generate_lead` | `metodo` selecionado |
| `add_payment_info` | Clique em pagar com o formulário válido | ecommerce, `payment_type`, `parcelas` |
| `pix_gerado` | Página do pedido abriu com um Pix | ecommerce, `pedido` |
| `boleto_gerado` | Página do pedido abriu com um boleto | ecommerce, `pedido` |
| `cartao_enviado` | Página do pedido abriu após envio de cartão | ecommerce, `pedido` |
| `aguardando_pagamento` | Junto com os três acima, se ainda não pago | ecommerce, `pedido` |
| `purchase` | Pedido confirmado como pago (webhook ou consulta) | ecommerce com `transaction_id` = nº do pedido, `bump: true/false` |
| `pagamento_recusado` | Cartão recusado (no checkout ou pelo antifraude) | `metodo`, `motivo` |
| `pagamento_expirado` | Pix/boleto venceu sem pagamento | ecommerce |

`items[]` traz `item_id`, `item_name`, `price` (reais), `quantity` e `item_category` (`principal` ou `order_bump`).

### Garantias

- Cada evento de geração e o `purchase` disparam **uma vez por pedido**, mesmo que a pessoa recarregue a página
  (controle em `sessionStorage`).
- `purchase` dispara na página do pedido no momento em que o status vira `pago`, inclusive se a pessoa deixou a aba
  aberta esperando o Pix.
- Se a pessoa fechou a aba antes da confirmação, o `purchase` não é disparado no navegador. Para esse caso, use a
  conciliação pelo painel ou uma integração server-side (Measurement Protocol) numa próxima fase.

## Configuração sugerida no GTM

| Tag | Acionador | Observação |
|-----|-----------|------------|
| GA4 · Configuração | All Pages | |
| GA4 · Evento `begin_checkout` | Evento personalizado `begin_checkout` | marque "enviar dados de e-commerce" |
| GA4 · Evento `add_payment_info` | Evento personalizado `add_payment_info` | idem |
| GA4 · Evento `purchase` | Evento personalizado `purchase` | idem; `transaction_id` evita duplicidade |
| Meta Pixel · InitiateCheckout | `begin_checkout` | |
| Meta Pixel · Lead | `generate_lead` | |
| Meta Pixel · AddPaymentInfo | `add_payment_info` | |
| Meta Pixel · Purchase | `purchase` | valor em `ecommerce.value`, moeda BRL |

Eventos específicos (`pix_gerado`, `aguardando_pagamento`, `pagamento_recusado`) servem para remarketing de quem
gerou e não pagou.

## Como testar

1. GTM → **Visualizar** (Tag Assistant) apontando para a URL do checkout.
2. Em desenvolvimento, cada push aparece no console do navegador como `[gtm] nome-do-evento ...`.
3. Fluxo completo: abrir link → focar um campo (`begin_checkout`) → marcar bump (`add_to_cart`) → preencher dados
   (`generate_lead`) → pagar (`add_payment_info`) → página do pedido (`pix_gerado`, `aguardando_pagamento`) → simular
   pagamento no painel (`purchase`).

Código: `src/lib/gtm/eventos.ts` (helper) e `src/components/gtm/gtm.tsx` (instalação).
