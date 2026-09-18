"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { IconeAlerta, IconeCheck, IconeFechar, IconeInfo } from "@/components/ui/icons";

type Tom = "sucesso" | "erro" | "info";
type Aviso = { id: number; titulo: string; descricao?: string; tom: Tom };

type Contexto = {
  notificar: (aviso: Omit<Aviso, "id">) => void;
};

const ToastContext = createContext<Contexto | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  const remover = useCallback((id: number) => {
    setAvisos((lista) => lista.filter((a) => a.id !== id));
  }, []);

  const notificar = useCallback(
    (aviso: Omit<Aviso, "id">) => {
      const id = Date.now() + Math.random();
      setAvisos((lista) => [...lista, { ...aviso, id }]);
      window.setTimeout(() => remover(id), aviso.tom === "erro" ? 7000 : 4500);
    },
    [remover],
  );

  const valor = useMemo(() => ({ notificar }), [notificar]);

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(380px,calc(100vw-32px))] flex-col gap-2"
      >
        {avisos.map((a) => (
          <div
            key={a.id}
            role="status"
            className={cn(
              "pointer-events-auto flex animate-rise items-start gap-3 rounded-panel border bg-branco px-4 py-3 shadow-card",
              a.tom === "sucesso" && "border-verde/30",
              a.tom === "erro" && "border-bordo/40",
              a.tom === "info" && "border-azul/30",
            )}
          >
            <span
              className={cn(
                "mt-0.5 shrink-0",
                a.tom === "sucesso" && "text-verde",
                a.tom === "erro" && "text-bordo",
                a.tom === "info" && "text-azul",
              )}
            >
              {a.tom === "sucesso" ? <IconeCheck /> : a.tom === "erro" ? <IconeAlerta /> : <IconeInfo />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-marinho">{a.titulo}</p>
              {a.descricao && <p className="mt-0.5 text-[13px] text-marinho-2">{a.descricao}</p>}
            </div>
            <button
              type="button"
              onClick={() => remover(a.id)}
              aria-label="Dispensar"
              className="shrink-0 rounded-control p-1 text-marinho-3 hover:bg-gelo-2 hover:text-marinho"
            >
              <IconeFechar tamanho={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast precisa estar dentro de <ToastProvider>.");
  return ctx;
}
