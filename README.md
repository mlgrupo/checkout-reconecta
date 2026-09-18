# Checkout Reconecta

Plataforma de checkout da Reconecta construída sobre a infraestrutura de pagamentos do Asaas.

## Começando

```bash
pnpm install
cp .env.example .env    # preencha seguindo docs/04-autenticacao-auth0.md
pnpm dev                # http://localhost:3000
```

## Documentação

Tudo está em [`docs/`](docs/README.md): visão geral, arquitetura, design system, configuração do Auth0,
gestão de usuários, plano de integração com o Asaas, marca e registro de decisões.

## Scripts

| Comando | O que faz |
|---------|-----------|
| `pnpm dev` | Servidor de desenvolvimento |
| `pnpm build` / `pnpm start` | Build e servidor de produção |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Verificação de tipos |
