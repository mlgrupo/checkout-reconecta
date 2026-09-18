import "server-only";
import { env, prontidao } from "@/lib/env";
import { ehPapel, type Papel } from "@/lib/auth/roles";

/**
 * Cliente mínimo para a Auth0 Management API v2 (fetch + cache de token).
 * Optamos por não depender do SDK `auth0` para manter o contrato explícito e enxuto.
 * Endpoints usados estão listados em docs/05-gestao-de-usuarios.md.
 */

export class ErroManagement extends Error {
  constructor(
    public status: number,
    message: string,
    public detalhe?: unknown,
  ) {
    super(message);
    this.name = "ErroManagement";
  }
}

export type UsuarioAuth0 = {
  user_id: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  nickname?: string;
  picture?: string;
  blocked?: boolean;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
  logins_count?: number;
  identities?: { connection: string; provider: string; user_id: string; isSocial: boolean }[];
};

export type RoleAuth0 = { id: string; name: string; description?: string };

export type UsuarioComPapeis = UsuarioAuth0 & { papeis: Papel[] };

type TokenCache = { token: string; expiraEm: number };
let cache: TokenCache | null = null;

function baseUrl() {
  if (!env.AUTH0_DOMAIN) throw new ErroManagement(500, "AUTH0_DOMAIN não configurado.");
  return `https://${env.AUTH0_DOMAIN}`;
}

