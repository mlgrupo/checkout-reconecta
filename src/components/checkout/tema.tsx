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

  // Fundo livre: cor própria e imagem, com um véu na cor do tema para o texto continuar legível.
  const fp = aparencia.fundoPagina;
  if (fp.cor) variaveis["--color-neve"] = fp.cor;
  if (fp.imagemUrl) {
    const veu = Math.min(90, Math.max(0, fp.veu)) / 100;
    const tinta = escuro ? "13 16 23" : "255 255 255";
    const camadaVeu = veu > 0 ? `linear-gradient(rgb(${tinta} / ${veu}), rgb(${tinta} / ${veu})), ` : "";
    variaveis["--fundo-imagem"] = `${camadaVeu}url("${fp.imagemUrl.replace(/"/g, "%22")}")`;
    variaveis["--fundo-tamanho"] = fp.imagemEstilo === "cobrir" ? "cover" : fp.imagemEstilo === "topo" ? "100% auto" : "auto";
    variaveis["--fundo-repeticao"] = fp.imagemEstilo === "repetir" ? "repeat" : "no-repeat";
    variaveis["--fundo-posicao"] = fp.imagemEstilo === "topo" ? "top center" : "center";
    variaveis["--fundo-fixacao"] = fp.imagemEstilo === "cobrir" ? "fixed" : "scroll";
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
