import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type PropsCampo = {
  rotulo: string;
  htmlFor?: string;
  dica?: ReactNode;
  erro?: string | null;
  opcional?: boolean;
  children: ReactNode;
  className?: string;
};

/** Rótulo + controle + dica/erro. O rótulo fica acima, sem caixa alta. */
export function Campo({ rotulo, htmlFor, dica, erro, opcional, children, className }: PropsCampo) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-marinho">
        {rotulo}
        {opcional && <span className="ml-1.5 font-normal text-marinho-3">opcional</span>}
      </label>
      {children}
      {erro ? (
        <p className="text-[13px] text-bordo" role="alert">
          {erro}
        </p>
      ) : dica ? (
        <p className="text-[13px] text-marinho-3">{dica}</p>
      ) : null}
    </div>
  );
}

const controle =
  "w-full h-10 rounded-control border border-gelo bg-branco px-3 text-sm text-marinho placeholder:text-marinho-3 transition-[border-color,box-shadow] duration-150 hover:border-azul-medio focus:border-azul focus:shadow-glow focus:outline-none disabled:bg-gelo-2 disabled:text-marinho-3 disabled:cursor-not-allowed aria-[invalid=true]:border-bordo";

export function Entrada({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controle, className)} {...props} />;
}

export function Selecao({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(controle, "appearance-none pr-9", className)} {...props}>
        {children}
      </select>
      <svg
        aria-hidden
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-marinho-3"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
}

type PropsInterruptor = {
  ativo: boolean;
  onChange: (valor: boolean) => void;
  rotulo: string;
  descricao?: string;
  tom?: "azul" | "bordo";
  disabled?: boolean;
};

/** Interruptor acessível (role=switch). Usa bordô quando a ação é restritiva. */
export function Interruptor({ ativo, onChange, rotulo, descricao, tom = "azul", disabled }: PropsInterruptor) {
  const corAtivo = tom === "bordo" ? "bg-bordo" : "bg-azul";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ativo}
      disabled={disabled}
      onClick={() => onChange(!ativo)}
      className="flex w-full items-center justify-between gap-4 rounded-panel border border-gelo bg-branco px-4 py-3 text-left transition-colors hover:border-azul-medio disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="flex flex-col">
        <span className="text-sm font-medium text-marinho">{rotulo}</span>
        {descricao && <span className="text-[13px] text-marinho-3">{descricao}</span>}
      </span>
      <span
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-chip transition-colors",
          ativo ? corAtivo : "bg-gelo",
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 h-5 w-5 rounded-chip bg-branco shadow-sm transition-transform",
            ativo ? "translate-x-5" : "translate-x-0",
          )}
        />
      </span>
    </button>
  );
}
