/** Chamada à API interna a partir do navegador, com erros legíveis e campos de validação. */

export type ErroApi = { erro: string; campos?: Record<string, string> };

export class ErroHttp extends Error {
  constructor(
    message: string,
    public status: number,
    public campos?: Record<string, string>,
  ) {
    super(message);
    this.name = "ErroHttp";
  }
}

export async function chamarApi<T>(entrada: string, init?: RequestInit): Promise<T> {
  const ehForm = init?.body instanceof FormData;
  const res = await fetch(entrada, {
    ...init,
    headers: { ...(ehForm ? {} : { "content-type": "application/json" }), ...(init?.headers ?? {}) },
  });
  if (res.status === 204) return undefined as T;
  const corpo = (await res.json().catch(() => ({}))) as Partial<ErroApi> & T;
  if (!res.ok) {
    throw new ErroHttp(corpo.erro || `Falha na requisição (${res.status}).`, res.status, corpo.campos);
  }
  return corpo as T;
}
