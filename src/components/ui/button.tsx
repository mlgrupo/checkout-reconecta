import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

type Variante = "primario" | "secundario" | "fantasma" | "perigo" | "dourado";
type Tamanho = "sm" | "md" | "lg";

const variantes: Record<Variante, string> = {
  primario:
    "bg-azul text-branco hover:bg-azul-escuro active:bg-azul-profundo focus-visible:shadow-glow disabled:bg-azul-medio",
  secundario:
    "bg-branco text-marinho border border-gelo hover:border-azul-medio hover:text-azul active:bg-gelo-2 disabled:text-marinho-3",
  fantasma: "bg-transparent text-marinho-2 hover:bg-gelo-2 hover:text-marinho active:bg-gelo",
  perigo:
    "bg-bordo text-branco hover:bg-bordo-escuro focus-visible:outline-bordo disabled:bg-bordo/50",
  dourado: "bg-dourado text-marinho hover:bg-dourado-escuro hover:text-branco",
};

const tamanhos: Record<Tamanho, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-5 text-[15px] gap-2.5",
};

const basico =
  "inline-flex items-center justify-center rounded-control font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow] duration-150 disabled:cursor-not-allowed select-none";

type Comum = {
  variante?: Variante;
  tamanho?: Tamanho;
  carregando?: boolean;
  icone?: ReactNode;
  className?: string;
  children?: ReactNode;
};

type PropsBotao = Comum & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type PropsLink = Comum & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export function Button(props: PropsBotao | PropsLink) {
  const { variante = "primario", tamanho = "md", carregando, icone, className, children, ...rest } = props;
  const classes = cn(basico, variantes[variante], tamanhos[tamanho], className);
  const conteudo = (
    <>
      {carregando ? <Spinner tamanho={16} /> : icone}
      {children}
    </>
  );

  if ("href" in rest && typeof rest.href === "string") {
    // Links de autenticação devem ser <a> puros: sem prefetch do Next.
    return (
      <a className={classes} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {conteudo}
      </a>
    );
  }

  const botao = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      type={botao.type ?? "button"}
      className={classes}
      disabled={botao.disabled || carregando}
      aria-busy={carregando || undefined}
      {...botao}
    >
      {conteudo}
    </button>
  );
}
