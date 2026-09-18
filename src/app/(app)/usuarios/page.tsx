import type { Metadata } from "next";
import { GestorDeAcessos } from "@/components/acessos/gestor-de-acessos";
import { AcessoRestrito } from "@/components/shell/acesso-restrito";
import { GestorDeUsuarios } from "@/components/users/gestor-de-usuarios";
import { ehAdmin } from "@/lib/auth/roles";
import { exigirUsuario } from "@/lib/auth/session";
import { acessoLocalDisponivel } from "@/lib/auth/sessao-local";
import { env, prontidao } from "@/lib/env";

export const metadata: Metadata = { title: "Acessos" };
export const dynamic = "force-dynamic";

/**
 * Com Auth0 configurado, quem manda nos usuários é a Management API.
 * Sem ele, a plataforma gerencia os próprios acessos, guardados no banco.
 */
export default async function PaginaUsuarios() {
  const usuario = await exigirUsuario();
  if (!ehAdmin(usuario)) return <AcessoRestrito recurso="A gestão de acessos" />;

  if (prontidao.auth0Management) {
    return <GestorDeUsuarios usuarioAtualId={usuario.sub} managementPronto />;
  }

  if (await acessoLocalDisponivel()) {
    return <GestorDeAcessos emailDoAmbiente={prontidao.adminLocal ? (env.ADMIN_EMAIL ?? null) : null} />;
  }

  return <GestorDeUsuarios usuarioAtualId={usuario.sub} managementPronto={false} />;
}
