import { NextResponse } from "next/server";
import { z } from "zod";
import { ipDaRequisicao, lerCorpo } from "@/lib/api";
import {
  COOKIE_ADMIN,
  credenciaisDoAmbiente,
  criarToken,
  DURACAO_SEGUNDOS,
  opcoesCookie,
  registrarAcesso,
} from "@/lib/auth/sessao-local";
import { autenticar } from "@/lib/usuarios-locais";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().trim().min(3, "Informe o e-mail."),
  senha: z.string().min(1, "Informe a senha."),
});

/** Freio simples contra força bruta: por IP, em memória. */
const TENTATIVAS_MAX = 8;
const JANELA_MS = 10 * 60 * 1000;
const tentativas = new Map<string, { contador: number; ate: number }>();

function bloqueado(ip: string) {
  const reg = tentativas.get(ip);
  if (!reg) return false;
  if (reg.ate < Date.now()) {
    tentativas.delete(ip);
    return false;
  }
  return reg.contador >= TENTATIVAS_MAX;
}

function registrarFalha(ip: string) {
  const agora = Date.now();
  const reg = tentativas.get(ip);
  if (!reg || reg.ate < agora) tentativas.set(ip, { contador: 1, ate: agora + JANELA_MS });
  else reg.contador += 1;
}

/** POST /api/auth/entrar — login sem Auth0: administrador do ambiente ou acesso do painel. */
export async function POST(req: Request) {
  const ip = ipDaRequisicao(req) ?? "desconhecido";
  if (bloqueado(ip)) {
    return NextResponse.json({ erro: "Muitas tentativas. Espere alguns minutos e tente de novo." }, { status: 429 });
  }

  const corpo = await lerCorpo(req, schema);
  if (corpo.erro) return corpo.erro;
  const { email, senha } = corpo.dados;

  // O administrador do ambiente vem primeiro: é a porta de entrada que não depende do banco.
  if (credenciaisDoAmbiente(email, senha)) {
    tentativas.delete(ip);
    const resposta = NextResponse.json({ ok: true });
    resposta.cookies.set(COOKIE_ADMIN, criarToken({ tipo: "ambiente", email: email.trim() }), opcoesCookie(DURACAO_SEGUNDOS));
    return resposta;
  }

  const usuario = await autenticar(email, senha).catch(() => null);
  if (usuario) {
    tentativas.delete(ip);
    await registrarAcesso(usuario.id).catch(() => {});
    const resposta = NextResponse.json({ ok: true });
    resposta.cookies.set(COOKIE_ADMIN, criarToken({ tipo: "painel", id: usuario.id }), opcoesCookie(DURACAO_SEGUNDOS));
    return resposta;
  }

  registrarFalha(ip);
  console.warn(`[auth] tentativa de login local malsucedida (ip ${ip}).`);
  return NextResponse.json({ erro: "E-mail ou senha incorretos." }, { status: 401 });
}
