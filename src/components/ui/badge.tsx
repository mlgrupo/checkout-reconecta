import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tom = "azul" | "dourado" | "bordo" | "verde" | "ambar" | "neutro";

const tons: Record<Tom, string> = {
  azul: "bg-azul-claro text-azul-profundo",
  dourado: "bg-dourado-claro text-dourado-escuro",
  bordo: "bg-bordo-claro text-bordo",
  verde: "bg-verde-claro text-verde",
  ambar: "bg-ambar-claro text-ambar",
  neutro: "bg-gelo-2 text-marinho-2",
};

const pontos: Record<Tom, string> = {
  azul: "bg-azul",
  dourado: "bg-dourado",
  bordo: "bg-bordo",
  verde: "bg-verde",
  ambar: "bg-ambar",
  neutro: "bg-marinho-3",
};

export function Selo({
  tom = "neutro",
  ponto,
  children,
  className,
}: {
  tom?: Tom;
  ponto?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-chip px-2.5 py-0.5 text-[12px] font-medium leading-5",
        tons[tom],
        className,
      )}
    >
      {ponto && <span className={cn("h-1.5 w-1.5 rounded-chip", pontos[tom])} />}
      {children}
    </span>
  );
}
