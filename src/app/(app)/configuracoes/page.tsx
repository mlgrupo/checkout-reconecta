import type { Metadata } from "next";
import { FormularioConfiguracoes } from "@/components/configuracoes/formulario-configuracoes";
import { AcessoRestrito } from "@/components/shell/acesso-restrito";
import { CabecalhoPagina } from "@/components/shell/cabecalho-pagina";
import { modoDb } from "@/db";
import { ehAdmin } from "@/lib/auth/roles";
import { exigirUsuario } from "@/lib/auth/session";
import { obterConfiguracoes } from "@/lib/configuracoes";
import { env, prontidao } from "@/lib/env";

export const metadata: Metadata = { title: "Configurações" };
export const dynamic = "force-dynamic";

export default async function PaginaConfiguracoes() {
  const usuario = await exigirUsuario();
  if (!ehAdmin(usuario)) return <AcessoRestrito recurso="As configurações" />;
  const configuracoes = await obterConfiguracoes();

  return (
    <>
      <CabecalhoPagina titulo="Configurações" descricao="Rastreamento, dados da loja e conexão com o Asaas." />
      <FormularioConfiguracoes
        inicial={configuracoes}
        ambiente={{
          asaas: env.ASAAS_ENV,
          asaasChave: prontidao.asaasReal,
          webhookToken: prontidao.asaasWebhook,
          banco: modoDb(),
          baseUrl: env.APP_BASE_URL,
          gtmEnv: env.NEXT_PUBLIC_GTM_ID ?? "",
        }}
      />
    </>
  );
}