async function obterToken(): Promise<string> {
  if (!prontidao.auth0Management) {
    throw new ErroManagement(
      503,
      "Gestão de usuários indisponível: configure AUTH0_MGMT_CLIENT_ID e AUTH0_MGMT_CLIENT_SECRET.",
    );
  }
  const agora = Date.now();
  if (cache && cache.expiraEm - 60_000 > agora) return cache.token;

  const res = await fetch(`${baseUrl()}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: env.AUTH0_MGMT_CLIENT_ID,
      client_secret: env.AUTH0_MGMT_CLIENT_SECRET,
      audience: `${baseUrl()}/api/v2/`,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const corpo = await res.text();
    throw new ErroManagement(res.status, "Falha ao obter token da Management API.", corpo);
  }
  const dados = (await res.json()) as { access_token: string; expires_in: number };
  cache = { token: dados.access_token, expiraEm: agora + dados.expires_in * 1000 };
  return cache.token;
}

async function chamar<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  const token = await obterToken();
  const res = await fetch(`${baseUrl()}/api/v2${caminho}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  if (res.status === 204) return undefined as T;
  const texto = await res.text();
  const corpo = texto ? (JSON.parse(texto) as unknown) : undefined;
  if (!res.ok) {
    const msg =
      (corpo && typeof corpo === "object" && "message" in corpo && typeof corpo.message === "string"
        ? corpo.message
        : null) ?? `Management API respondeu ${res.status}.`;
    throw new ErroManagement(res.status, msg, corpo);
  }
  return corpo as T;
}

/** Escapa valor para a sintaxe Lucene do parâmetro `q`. */
function escaparLucene(valor: string) {
  return valor.replace(/([+\-!(){}[\]^"~*?:\\/]|&&|\|\|)/g, "\\$1");
}

function senhaAleatoria() {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
}

// ── Roles ────────────────────────────────────────────────────

let rolesCache: { lista: RoleAuth0[]; expiraEm: number } | null = null;

export async function listarRoles(): Promise<RoleAuth0[]> {
  if (rolesCache && rolesCache.expiraEm > Date.now()) return rolesCache.lista;
  const lista = await chamar<RoleAuth0[]>("/roles?per_page=50");
  rolesCache = { lista, expiraEm: Date.now() + 5 * 60_000 };
  return lista;
}

async function mapaDeRoles(): Promise<Record<Papel, RoleAuth0 | undefined>> {
  const lista = await listarRoles();
  return {
    admin: lista.find((r) => r.name === "admin"),
    operador: lista.find((r) => r.name === "operador"),
    leitura: lista.find((r) => r.name === "leitura"),
  };
}

/** user_id → papéis, consultando os membros de cada role (custo constante por role). */
async function papeisPorUsuario(): Promise<Map<string, Papel[]>> {
  const roles = (await listarRoles()).filter((r) => ehPapel(r.name));
  const mapa = new Map<string, Papel[]>();
  await Promise.all(
    roles.map(async (role) => {
      let pagina = 0;
      for (;;) {
        const membros = await chamar<{ user_id: string }[]>(
          `/roles/${encodeURIComponent(role.id)}/users?per_page=100&page=${pagina}`,
        );
        for (const m of membros) {
          const atual = mapa.get(m.user_id) ?? [];
          if (ehPapel(role.name)) atual.push(role.name);
          mapa.set(m.user_id, atual);
        }
        if (membros.length < 100) break;
        pagina += 1;
      }
    }),
  );
  return mapa;
}

// ── Usuários ─────────────────────────────────────────────────

export async function listarUsuarios(opts: { q?: string; pagina?: number; porPagina?: number }) {
  const pagina = Math.max(0, opts.pagina ?? 0);
  const porPagina = Math.min(100, Math.max(1, opts.porPagina ?? 25));
  const params = new URLSearchParams({
    page: String(pagina),
    per_page: String(porPagina),
    include_totals: "true",
    search_engine: "v3",
    sort: "created_at:-1",
  });
  const termo = opts.q?.trim();
  if (termo) {
    const t = escaparLucene(termo);
    params.set("q", `(name:*${t}* OR email:*${t}* OR nickname:*${t}*)`);
  }
  const [resposta, papeis] = await Promise.all([
    chamar<{ users: UsuarioAuth0[]; total: number; start: number; limit: number }>(`/users?${params}`),
    papeisPorUsuario(),
  ]);
  const usuarios: UsuarioComPapeis[] = resposta.users.map((u) => ({
    ...u,
    papeis: papeis.get(u.user_id) ?? [],
  }));
  return { usuarios, total: resposta.total, pagina, porPagina };
}

export async function obterUsuarioAuth0(id: string): Promise<UsuarioComPapeis> {
  const [usuario, roles] = await Promise.all([
    chamar<UsuarioAuth0>(`/users/${encodeURIComponent(id)}`),
    chamar<RoleAuth0[]>(`/users/${encodeURIComponent(id)}/roles`),
  ]);
  return { ...usuario, papeis: roles.map((r) => r.name).filter(ehPapel) };
}

export async function criarUsuario(dados: {
  nome: string;
  email: string;
  senha?: string;
  papeis: Papel[];
  convidar: boolean;
}): Promise<UsuarioComPapeis> {
  const criado = await chamar<UsuarioAuth0>("/users", {
    method: "POST",
    body: JSON.stringify({
      connection: env.AUTH0_CONNECTION,
      email: dados.email,
      name: dados.nome,
      password: dados.senha || senhaAleatoria(),
      email_verified: false,
      verify_email: false,
    }),
  });
  if (dados.papeis.length) await definirPapeis(criado.user_id, dados.papeis, []);
  if (dados.convidar) await enviarRedefinicaoDeSenha(dados.email);
  return { ...criado, papeis: dados.papeis };
}

export async function atualizarUsuario(
  id: string,
  patch: { nome?: string; bloqueado?: boolean },
): Promise<UsuarioAuth0> {
  const corpo: Record<string, unknown> = {};
  if (typeof patch.nome === "string") corpo.name = patch.nome;
  if (typeof patch.bloqueado === "boolean") corpo.blocked = patch.bloqueado;
  if (!Object.keys(corpo).length) return chamar<UsuarioAuth0>(`/users/${encodeURIComponent(id)}`);
  return chamar<UsuarioAuth0>(`/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(corpo),
  });
}

export async function excluirUsuario(id: string): Promise<void> {
  await chamar<void>(`/users/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/** Ajusta os papéis do usuário para exatamente `desejados` (atribui e remove o necessário). */
export async function definirPapeis(id: string, desejados: Papel[], atuais: Papel[]): Promise<void> {
  const mapa = await mapaDeRoles();
  const faltando = desejados.filter((p) => !atuais.includes(p));
  const sobrando = atuais.filter((p) => !desejados.includes(p));

  const ids = (lista: Papel[]) =>
    lista.map((p) => {
      const role = mapa[p];
      if (!role) {
        throw new ErroManagement(
          500,
          `A role "${p}" não existe no Auth0. Crie-a em User Management → Roles (ver docs/04).`,
        );
      }
      return role.id;
    });

  if (faltando.length) {
    await chamar<void>(`/users/${encodeURIComponent(id)}/roles`, {
      method: "POST",
      body: JSON.stringify({ roles: ids(faltando) }),
    });
  }
  if (sobrando.length) {
    await chamar<void>(`/users/${encodeURIComponent(id)}/roles`, {
      method: "DELETE",
      body: JSON.stringify({ roles: ids(sobrando) }),
    });
  }
}

/**
 * Dispara o e-mail de redefinição de senha pela Authentication API (endpoint público).
 * Serve tanto para convite inicial quanto para "esqueci a senha" iniciado pelo admin.
 */
export async function enviarRedefinicaoDeSenha(email: string): Promise<void> {
  const res = await fetch(`${baseUrl()}/dbconnections/change_password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: env.AUTH0_CLIENT_ID,
      email,
      connection: env.AUTH0_CONNECTION,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new ErroManagement(res.status, "Falha ao enviar e-mail de redefinição de senha.", await res.text());
  }
}
