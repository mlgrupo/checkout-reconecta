import { cn } from "@/lib/utils";

/**
 * Selo "Serviços financeiros Asaas" (versão negativa, branca) usado sempre por link,
 * conforme orientação do Asaas. Por ser branco, vive sobre fundo marinho.
 */
export const URL_SELO_ASAAS =
  "https://baas.asaas.com/selos/Servicos_financeiros_Asaas-Reduzida-Negativo-Branco.svg?id=b5178165-2587-492e-9a38-6d6479117ded";

export function SeloAsaas({ altura = 28, className }: { altura?: number; className?: string }) {
  // Proporção do SVG oficial: 188 x 69.
  return (
    <span
      className={cn("inline-flex shrink-0 items-center rounded-chip bg-marinho", className)}
      style={{ height: altura + 12, paddingInline: Math.round(altura * 0.45) }}
      title="Serviços financeiros Asaas"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={URL_SELO_ASAAS} alt="Serviços financeiros Asaas" style={{ height: altura, width: "auto" }} loading="lazy" />
    </span>
  );
}
