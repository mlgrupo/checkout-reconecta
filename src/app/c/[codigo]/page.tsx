import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Checkout } from "@/components/checkout/checkout";
import { MolduraCheckout } from "@/components/checkout/moldura";
import { TemaCheckout } from "@/components/checkout/tema";
import { Gtm } from "@/components/gtm/gtm";
import { obterConfiguracoes, obterGtmId } from "@/lib/configuracoes";
import { obterCheckoutPublico } from "@/lib/links";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ codigo: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { codigo } = await params;
  const checkout = await obterCheckoutPublico(codigo);
  if (!checkout) return { title: "Link indisponível" };
  return {
    title: `${checkout.produto.nome}`,
    description: checkout.produto.descricao ?? `Pague ${checkout.produto.nome} com Pix, cartão ou boleto.`,
    robots: { index: false },
  };
}

export default async function PaginaCheckout({ params }: Props) {
  const { codigo } = await params;
  const [checkout, gtmId, config] = await Promise.all([obterCheckoutPublico(codigo), obterGtmId(), obterConfiguracoes()]);
  if (!checkout) notFound();

  return (
    <>
      <Gtm id={gtmId} />
      <TemaCheckout aparencia={checkout.aparencia}>
        <MolduraCheckout
          nomeLoja={config.nome_loja}
          emailSuporte={config.email_suporte}
          whatsappSuporte={config.whatsapp_suporte}
          rodapeEscuro={checkout.aparencia.modelo === "unico"}
        >
          <Checkout checkout={checkout} />
        </MolduraCheckout>
      </TemaCheckout>
    </>
  );
}
