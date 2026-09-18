import { NextResponse } from "next/server";
import { z } from "zod";
import { lerCorpo, respostaErro } from "@/lib/api";
import { PAPEIS } from "@/lib/auth/roles";
import { exigirApi } from "@/lib/auth/session";
import { atualizarUsuario, definirPapeis, excluirUsuario, obterUsuarioAuth0 } from "@/lib/auth0-management";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await exigirApi("admin");
  if (auth.erro) return auth.erro;
  const { id } = await params;
  try {
    return NextResponse.json({ usuario: await obterUsuarioAuth0(id) });
  } catch (e) {
    return respostaErro(e);
  }
}

const schemaAtualizacao = z.object({
  nome: z.string().trim().min(2, "Informe o nome completo.").max(120).optional(),
  bloqueado: z.boolean().optional(),
  papeis: z.array(z.enum(PAPEIS)).optional(),
});

/** PATCH /api/admin/users/:id — nome, bloqueio e papéis. */
export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await exigirApi("admin");
  if (auth.erro) return auth.erro;
  const { id } = await params;

  const corpo = await lerCorpo(req, schemaAtualizacao);
  if (corpo.erro) return corpo.erro;
  const { nome, bloqueado, papeis } = corpo.dados;

  const ehProprioUsuario = id === auth.usuario.sub;
  if (ehProprioUsuario && bloqueado === true) {
    return NextResponse.json({ erro: "Você não pode bloquear a própria conta." }, { status: 400 });
  }
  if (ehProprioUsuario && papeis && !papeis.includes("admin")) {
    return NextResponse.json({ erro: "Você não pode remover seu próprio papel de administrador." }, { status: 400 });
  }

  try {
    if (papeis) {
      const atual = await obterUsuarioAuth0(id);
      await definirPapeis(id, papeis, atual.papeis);
    }
    await atualizarUsuario(id, { nome, bloqueado });
    return NextResponse.json({ usuario: await obterUsuarioAuth0(id) });
  } catch (e) {
    return respostaErro(e);
  }
}

/** DELETE /api/admin/users/:id — exclusão definitiva no Auth0. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await exigirApi("admin");
  if (auth.erro) return auth.erro;
  const { id } = await params;

  if (id === auth.usuario.sub) {
    return NextResponse.json({ erro: "Você não pode excluir a própria conta." }, { status: 400 });
  }
  try {
    await excluirUsuario(id);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return respostaErro(e);
  }
}
