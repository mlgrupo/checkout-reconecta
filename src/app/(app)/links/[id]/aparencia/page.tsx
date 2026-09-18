import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EditorAparencia } from "@/components/aparencia/editor-aparencia";
import { AcessoRestrito } from "@/components/shell/acesso-restrito";
import { CabecalhoPagina } from "@/components/shell/cabecalho-pagina";
import { lerAparencia, mesclarAparencia } from "@/lib/aparencia";
import { exigirUsuario, podeAtuarComo } from "@/lib/auth/session";
import { obterAparenciaLoja } from "@/lib/configuracoes";
import { obterCheckoutPublico, obterLink } from "@/lib/links";

export const metadata: Metadata = { title: "Aparência do link" };
export const dynamic = "force-dynamic";

export default async function PaginaAparenciaDoLink({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirUsuario();
  if (!podeAtuarComo(usuario, "operador")) return <AcessoRestrito recurso="A personalização de checkout" />;

  const { id } = await params;
  const link = await obterLink(id);
  if (!link) notFound();

  const loja = mesclarAparencia(await obterAparenciaLoja(), null);
  const doLink = lerAparencia(link.aparencia);
  const efetiva = mesclarAparencia(loja, doLink);
  const base = await obterCheckoutPublico(link.codigo);
  if (!base) {
    return (
      <>
        <CabecalhoPagina titulo="Aparência do link" />
        <p className="text-[15px] text-marinho-2">
          Este link está inativo ou o produto foi desativado, então não dá para montar a prévia. Reative em{" "}
          <Link href="/links" className="text-azul hover:underline">
            Links de checkout
          </Link>
          .
        </p>
      </>
    );
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Aparência do link"
        descricao="Ajustes só deste checkout. O que você não mexer continua seguindo o padrão da loja."
      />
      <EditorAparencia
        inicial={efetiva}
        destino={{ tipo: "link", id: link.id, nome: link.nome }}
        base={{ ...base, aparencia: efetiva }}
        personalizados={doLink ? Object.keys(doLink) : []}
      />
    </>
  );
}
