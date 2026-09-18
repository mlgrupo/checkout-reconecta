import type { Metadata } from "next";
import { GestorDePedidos } from "@/components/pedidos/gestor-de-pedidos";
import { exigirUsuario, podeAtuarComo } from "@/lib/auth/session";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Pedidos" };
export const dynamic = "force-dynamic";

export default async function PaginaPedidos() {
  const usuario = await exigirUsuario();
  return <GestorDePedidos podeSimular={podeAtuarComo(usuario, "admin") && env.ASAAS_ENV !== "production"} />;
}
