import type { Papel } from "@/lib/auth/roles";

/** Forma do usuário como a API /api/admin/users devolve ao cliente. */
export type UsuarioLista = {
  user_id: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  nickname?: string;
  picture?: string;
  blocked?: boolean;
  created_at?: string;
  last_login?: string;
  logins_count?: number;
  papeis: Papel[];
};

export type RespostaLista = {
  usuarios: UsuarioLista[];
  total: number;
  pagina: number;
  porPagina: number;
};

export type ErroApi = { erro: string; campos?: Record<string, string> };

/** Chama a API interna e converte erros em exceções com mensagem legível. */
export async function chamarApi<T>(entrada: string, init?: RequestInit): Promise<T> {
  const res = await fetch(entrada, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (res.status === 204) return undefined as T;
  const corpo = (await res.json().catch(() => ({}))) as Partial<ErroApi> & T;
  if (!res.ok) {
    const erro = new Error(corpo.erro || `Falha na requisição (${res.status}).`) as Error & {
      campos?: Record<string, string>;
    };
    erro.campos = corpo.campos;
    throw erro;
  }
  return corpo as T;
}
