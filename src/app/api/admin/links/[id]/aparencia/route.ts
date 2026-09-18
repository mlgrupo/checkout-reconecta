import { NextResponse } from "next/server";
import { lerCorpo, respostaErro } from "@/lib/api";
import {
  APARENCIA_PADRAO,
  diferencaDoPadrao,
  lerAparencia,
  mesclarAparencia,
  schemaAparencia,
  type Aparencia,
} from "@/lib/aparencia";
import { exigirApi } from "@/lib/auth/session";
import { obterAparenciaLoja } from "@/lib/configuracoes";
import { obterLink, salvarAparenciaDoLink } from "@/lib/links";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** GET — aparência efetiva do link, o padrão da loja e quais campos estão personalizados. */
export async function GET(_req: Request, { params }: Ctx) {
  const auth = await exigirApi("operador");
  if (auth.erro) return auth.erro;
  const { id } = await params;
  try {
    const link = await obterLink(id);
    if (!link) return NextResponse.json({ erro: "Link não encontrado." }, { status: 404 });
    const loja = mesclarAparencia(await obterAparenciaLoja(), null);
    const doLink = lerAparencia(link.aparencia);
    return NextResponse.json({
      aparencia: mesclarAparencia(loja, doLink),
      padraoDaLoja: loja,
      personalizados: doLink ? Object.keys(doLink) : [],
      link: { id: link.id, nome: link.nome, codigo: link.codigo },
    });
  } catch (e) {
    return respostaErro(e);
  }
}

/**
 * PUT — salva a personalização do link. Guardamos só o que difere do padrão da loja,
 * então o link continua herdando o resto quando o padrão mudar.
 */
export async function PUT(req: Request, { params }: Ctx) {
  const auth = await exigirApi("operador");
  if (auth.erro) return auth.erro;
  const { id } = await params;
  const corpo = await lerCorpo(req, schemaAparencia);
  if (corpo.erro) return corpo.erro;
  try {
    const loja = mesclarAparencia(await obterAparenciaLoja(), null);
    const escolhida: Aparencia = { ...APARENCIA_PADRAO, ...loja, ...(corpo.dados as Partial<Aparencia>) };
    const parcial = diferencaDoPadrao(loja, escolhida);
    await salvarAparenciaDoLink(id, parcial);
    return NextResponse.json({ aparencia: escolhida, personalizados: Object.keys(parcial) });
  } catch (e) {
    return respostaErro(e);
  }
}

/** DELETE — volta o link a herdar tudo da loja. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await exigirApi("operador");
  if (auth.erro) return auth.erro;
  const { id } = await params;
  try {
    await salvarAparenciaDoLink(id, null);
    const loja = mesclarAparencia(await obterAparenciaLoja(), null);
    return NextResponse.json({ aparencia: loja, personalizados: [] });
  } catch (e) {
    return respostaErro(e);
  }
}
