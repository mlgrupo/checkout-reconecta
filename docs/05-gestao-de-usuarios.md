# 05 · Gestão de usuários

Tela `/usuarios`, visível apenas para administradores. As contas vivem no Auth0; a plataforma não guarda
senhas nem cópias dos usuários.

## O que a tela faz

| Ação | Como | O que acontece no Auth0 |
|------|------|-------------------------|
| Listar e buscar | Campo de busca por nome ou e-mail, paginação de 25 | `GET /api/v2/users` com `q` em sintaxe Lucene + membros de cada role |
| Criar com convite | Novo usuário → papéis → "Criar e enviar convite" | Cria a conta com senha aleatória e dispara o e-mail de redefinição |
| Criar com senha | Desligue "Enviar convite" e informe uma senha (mín. 12) | Cria a conta com a senha informada |
| Editar nome e papéis | Editar → altera → "Salvar alterações" | `PATCH` no usuário + atribui/remove roles conforme a diferença |
| Bloquear / desbloquear | Interruptor "Bloquear acesso" | `blocked: true/false` (a conta continua existindo) |
| Redefinir senha | Botão na gaveta de edição ou em "Minha conta" | E-mail Change Password pela Authentication API |
| Excluir | "Excluir este usuário" → "Confirmar exclusão" | `DELETE` definitivo |

## Regras de proteção

- Um administrador não pode bloquear, excluir ou remover o próprio papel `admin` (bloqueado na UI e na API).
- Só os papéis conhecidos (`admin`, `operador`, `leitura`) são aceitos; qualquer outro é ignorado.
- Todos os endpoints exigem sessão com papel `admin`, exceto `POST /api/conta/redefinir-senha` (qualquer usuário logado, só para o próprio e-mail).

## Status na listagem

| Selo | Condição |
|------|----------|
| Ativo | `blocked` falso e pelo menos um login |
| Convite pendente | `blocked` falso e `logins_count` = 0 |
| Bloqueado | `blocked` verdadeiro |

## API interna

Todas respondem JSON. Erros vêm como `{ "erro": "mensagem", "campos"?: { campo: "mensagem" } }`.

```
GET    /api/admin/users?q=&pagina=0&porPagina=25
POST   /api/admin/users              { nome, email, senha?, papeis[], convidar }
GET    /api/admin/users/:id
PATCH  /api/admin/users/:id          { nome?, bloqueado?, papeis? }
DELETE /api/admin/users/:id
POST   /api/admin/users/:id/redefinir-senha
GET    /api/admin/roles
POST   /api/conta/redefinir-senha
```

## Endpoints do Auth0 usados

`src/lib/auth0-management.ts`

| Chamada | Endpoint |
|---------|----------|
| Token M2M | `POST /oauth/token` (client_credentials, audience `/api/v2/`) |
| Listar usuários | `GET /api/v2/users?include_totals=true&search_engine=v3&sort=created_at:-1` |
| Usuário | `GET /api/v2/users/{id}` · `POST /api/v2/users` · `PATCH /api/v2/users/{id}` · `DELETE /api/v2/users/{id}` |
| Papéis do usuário | `GET /api/v2/users/{id}/roles` · `POST` · `DELETE` |
| Roles | `GET /api/v2/roles` · `GET /api/v2/roles/{id}/users` |
| Redefinição | `POST /dbconnections/change_password` (Authentication API, público) |

O token é cacheado em memória até um minuto antes de expirar. A lista de roles é cacheada por 5 minutos.

## Limites conhecidos

- A busca usa `name`, `email` e `nickname` com curinga; o Auth0 pode levar alguns segundos para indexar usuários recém-criados.
- Os papéis da listagem vêm de `GET /roles/{id}/users` (uma chamada por role, paginada de 100). Com milhares de usuários, vale trocar por `app_metadata` sincronizado por Action.
- Rate limit da Management API no plano gratuito: ~2 req/s. A tela agrupa chamadas, mas listas grandes podem sentir.
