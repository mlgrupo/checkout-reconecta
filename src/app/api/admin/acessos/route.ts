import { NextResponse } from "next/server";
import { z } from "zod";
import { lerCorpo, respostaErro } from "@/lib/api";
import { PAPEIS } from "@/lib/auth/roles";
import { exigirApi } from "@/lib/auth/session";
import { criarUsuarioLocal, listarUsuariosLocais } from "@/lib/usuarios-locais";

export const dynamic = "force-dynamic";

/** GET /api/admin/acessos — quem tem acesso ao painel sem Auth0. */
export async function GET() {
  const auth = await exigirApi("admin");
  if (auth.erro) return auth.erro;
  try {
    return NextResponse.json({ acessos: await listarUsuariosLocais() });
  } catch (e) {
    return respostaErro(e);
  }
}

export const schemaAcesso = z.object({
  nome: z.string().trim().min(2, "Informe o nome completo.").max(120),
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido."),
  senha: z.string().min(10, "Mínimo de 10 caracteres.").max(200),
  papel: z.enum(PAPEIS),
});

/** POST /api/admin/acessos — cria um acesso com senha definida agora. */
export async function POST(req: Request) {
  const auth = await exigirApi("admin");
  if (auth.erro) return auth.erro;
  const corpo = await lerCorpo(req, schemaAcesso);
  if (corpo.erro) return corpo.erro;
  try {
    const acesso = await criarUsuarioLocal(corpo.dados);
    return NextResponse.json({ acesso }, { status: 201 });
  } catch (e) {
    return respostaErro(e);
  }
}
