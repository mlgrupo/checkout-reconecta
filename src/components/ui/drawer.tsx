"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { IconeFechar } from "@/components/ui/icons";

type Props = {
  aberta: boolean;
  onFechar: () => void;
  titulo: ReactNode;
  descricao?: ReactNode;
  rodape?: ReactNode;
  children: ReactNode;
  largura?: "md" | "lg";
};

/** Painel lateral direito. Fecha com Esc ou clique no fundo; prende o foco ao abrir. */
export function Gaveta({ aberta, onFechar, titulo, descricao, rodape, children, largura = "md" }: Props) {
  const tituloId = useId();
  const painelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberta) return;
    const anterior = document.activeElement as HTMLElement | null;
    const raiz = painelRef.current;
    raiz?.querySelector<HTMLElement>("input, select, textarea, button:not([data-fechar])")?.focus();

    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
      if (e.key === "Tab" && raiz) {
        const focaveis = raiz.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (!focaveis.length) return;
        const primeiro = focaveis[0];
        const ultimo = focaveis[focaveis.length - 1];
        if (e.shiftKey && document.activeElement === primeiro) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primeiro.focus();
        }
      }
    }
    document.addEventListener("keydown", aoTeclar);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflow;
      anterior?.focus?.();
    };
  }, [aberta, onFechar]);

  if (!aberta || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Fechar painel"
        onClick={onFechar}
        className="absolute inset-0 animate-fade bg-marinho/30 backdrop-blur-[2px]"
      />
      <div
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className={cn(
          "relative flex h-full w-full animate-slide-in flex-col bg-branco shadow-drawer",
          largura === "md" ? "max-w-[480px]" : "max-w-[640px]",
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-gelo px-6 py-5">
          <div>
            <h2 id={tituloId} className="text-lg font-semibold">
              {titulo}
            </h2>
            {descricao && <p className="mt-0.5 text-[13px] text-marinho-2">{descricao}</p>}
          </div>
          <button
            type="button"
            data-fechar
            onClick={onFechar}
            aria-label="Fechar"
            className="rounded-control p-1.5 text-marinho-3 transition-colors hover:bg-gelo-2 hover:text-marinho"
          >
            <IconeFechar />
          </button>
        </header>
        <div className="rolagem-fina flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {rodape && <footer className="flex items-center justify-between gap-3 border-t border-gelo px-6 py-4">{rodape}</footer>}
      </div>
    </div>,
    document.body,
  );
}
