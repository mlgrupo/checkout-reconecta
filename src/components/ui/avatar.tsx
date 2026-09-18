import { cn, iniciais } from "@/lib/utils";

type Props = {
  nome?: string | null;
  email?: string | null;
  src?: string | null;
  tamanho?: "sm" | "md" | "lg";
  className?: string;
};

const tamanhos = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-[13px]",
  lg: "h-16 w-16 text-xl",
};

export function Avatar({ nome, email, src, tamanho = "md", className }: Props) {
  const rotulo = nome || email || "Usuário";
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-chip bg-azul-claro font-display font-semibold text-azul-profundo ring-1 ring-gelo",
        tamanhos[tamanho],
        className,
      )}
      aria-label={rotulo}
    >
      {src ? (
        // Fotos vêm de provedores externos (Gravatar, Google): <img> simples evita configurar domínios.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        iniciais(nome, email)
      )}
    </span>
  );
}
