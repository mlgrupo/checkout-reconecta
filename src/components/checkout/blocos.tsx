"use client";

import { useEffect, useState } from "react";
import { IconeEscudo, IconeRelogio } from "@/components/ui/icons";
import type { Aparencia, Depoimento } from "@/lib/aparencia";

/**
 * Blocos opcionais do checkout, ligados no editor: cronômetro, depoimentos e selo de garantia.
 */

function Estrelas({ nota }: { nota: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${nota} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width="13" height="13" viewBox="0 0 24 24" aria-hidden className={n <= nota ? "text-dourado" : "text-gelo"}>
          <path
            fill="currentColor"
            d="M12 2.8l2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.2l6.1-.8L12 2.8z"
          />
        </svg>
      ))}
    </span>
  );
}

/**
 * Contagem regressiva de escassez. O prazo fica no sessionStorage por link,
 * então recarregar a página não devolve o tempo cheio.
 */
export function Cronometro({ minutos, texto, chave }: { minutos: number; texto: string; chave: string }) {
  const [restante, setRestante] = useState<number | null>(null);

  useEffect(() => {
    const id = `checkout:prazo:${chave}`;
    let fim: number;
    try {
      const salvo = Number(sessionStorage.getItem(id));
      fim = salvo && salvo > Date.now() ? salvo : Date.now() + minutos * 60_000;
      sessionStorage.setItem(id, String(fim));
    } catch {
      fim = Date.now() + minutos * 60_000;
    }
    const tick = () => setRestante(Math.max(0, fim - Date.now()));
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, [minutos, chave]);

  if (restante === null) return null;
  const mm = String(Math.floor(restante / 60_000)).padStart(2, "0");
  const ss = String(Math.floor((restante % 60_000) / 1000)).padStart(2, "0");
  const acabou = restante === 0;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 rounded-panel border border-dourado/40 bg-dourado-claro/50 px-4 py-2.5 text-[13px] font-medium text-dourado-escuro"
    >
      <IconeRelogio tamanho={16} />
      {acabou ? (
        <span>O tempo acabou, mas você ainda pode concluir o pedido.</span>
      ) : (
        <span>
          {texto} <span className="font-mono text-[15px] tabular-nums">{mm}:{ss}</span>
        </span>
      )}
    </div>
  );
}

export function Depoimentos({ itens }: { itens: Depoimento[] }) {
  if (!itens.length) return null;
  return (
    <section className="rounded-card border border-gelo bg-branco p-5 shadow-card">
      <h2 className="text-[15px] font-semibold">Quem já comprou</h2>
      <ul className="mt-4 flex flex-col gap-4">
        {itens.map((d, i) => (
          <li key={i} className="border-l-2 border-gelo pl-4">
            <Estrelas nota={d.nota} />
            <p className="mt-1.5 text-[14px] leading-relaxed text-marinho-2">{d.texto}</p>
            <p className="mt-1 text-[13px] font-medium text-marinho">{d.nome}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Garantia({ dias, texto }: { dias: number; texto: string }) {
  return (
    <section className="flex items-start gap-3 rounded-card border border-gelo bg-branco p-5 shadow-card">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-chip bg-verde-claro text-verde">
        <IconeEscudo tamanho={20} />
      </span>
      <div>
        <p className="text-[15px] font-semibold text-marinho">
          Garantia de {dias} {dias === 1 ? "dia" : "dias"}
        </p>
        <p className="mt-0.5 text-[13px] text-marinho-2">{texto}</p>
      </div>
    </section>
  );
}

/** Banner do topo, quando o editor define uma imagem. */
export function BannerCheckout({ url }: { url: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="mb-5 w-full rounded-card border border-gelo object-cover shadow-card" />;
}

/** Título e subtítulo opcionais, acima do formulário. */
export function CabecalhoOferta({ aparencia }: { aparencia: Aparencia }) {
  if (!aparencia.titulo && !aparencia.subtitulo) return null;
  return (
    <header className="mb-5">
      {aparencia.titulo && <h1 className="text-2xl font-semibold leading-tight @xl:text-3xl">{aparencia.titulo}</h1>}
      {aparencia.subtitulo && <p className="mt-1.5 text-[15px] text-marinho-2">{aparencia.subtitulo}</p>}
    </header>
  );
}
