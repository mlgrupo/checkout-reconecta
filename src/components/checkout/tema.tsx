import type { CSSProperties, ReactNode } from "react";
import type { Aparencia } from "@/lib/aparencia";
import { escalaDaCor } from "@/lib/cores";
import { cn } from "@/lib/utils";

/**
 * Aplica a cor escolhida no editor sobrescrevendo os tokens do design system
 * dentro deste contêiner. Assim todo `bg-azul`, `text-azul` e afins do checkout
 * passam a usar a cor da loja, sem precisar de classes condicionais.
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
  return (
    <div className={cn("tema-checkout", className)} style={escalaDaCor(aparencia.corPrincipal) as CSSProperties}>
      {children}
    </div>
  );
}
