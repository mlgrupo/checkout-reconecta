# 04 · Autenticação com Auth0

Passo a passo para deixar o login e a gestão de usuários funcionando. Tempo estimado: 20 minutos.

## 1. Tenant

1. Crie (ou use) um tenant em <https://manage.auth0.com>. Sugestão de nome: `reconecta-checkout` na região **br** ou **us**.
2. Anote o **Domain** (ex.: `reconecta-checkout.us.auth0.com`). Ele vai em `AUTH0_DOMAIN`.

## 2. Aplicação web (login)

1. **Applications → Applications → Create Application** → nome `Checkout Reconecta` → tipo **Regular Web Application**.
2. Em **Settings**, preencha:
   - **Allowed Callback URLs**: `http://localhost:3000/auth/callback` (e depois a URL de produção `https://SEU-DOMINIO/auth/callback`)
   - **Allowed Logout URLs**: `http://localhost:3000` (e a de produção)
   - **Allowed Web Origins**: `http://localhost:3000` (e a de produção)
3. Copie **Client ID** e **Client Secret** para `AUTH0_CLIENT_ID` e `AUTH0_CLIENT_SECRET`.
4. Gere o segredo do cookie de sessão e coloque em `AUTH0_SECRET`:

   ```bash
   openssl rand -hex 32
   # ou, no PowerShell:
   -join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })
   ```

5. Em **Authentication → Database**, confirme o nome da conexão (padrão `Username-Password-Authentication`). Se for outro, ajuste `AUTH0_CONNECTION`.
6. Ainda na conexão, em **Applications**, garanta que a aplicação `Checkout Reconecta` está habilitada.

> Recomendado: em **Authentication → Database → Username-Password-Authentication → Settings**, ative a opção **Disable Sign Ups**. Assim ninguém cria conta sozinho pelo Universal Login: só administradores criam usuários, pela tela de gestão.

## 3. Papéis (Roles)

Em **User Management → Roles → Create Role**, crie exatamente estes três nomes (minúsculos):

| Nome | Descrição sugerida |
|------|--------------------|
| `admin` | Acesso total: gerencia usuários, integrações e checkouts. |
| `operador` | Cria e acompanha checkouts e cobranças. |
| `leitura` | Visualiza painéis e relatórios. |

Atribua `admin` ao seu próprio usuário (**User Management → Users → seu usuário → Roles → Assign Roles**).

## 4. Action: adicionar papéis ao token

Sem isto a aplicação não sabe o papel de ninguém.

1. **Actions → Library → Create Action → Build from scratch**. Nome: `Adicionar papéis ao token`. Trigger: **Login / Post Login**.
2. Cole o código:

   ```js
   exports.onExecutePostLogin = async (event, api) => {
     const namespace = "https://reconecta.com.br/roles";
     const roles = (event.authorization && event.authorization.roles) || [];
     api.idToken.setCustomClaim(namespace, roles);
     api.accessToken.setCustomClaim(namespace, roles);
   };
   ```

3. **Deploy**.
4. **Actions → Triggers → post-login**: arraste a Action para o fluxo e clique em **Apply**.

Se mudar o namespace, mude também `AUTH0_ROLES_CLAIM` no `.env`.

## 5. Aplicação Machine to Machine (gestão de usuários)

A tela **Usuários** cria, edita, bloqueia e exclui contas pela Management API. Ela precisa de credenciais próprias.

1. **Applications → Create Application** → nome `Checkout Reconecta · Management` → tipo **Machine to Machine**.
2. Selecione a API **Auth0 Management API** e autorize os scopes:

   ```
   read:users  create:users  update:users  delete:users
   read:roles  read:role_members
   create:role_members  delete:role_members
   ```

3. Copie **Client ID** e **Client Secret** para `AUTH0_MGMT_CLIENT_ID` e `AUTH0_MGMT_CLIENT_SECRET`.

## 6. E-mails

O convite de novos usuários e a redefinição de senha usam o e-mail **Change Password** do Auth0.

- Em **Branding → Email Templates → Change Password**, personalize o texto e o remetente.
- Para produção, configure um provedor em **Branding → Email Provider** (o provedor padrão do Auth0 tem limites e não é para produção).
- Em **Branding → Universal Login**, aplique as cores da plataforma: primária `#0B3DFF`, fundo `#F5F8FF`, e a logo da Reconecta (ver docs/07).

## 7. Checklist final

- [ ] `.env` preenchido com `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET`.
- [ ] `AUTH0_MGMT_CLIENT_ID` e `AUTH0_MGMT_CLIENT_SECRET` preenchidos.
- [ ] Roles `admin`, `operador`, `leitura` criadas.
- [ ] Action de papéis publicada e no fluxo post-login.
- [ ] Seu usuário com a role `admin`.
- [ ] `pnpm dev` → `/entrar` → login → `/painel` mostra "Autenticação (Auth0): Pronto".

## Como o código usa isso

- `src/lib/auth0.ts` instancia o `Auth0Client` e, em `beforeSessionSaved`, copia o claim de papéis para `user.roles`, descartando claims desnecessários.
- `src/proxy.ts` monta as rotas `/auth/login`, `/auth/logout`, `/auth/callback`, `/auth/profile` e `/auth/access-token`.
- `src/lib/auth/session.ts` expõe `obterUsuario`, `exigirUsuario` (páginas) e `exigirApi` (route handlers).
- A sessão fica em cookie criptografado com `AUTH0_SECRET`; o SDK renova automaticamente.

## Problemas comuns

| Sintoma | Causa provável | Solução |
|---------|----------------|---------|
| `Callback URL mismatch` | URL não cadastrada | Adicione `APP_BASE_URL + /auth/callback` em Allowed Callback URLs. |
| Entrou, mas "Sem papel definido" | Action não aplicada ou role não atribuída | Verifique o trigger post-login e as roles do usuário; saia e entre de novo. |
| Tela de usuários diz "não conectada" | Faltam credenciais M2M | Preencha `AUTH0_MGMT_*` e reinicie o servidor. |
| `insufficient scope` ao criar usuário | Scopes faltando na M2M | Autorize os scopes da seção 5. |
| `A role "admin" não existe no Auth0` | Roles com nome diferente | Crie as roles com os nomes exatos da seção 3. |
