import { redirect } from "next/navigation";
import { obterUsuario } from "@/lib/auth/session";

export default async function Raiz() {
  const usuario = await obterUsuario();
  redirect(usuario ? "/painel" : "/entrar");
}
