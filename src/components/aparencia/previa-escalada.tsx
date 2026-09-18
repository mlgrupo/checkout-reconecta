"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Mostra o conteúdo na largura real do dispositivo e reduz visualmente para caber na coluna.
 * Como o checkout usa container queries, renderizar na largura certa faz a prévia
 * bater com o que o cliente vê, em vez de espremer o layout de computador.
 *
 * O conteúdo escalado fica centralizado: `transform` não muda o espaço ocupado no
 * layout, então a centralização é feita no próprio deslocamento.
 */
export function PreviaEscalada({ largura, children }: { largura: number; children: ReactNode }) {
  const externoRef = useRef<HTMLDivElement>(null);
  const internoRef = useRef<HTMLDivElement>(null);
  const [transformacao, setTransformacao] = useState({ escala: 1, deslocamento: 0 });
  const [altura, setAltura] = useState(0);

  useEffect(() => {
    const externo = externoRef.current;
    const interno = internoRef.current;
    if (!externo || !interno) return;

    const medir = () => {
      const disponivel = externo.clientWidth;
      const escala = Math.min(1, disponivel / largura);
      setTransformacao({ escala, deslocamento: Math.max(0, (disponivel - largura * escala) / 2) });
      setAltura(interno.scrollHeight * escala);
    };

    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(externo);
    observador.observe(interno);
    return () => observador.disconnect();
  }, [largura]);

  return (
    <div ref={externoRef} className="w-full overflow-hidden" style={{ height: altura || undefined }}>
      <div
        ref={internoRef}
        style={{
          width: largura,
          transform: `translateX(${transformacao.deslocamento}px) scale(${transformacao.escala})`,
          transformOrigin: "top left",
        }}
        className="overflow-hidden rounded-panel border border-gelo"
      >
        {children}
      </div>
    </div>
  );
}
