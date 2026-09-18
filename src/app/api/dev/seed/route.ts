import { NextResponse } from "next/server";
import { obterDb } from "@/db";
import { linksCheckout, produtos } from "@/db/schema";
import { urlPublicaDoLink } from "@/lib/links";

export const dynamic = "force-dynamic";

/**
 * POST /api/dev/seed — cria um produto, um order bump e um link de exemplo.
 * Só existe em desenvolvimento; em produção responde 404.
 */
export async function POST() {
  if (process.env.NODE_ENV === "production") return new NextResponse(null, { status: 404 });
  const db = await obterDb();

  const [principal] = await db
    .insert(produtos)
    .values({
      nome: "Mentoria Reconecta",
      slug: `mentoria-reconecta-${Date.now().toString(36)}`,
      descricao: "Oito encontros ao vivo para reconectar sua rotina com o que importa. Acesso imediato após o pagamento.",
      precoCentavos: 49700,
      imagemUrl: null,
    })
    .returning();
  const [bump] = await db
    .insert(produtos)
    .values({
      nome: "Workbook digital",
      slug: `workbook-digital-${Date.now().toString(36)}`,
      descricao: "Caderno de exercícios em PDF com os 30 rituais da mentoria.",
      precoCentavos: 9700,
    })
    .returning();
  const [link] = await db
    .insert(linksCheckout)
    .values({
      codigo: `exemplo-${Date.now().toString(36).slice(-5)}`,
      nome: "Link de exemplo",
      produtoId: principal.id,
      bumpProdutoId: bump.id,
      bumpPrecoCentavos: 4700,
      bumpTitulo: "Sim! Quero o Workbook por apenas R$ 47",
      bumpDescricao: "De R$ 97 por R$ 47 só nesta página. Os exercícios que acompanham cada encontro.",
      metodos: ["pix", "cartao", "boleto"],
      parcelasMax: 6,
    })
    .returning();

  return NextResponse.json({ produto: principal, bump, link, url: urlPublicaDoLink(link.codigo) }, { status: 201 });
}
