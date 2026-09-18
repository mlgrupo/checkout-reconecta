import { BANDEIRAS, BANDEIRAS_EXIBIDAS, iconeDaBandeira } from "@/lib/bandeiras";
import { cn } from "@/lib/utils";

/**
 * Faixa de bandeiras aceitas, abaixo do campo do número do cartão.
 * Ficam todas em cinza; assim que o número revela a bandeira, só ela ganha cor.
 */
export function BandeirasAceitas({ detectada, className }: { detectada?: string | null; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-1.5", className)} aria-label="Bandeiras aceitas">
      {BANDEIRAS_EXIBIDAS.map((id) => {
        const bandeira = BANDEIRAS.find((b) => b.id === id);
        if (!bandeira) return null;
        const colorida = detectada === id;
        const apagada = Boolean(detectada) && !colorida;
        return (
          <li key={id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={iconeDaBandeira(id)}
              alt={bandeira.nome}
              title={bandeira.nome}
              width={30}
              height={20}
              loading="lazy"
              className={cn(
                "h-5 w-auto transition-[filter,opacity] duration-200",
                colorida ? "opacity-100 [filter:none]" : apagada ? "opacity-25 grayscale" : "opacity-60 grayscale",
              )}
            />
          </li>
        );
      })}
    </ul>
  );
}
