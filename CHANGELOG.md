# Changelog

Todas as mudanças relevantes do Checkout Reconecta. Formato baseado em Keep a Changelog.

## [0.2.1] — 2026-09-18

### Adicionado

- `ASAAS_WEBHOOK_BASE_URL` para apontar o webhook a uma URL pública diferente de `APP_BASE_URL` (túnel ou host separado).
- `ASAAS_SANDBOX_PAYER_API_KEY`: com uma conta pagadora do sandbox, "Simular pagamento" de Pix paga o QR Code de verdade e o webhook real do Asaas chega.
- `ASAAS_CREDENTIALS_ENC_KEY` aceita e reservada para subcontas (não usada ainda).
- `railway.json` (build, start e healthcheck) e endpoint `/api/saude`; aviso no boot quando produção roda sem Postgres.
- Configurações mostram a URL efetiva do webhook e a conta pagadora.

## [0.2.0] — 2026-09-18

### Adicionado

- Banco de dados com Drizzle ORM: PGlite local sem configuração e PostgreSQL em produção; migrações aplicadas no boot.
- Produtos: cadastro com nome, valor, descrição e imagem (upload guardado no banco ou URL).
- Links de checkout: URL própria (`/c/{codigo}`), meios de pagamento, parcelamento, redirecionamento pós-pagamento e order bump com preço especial e textos.
- Checkout público: dados do cliente com validação de CPF/CNPJ, Pix, boleto e cartão (à vista ou parcelado), order bump que some ao ser aceito e vira item do pedido.
- Página do pedido: QR Code Pix com copia e cola e contador, boleto com linha digitável e PDF, confirmação de cartão, sucesso, recusa e expiração; atualiza sozinha.
- Integração Asaas: clientes, cobranças, QR Code, linha digitável, sincronização, webhook autenticado e idempotente, registro do webhook pelo painel, confirmação no sandbox.
- Modo simulação do Asaas para rodar tudo sem chave, com botão "Simular pagamento" no painel.
- Pedidos no painel: lista com busca e filtro por status, detalhe com itens, cliente, origem (UTM), dados do Asaas e linha do tempo.
- Google Tag Manager: instalação pelo painel e eventos `view_item`, `begin_checkout`, `add_to_cart`, `remove_from_cart`, `generate_lead`, `checkout_dados_completos`, `add_payment_info`, `pix_gerado`, `boleto_gerado`, `cartao_enviado`, `aguardando_pagamento`, `purchase`, `pagamento_recusado`, `pagamento_expirado`.
- Configurações: GTM, nome da loja, suporte, situação do ambiente e do webhook.
- Painel com vendas do dia, últimos 30 dias, conversão, pedidos aguardando e últimos pedidos.
- Selo oficial do Asaas carregado por link sobre fundo marinho; hierarquia de papéis (admin ⊃ operador ⊃ leitura).
- Documentação: 06 (Asaas), 08 (checkout e order bump), 09 (GTM), 10 (banco e deploy) e ADRs 008 a 014.

### Corrigido

- Tela de entrada: anel responsivo e sem sobreposição com o texto; grid sem overflow em telas estreitas.

## [0.1.0] — 2026-09-18

### Adicionado

- Projeto Next.js 16 + TypeScript + Tailwind 4 com estrutura `src/`.
- Design system em `globals.css` (branco, azul, dourado, bordô) com fontes Sora e IBM Plex.
- Autenticação com Auth0 (`@auth0/nextjs-auth0` v4): login, logout, sessão, papéis via claim.
- Tela de entrada `/entrar` com lockup de co-branding e anel animado.
- Shell do painel (barra lateral, topo, menu mobile) e páginas `/painel`, `/usuarios`, `/conta`.
- Gestão de usuários completa via Management API: listar, buscar, criar com convite, editar papéis, bloquear, redefinir senha, excluir.
- API interna em `/api/admin/*` e `/api/conta/*` com validação Zod e proteção por papel.
- Documentação inicial em `docs/`.
