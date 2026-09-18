import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MolduraCheckout } from "@/components/checkout/moldura";
import { Pagamento } from "@/components/checkout/pagamento";
import { TemaCheckout } from "@/components/checkout/tema";
import { Gtm } from "@/components/gtm/gtm";
import { mesclarAparencia } from "@/lib/aparencia";
import { obterAparenciaLoja, obterConfiguracoes, obterGtmId } from "@/lib/configuracoes";
import { obterCheckoutPublico } from "@/lib/links";
import { obterPedidoPublico } from "@/lib/pedidos/consultas";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pagamento", robots: { index: false } };

export default async function PaginaPagamento({ params }: { params: Promise<{ codigo: string; id: string }> }) {
  const { codigo, id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [pedido, gtmId, config, checkout] = await Promise.all([
    obterPedidoPublico(id, { sincronizar: true }),
    obterGtmId(),
    obterConfiguracoes(),
    obterCheckoutPublico(codigo),
  ]);
  if (!pedido) notFound();
  const aparencia = checkout?.aparencia ?? mesclarAparencia(await obterAparenciaLoja(), null);

  return (
    <>
      <Gtm id={gtmId} />
      <TemaCheckout aparencia={aparencia}>
        <MolduraCheckout nomeLoja={config.nome_loja} emailSuporte={config.email_suporte} whatsappSuporte={config.whatsapp_suporte}>
          <Pagamento inicial={pedido} codigo={codigo} />
        </MolduraCheckout>
      </TemaCheckout>
    </>
  );
}
