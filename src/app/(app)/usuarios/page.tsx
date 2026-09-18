import type { Metadata } from "next";
import { AcessoRestrito } from "@/components/shell/acesso-restrito";
import { GestorDeUsuarios } from "@/components/users/gestor-de-usuarios";
import { ehAdmin } from "@/lib/auth/roles";
import { exigirUsuario } from "@/lib/auth/session";
import { prontidao } from "@/lib/env";

export const metadata: Metadata = { title: "Usuários" };
export const dynamic = "force-dynamic";

export default async function PaginaUsuarios() {
  const usuario = await exigirUsuario();
  if (!ehAdmin(usuario)) return <AcessoRestrito recurso="A gestão de usuários" />;

  return <GestorDeUsuarios usuarioAtualId={usuario.sub} managementPronto={prontidao.auth0Management} />;
}
