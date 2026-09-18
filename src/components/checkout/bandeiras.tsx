import { BANDEIRAS, BANDEIRAS_EXIBIDAS, iconeDaBandeira, type Bandeira } from "@/lib/bandeiras";
import { cn } from "@/lib/utils";

/** Selos das bandeiras aceitas, mostrados junto da opção de cartão. */
export function BandeirasAceitas({ ativa, className }: { ativa?: string | null; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {BANDEIRAS_EXIBIDAS.map((id) => {
        const bandeira = BANDEIRAS.find((b) => b.id === id);
        if (!bandeira) return null;
        const apagada = Boolean(ativa) && ativa !== id;
        return (
          <li key={id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={iconeDaBandeira(id)}
              alt={bandeira.nome}
              title={bandeira.nome}
              width={34}
              height={24}
              className={cn(
                "h-6 w-auto rounded-[4px] border border-gelo bg-branco transition-opacity",
                apagada ? "opacity-30" : "opacity-100",
              )}
              loading="lazy"
            />
          </li>
        );
      })}
    </ul>
  );
}

/** Bandeira detectada, exibida dentro do campo do número do cartão. */
export function BandeiraDetectada({ bandeira }: { bandeira: Bandeira | null }) {
  if (!bandeira) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={iconeDaBandeira(bandeira.id)}
      alt={bandeira.nome}
      title={bandeira.nome}
      width={34}
      height={24}
      className="pointer-events-none absolute right-2.5 top-1/2 h-6 w-auto -translate-y-1/2 animate-fade rounded-[4px] border border-gelo bg-branco"
    />
  );
}
