import { Shell } from "@/components/shell/shell";
import { exigirUsuario } from "@/lib/auth/session";

/** Todas as rotas deste grupo exigem sessão. */
export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuario();
  return <Shell usuario={usuario}>{children}</Shell>;
}
