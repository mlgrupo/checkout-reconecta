import type { Metadata } from "next";
import { GestorDeLinks } from "@/components/links/gestor-de-links";
import { AcessoRestrito } from "@/components/shell/acesso-restrito";
import { exigirUsuario, podeAtuarComo } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Links de checkout" };
export const dynamic = "force-dynamic";

export default async function PaginaLinks() {
  const usuario = await exigirUsuario();
  if (!podeAtuarComo(usuario, "operador")) return <AcessoRestrito recurso="A gestão de links" />;
  return <GestorDeLinks podeExcluir={podeAtuarComo(usuario, "admin")} />;
}
