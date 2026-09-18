# 01 · Visão geral

## O que é

O Checkout Reconecta é a plataforma pela qual a Reconecta vende e recebe: links de checkout com a identidade
Reconecta, processamento de Pix, boleto e cartão pelo Asaas, order bump para aumentar o ticket, eventos para o
Google Tag Manager e um painel interno para a equipe operar tudo isso.

A parceria com o Asaas aparece na marca (selo oficial) e na infraestrutura: o Asaas é o provedor de pagamentos,
cobranças, conciliação e webhooks. Nós construímos a experiência por cima.

## Missão do MVP

1. **Gerar um link para um produto** — cadastro de produtos com foto e links de checkout com URL própria.
2. **Order bump** — oferecer um segundo produto no checkout; ao aceitar, a oferta some e tudo vira uma cobrança só.
3. **GTM completo** — `begin_checkout`, dados preenchidos, Pix gerado, aguardando, pago e os demais eventos.
4. **Tudo funcional** — Pix, boleto e cartão de ponta a ponta, com webhook e conciliação.

## Para quem

| Público | Onde vive | Precisa de |
|---------|-----------|------------|
| Equipe Reconecta (admin, operação, financeiro) | Painel interno autenticado | Login seguro, papéis, produtos, links, pedidos, configurações. |
| Clientes finais | Páginas públicas `/c/{codigo}` | Pagar rápido, com confiança, em qualquer dispositivo. |

## Estado por fase

| Fase | Estado |
|------|--------|
| 1. Fundação e acesso (design system, Auth0, usuários) | entregue |
| 2. Produtos, links e order bump | entregue |
| 3. Checkout público com Pix, boleto e cartão + página do pedido | entregue (testado em simulação) |
| 4. Asaas: cobranças, webhook, sincronização, simulação no painel | entregue (aguardando chave do sandbox) |
| 5. GTM com eventos por etapa | entregue |
| 6. Painel de pedidos e métricas | entregue |
| 7. Produção: Postgres, Railway, domínio, logo oficial | pendente (docs/10) |

## Princípios

- **Segurança primeiro.** Senhas nunca passam pelo nosso servidor (Auth0). Chaves do Asaas ficam só no servidor. Cartão
  passa e não fica.
- **Uma identidade visual.** Painel e checkout usam o mesmo design system (docs/03).
- **Documentar junto com o código.** Toda decisão relevante entra em `docs/DECISOES.md`.
- **Português no produto.** Interface, mensagens e documentação em pt-BR.

## O que ainda precisamos receber

- [ ] Chave de API do sandbox do Asaas (e depois a de produção).
- [ ] Logo oficial da Reconecta em SVG (o emblema foi enviado; ver docs/07 para salvar).
- [ ] Tenant Auth0 com as credenciais (docs/04).
- [ ] Domínio de produção.
- [ ] Container do GTM.
