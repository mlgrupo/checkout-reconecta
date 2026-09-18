import type { CSSProperties, ReactNode } from "react";
import type { Aparencia } from "@/lib/aparencia";
import { escalaDaCor, TOKENS_ESCUROS } from "@/lib/cores";
import { acharFonte, urlDaFonte } from "@/lib/fontes";
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
  const fonte = acharFonte(aparencia.tipografia.fonte);
  const variaveis: Record<string, string> = {
    ...escalaDaCor(aparencia.corPrincipal, aparencia.fundo),
    ...(escuro ? TOKENS_ESCUROS : {}),
  };
  // Títulos usam --font-display; o corpo herda o font-family deste contêiner.
  if (fonte.id !== "sistema") {
    variaveis["--font-display"] = fonte.familia;
    variaveis.fontFamily = fonte.familia;
  }

  const folhaDaFonte = urlDaFonte(fonte.id);

  return (
    <div
      className={cn("tema-checkout", escuro && "tema-escuro", className)}
      style={variaveis as CSSProperties}
      data-fundo={aparencia.fundo}
    >
      {/* O React leva esta folha para o <head> e não repete se já existir. */}
      {folhaDaFonte && <link rel="stylesheet" href={folhaDaFonte} precedence="default" />}
      {children}
    </div>
  );
}
