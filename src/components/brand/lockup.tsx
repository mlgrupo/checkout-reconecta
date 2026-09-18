import { SeloAsaas } from "@/components/brand/selo-asaas";
import { cn } from "@/lib/utils";

type Props = {
  /** `completa` mostra Reconecta e o selo Asaas; `simples` só a Reconecta. */
  variante?: "completa" | "simples";
  altura?: number;
  className?: string;
};

/**
 * Lockup de co-branding. A logo da Reconecta fica em public/brand/reconecta.svg (substitua o
 * placeholder mantendo o nome). O selo do Asaas é sempre carregado pela URL oficial.
 * Regras de uso em docs/07-marca-e-logos.md.
 */
export function MarcaParceria({ variante = "completa", altura = 28, className }: Props) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/reconecta.svg" alt="Reconecta" style={{ height: altura }} className="w-auto" />
      {variante === "completa" && (
        <>
          <span aria-hidden className="h-6 w-px bg-gelo" />
          <SeloAsaas altura={Math.round(altura * 0.7)} />
        </>
      )}
    </div>
  );
}
