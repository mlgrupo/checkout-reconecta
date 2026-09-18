import { NextResponse } from "next/server";
import { lerCorpo, respostaErro } from "@/lib/api";
import { APARENCIA_PADRAO, mesclarAparencia, schemaAparencia, type Aparencia } from "@/lib/aparencia";
import { exigirApi } from "@/lib/auth/session";
import { obterAparenciaLoja, salvarAparenciaLoja } from "@/lib/configuracoes";

export const dynamic = "force-dynamic";

/** GET /api/admin/aparencia — aparência padrão da loja, já resolvida. */
export async function GET() {
  const auth = await exigirApi("operador");
  if (auth.erro) return auth.erro;
  try {
    const salva = await obterAparenciaLoja();
    return NextResponse.json({ aparencia: mesclarAparencia(salva, null) });
  } catch (e) {
    return respostaErro(e);
  }
}

/** PUT /api/admin/aparencia — define a aparência padrão de todos os checkouts. */
export async function PUT(req: Request) {
  const auth = await exigirApi("admin");
  if (auth.erro) return auth.erro;
  const corpo = await lerCorpo(req, schemaAparencia);
  if (corpo.erro) return corpo.erro;
  try {
    const completa: Aparencia = { ...APARENCIA_PADRAO, ...(corpo.dados as Partial<Aparencia>) };
    await salvarAparenciaLoja(completa);
    return NextResponse.json({ aparencia: completa });
  } catch (e) {
    return respostaErro(e);
  }
}
