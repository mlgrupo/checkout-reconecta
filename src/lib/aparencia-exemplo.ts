import "server-only";
import { desc, eq } from "drizzle-orm";
import { obterDb } from "@/db";
import { produtos } from "@/db/schema";
import type { Aparencia } from "@/lib/aparencia";
import type { CheckoutPublico } from "@/lib/links";
import { urlImagemProduto } from "@/lib/produtos";

/**
 * Base de prévia para o editor do padrão da loja, quando não há um link específico.
 * Usa um produto real se existir, para a prévia parecer com a loja de verdade.
 */
export async function checkoutDeExemplo(aparencia: Aparencia): Promise<CheckoutPublico> {
  const db = await obterDb();
  const [produto] = await db.select().from(produtos).where(eq(produtos.ativo, true)).orderBy(desc(produtos.criadoEm)).limit(1);

  return {
    codigo: "previa",
    metodos: ["pix", "cartao", "boleto"],
    parcelasMax: 6,
    urlSucesso: null,
    aparencia,
    produto: produto
      ? {
          id: produto.id,
          nome: produto.nome,
          descricao: produto.descricao,
          precoCentavos: produto.precoCentavos,
          imagem: urlImagemProduto(produto),
        }
      : {
          id: "exemplo",
          nome: "Seu produto",
          descricao: "Assim que você cadastrar um produto, ele aparece aqui na prévia.",
          precoCentavos: 49700,
          imagem: null,
        },
    bump: null,
  };
}
