import { NextResponse } from "next/server";
import { z } from "zod";
import { lerCorpo, respostaErro } from "@/lib/api";
import { exigirApi } from "@/lib/auth/session";
import { obterConfiguracoes, salvarConfiguracoes } from "@/lib/configuracoes";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await exigirApi("admin");
  if (auth.erro) return auth.erro;
  try {
    return NextResponse.json({ configuracoes: await obterConfiguracoes() });
  } catch (e) {
    return respostaErro(e);
  }
}

const schema = z.object({
  gtm_id: z
    .string()
    .trim()
    .regex(/^(GTM-[A-Za-z0-9]{4,12})?$/, "Formato esperado: GTM-XXXXXXX (ou vazio para desativar).")
    .optional(),
  nome_loja: z.string().trim().max(80).optional(),
  email_suporte: z.string().trim().email("E-mail inválido.").or(z.literal("")).optional(),
  whatsapp_suporte: z.string().trim().max(20).optional(),
});

export async function PUT(req: Request) {
  const auth = await exigirApi("admin");
  if (auth.erro) return auth.erro;
  const corpo = await lerCorpo(req, schema);
  if (corpo.erro) return corpo.erro;
  try {
    await salvarConfiguracoes({ ...corpo.dados, gtm_id: corpo.dados.gtm_id?.toUpperCase() });
    return NextResponse.json({ configuracoes: await obterConfiguracoes() });
  } catch (e) {
    return respostaErro(e);
  }
}
