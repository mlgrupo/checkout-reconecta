import { NextResponse } from "next/server";
import { z } from "zod";
import { lerCorpo, respostaErro } from "@/lib/api";
import { PAPEIS } from "@/lib/auth/roles";
import { exigirApi } from "@/lib/auth/session";
import { criarUsuario, listarUsuarios } from "@/lib/auth0-management";

export const dynamic = "force-dynamic";

/** GET /api/admin/users?q=&pagina=&porPagina= — lista usuários com papéis. */
export async function GET(req: Request) {
  const auth = await exigirApi("admin");
  if (auth.erro) return auth.erro;

  const url = new URL(req.url);
  try {
    const resultado = await listarUsuarios({
      q: url.searchParams.get("q") ?? undefined,
      pagina: Number(url.searchParams.get("pagina") ?? 0) || 0,
      porPagina: Number(url.searchParams.get("porPagina") ?? 25) || 25,
    });
    return NextResponse.json(resultado);
  } catch (e) {
    return respostaErro(e);
  }
}

const schemaCriacao = z.object({
  nome: z.string().trim().min(2, "Informe o nome completo.").max(120),
  email: z.email("Informe um e-mail válido.").trim().toLowerCase(),
  senha: z
    .string()
    .min(12, "A senha precisa ter pelo menos 12 caracteres.")
    .max(128)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  papeis: z.array(z.enum(PAPEIS)).default([]),
  convidar: z.boolean().default(true),
});

/** POST /api/admin/users — cria usuário, atribui papéis e (opcionalmente) envia convite. */
export async function POST(req: Request) {
  const auth = await exigirApi("admin");
  if (auth.erro) return auth.erro;

  const corpo = await lerCorpo(req, schemaCriacao);
  if (corpo.erro) return corpo.erro;

  try {
    const usuario = await criarUsuario(corpo.dados);
    return NextResponse.json({ usuario }, { status: 201 });
  } catch (e) {
    return respostaErro(e);
  }
}
