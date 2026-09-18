import type { Metadata } from "next";
import { EditorAparencia } from "@/components/aparencia/editor-aparencia";
import { AcessoRestrito } from "@/components/shell/acesso-restrito";
import { CabecalhoPagina } from "@/components/shell/cabecalho-pagina";
import { mesclarAparencia } from "@/lib/aparencia";
import { checkoutDeExemplo } from "@/lib/aparencia-exemplo";
import { exigirUsuario, podeAtuarComo } from "@/lib/auth/session";
import { obterAparenciaLoja } from "@/lib/configuracoes";

export const metadata: Metadata = { title: "Aparência do checkout" };
export const dynamic = "force-dynamic";

export default async function PaginaAparencia() {
  const usuario = await exigirUsuario();
  if (!podeAtuarComo(usuario, "admin")) return <AcessoRestrito recurso="A aparência padrão do checkout" />;

  const aparencia = mesclarAparencia(await obterAparenciaLoja(), null);
  const base = await checkoutDeExemplo(aparencia);

  return (
    <>
      <CabecalhoPagina
        titulo="Aparência do checkout"
        descricao="O padrão de todos os links. Cada link pode ajustar o que quiser sem perder o resto."
      />
      <EditorAparencia inicial={aparencia} destino={{ tipo: "loja" }} base={base} />
    </>
  );
}
