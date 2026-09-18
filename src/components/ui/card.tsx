import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  titulo?: ReactNode;
  descricao?: ReactNode;
  acoes?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** Cantos dourados: use em no máximo um painel por tela. */
  destaque?: boolean;
  semPreenchimento?: boolean;
};

export function Painel({ titulo, descricao, acoes, children, className, destaque, semPreenchimento }: Props) {
  return (
    <section
      className={cn(
        "rounded-card border border-gelo bg-branco shadow-card",
        destaque && "colchetes",
        className,
      )}
    >
      {(titulo || acoes) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-gelo px-5 py-4">
          <div className="min-w-0">
            {titulo && <h2 className="text-[15px] font-semibold">{titulo}</h2>}
            {descricao && <p className="mt-0.5 text-[13px] text-marinho-2">{descricao}</p>}
          </div>
          {acoes && <div className="flex shrink-0 items-center gap-2">{acoes}</div>}
        </header>
      )}
      <div className={cn(!semPreenchimento && "p-5")}>{children}</div>
    </section>
  );
}

export function EstadoVazio({
  titulo,
  descricao,
  acao,
  icone,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  icone?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {icone && (
        <div className="flex h-12 w-12 items-center justify-center rounded-panel border border-gelo bg-neve text-azul">
          {icone}
        </div>
      )}
      <div>
        <p className="font-display text-[15px] font-semibold">{titulo}</p>
        {descricao && <p className="mt-1 max-w-sm text-[13px] text-marinho-2">{descricao}</p>}
      </div>
      {acao}
    </div>
  );
}
