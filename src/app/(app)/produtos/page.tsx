import type { Metadata } from "next";
import { GestorDeProdutos } from "@/components/produtos/gestor-de-produtos";
import { exigirUsuario, podeAtuarComo } from "@/lib/auth/session";
import { AcessoRestrito } from "@/components/shell/acesso-restrito";

export const metadata: Metadata = { title: "Produtos" };
export const dynamic = "force-dynamic";

export default async function PaginaProdutos() {
  const usuario = await exigirUsuario();
  if (!podeAtuarComo(usuario, "operador")) return <AcessoRestrito recurso="O cadastro de produtos" />;
  return <GestorDeProdutos podeExcluir={podeAtuarComo(usuario, "admin")} />;
}
