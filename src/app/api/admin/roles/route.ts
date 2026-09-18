import { NextResponse } from "next/server";
import { respostaErro } from "@/lib/api";
import { PAPEIS, PAPEL_INFO } from "@/lib/auth/roles";
import { exigirApi } from "@/lib/auth/session";
import { listarRoles } from "@/lib/auth0-management";

export const dynamic = "force-dynamic";

/** GET /api/admin/roles — papéis esperados pela plataforma e se existem no Auth0. */
export async function GET() {
  const auth = await exigirApi("admin");
  if (auth.erro) return auth.erro;
  try {
    const noAuth0 = await listarRoles();
    const papeis = PAPEIS.map((p) => ({
      nome: p,
      ...PAPEL_INFO[p],
      existeNoAuth0: noAuth0.some((r) => r.name === p),
    }));
    return NextResponse.json({ papeis });
  } catch (e) {
    return respostaErro(e);
  }
}
