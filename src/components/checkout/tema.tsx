import type { CSSProperties, ReactNode } from "react";
import type { Aparencia } from "@/lib/aparencia";
import { escalaDaCor, TOKENS_ESCUROS } from "@/lib/cores";
import { cn } from "@/lib/utils";

/**
 * Aplica a aparência escolhida no editor sobrescrevendo os tokens do design system
 * dentro deste contêiner. Assim todo `bg-azul`, `bg-branco`, `text-marinho` e afins do
 * checkout seguem a cor e o fundo da loja, sem classes condicionais espalhadas.
 */
export function TemaCheckout({
  aparencia,
  children,
  className,
}: {
  aparencia: Aparencia;
  children: ReactNode;
  className?: string;
}) {
  const escuro = aparencia.fundo === "escuro";
  const variaveis = { ...escalaDaCor(aparencia.corPrincipal, aparencia.fundo), ...(escuro ? TOKENS_ESCUROS : {}) };

  return (
    <div
      className={cn("tema-checkout", escuro && "tema-escuro", className)}
      style={variaveis as CSSProperties}
      data-fundo={aparencia.fundo}
    >
      {children}
    </div>
  );
}
