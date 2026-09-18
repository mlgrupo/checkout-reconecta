import { NextResponse } from "next/server";
import { z } from "zod";
import { lerCorpo, respostaErro } from "@/lib/api";
import { PAPEIS } from "@/lib/auth/roles";
import { exigirApi } from "@/lib/auth/session";
import { atualizarUsuarioLocal, excluirUsuarioLocal, obterUsuarioLocal } from "@/lib/usuarios-locais";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  nome: z.string().trim().min(2, "Informe o nome completo.").max(120).optional(),
  papel: z.enum(PAPEIS).optional(),
  ativo: z.boolean().optional(),
  senha: z.string().min(10, "Mínimo de 10 caracteres.").max(200).optional().or(z.literal("").transform(() => undefined)),
});

/** A própria pessoa não pode se rebaixar nem se desativar, para ninguém ficar sem administrador. */
function ehOProprio(sub: string, id: string) {
  return sub === `painel|${id}`;
}

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await exigirApi("admin");
  if (auth.erro) return auth.erro;
  const { id } = await params;
  const corpo = await lerCorpo(req, schema);
  if (corpo.erro) return corpo.erro;

  if (ehOProprio(auth.usuario.sub, id)) {
    if (corpo.dados.ativo === false) {
      return NextResponse.json({ erro: "Você não pode desativar o próprio acesso." }, { status: 400 });
    }
    if (corpo.dados.papel && corpo.dados.papel !== "admin") {
      return NextResponse.json({ erro: "Você não pode remover seu próprio papel de administrador." }, { status: 400 });
    }
  }

  try {
    const acesso = await atualizarUsuarioLocal(id, corpo.dados);
    return NextResponse.json({ acesso });
  } catch (e) {
    return respostaErro(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await exigirApi("admin");
  if (auth.erro) return auth.erro;
  const { id } = await params;
  if (ehOProprio(auth.usuario.sub, id)) {
    return NextResponse.json({ erro: "Você não pode excluir o próprio acesso." }, { status: 400 });
  }
  try {
    if (!(await obterUsuarioLocal(id))) return NextResponse.json({ erro: "Acesso não encontrado." }, { status: 404 });
    await excluirUsuarioLocal(id);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return respostaErro(e);
  }
}
