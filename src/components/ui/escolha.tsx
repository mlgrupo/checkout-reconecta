"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Dropdown da plataforma. Substitui o `<select>` nativo, que não aceita estilo na lista
 * de opções e fica diferente em cada sistema operacional.
 *
 * Acessibilidade: segue o padrão de combobox com listbox. Abre com Enter, Espaço, seta
 * para baixo ou clique; navega com as setas, Home e End; escolhe com Enter ou Tab; fecha
 * com Esc. Também aceita digitar as primeiras letras para saltar até a opção.
 */

export type Opcao<T extends string | number> = {
  valor: T;
  rotulo: string;
  descricao?: string;
  icone?: ReactNode;
  desabilitada?: boolean;
};

type Props<T extends string | number> = {
  valor: T;
  opcoes: Opcao<T>[];
  onChange: (valor: T) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  "aria-invalid"?: boolean;
  "aria-label"?: string;
  className?: string;
};

export function Escolha<T extends string | number>({
  valor,
  opcoes,
  onChange,
  id,
  placeholder = "Selecione",
  disabled,
  className,
  ...aria
}: Props<T>) {
  const idGerado = useId();
  const idBotao = id ?? idGerado;
  const idLista = `${idBotao}-lista`;
  const raizRef = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const [aberta, setAberta] = useState(false);
  const [emFoco, setEmFoco] = useState(0);
  const busca = useRef({ texto: "", em: 0 });

  const selecionada = opcoes.find((o) => o.valor === valor) ?? null;
  const indiceSelecionado = Math.max(0, opcoes.findIndex((o) => o.valor === valor));

  function abrir() {
    if (disabled) return;
    setEmFoco(indiceSelecionado);
    setAberta(true);
  }

  function escolher(indice: number) {
    const opcao = opcoes[indice];
    if (!opcao || opcao.desabilitada) return;
    onChange(opcao.valor);
    setAberta(false);
    raizRef.current?.querySelector("button")?.focus();
  }

  /** Anda pela lista pulando as opções desabilitadas. */
  function mover(de: number, passo: number) {
    let i = de;
    for (let tentativas = 0; tentativas < opcoes.length; tentativas++) {
      i = (i + passo + opcoes.length) % opcoes.length;
      if (!opcoes[i]?.desabilitada) return i;
    }
    return de;
  }

  // Fecha ao clicar fora ou ao rolar a página, como um menu nativo faria.
  useEffect(() => {
    if (!aberta) return;
    const aoClicar = (e: MouseEvent) => {
      if (!raizRef.current?.contains(e.target as Node)) setAberta(false);
    };
    const aoRolar = (e: Event) => {
      if (listaRef.current?.contains(e.target as Node)) return;
      // Fecha só quando o gatilho sai da tela. A lista é posicionada junto dele e acompanha a
      // rolagem, então rolagens pequenas não precisam fechar nada — e uma delas é provocada pelo
      // próprio menu, que ao abrir traz a opção ativa para a vista. Qualquer ancestral com
      // `overflow` recebe essa rolagem, e fechar nela deixava o menu impossível de abrir.
      const caixa = raizRef.current?.getBoundingClientRect();
      if (!caixa || caixa.bottom <= 0 || caixa.top >= window.innerHeight) setAberta(false);
    };
    document.addEventListener("mousedown", aoClicar);
    window.addEventListener("scroll", aoRolar, true);
    return () => {
      document.removeEventListener("mousedown", aoClicar);
      window.removeEventListener("scroll", aoRolar, true);
    };
  }, [aberta]);

  // Mantém a opção em foco visível e decide se a lista abre para cima.
  const [paraCima, setParaCima] = useState(false);
  useLayoutEffect(() => {
    if (!aberta) return;
    const caixa = raizRef.current?.getBoundingClientRect();
    if (caixa) {
      const alturaLista = Math.min(opcoes.length * 44 + 8, 288);
      setParaCima(caixa.bottom + alturaLista > window.innerHeight && caixa.top > alturaLista);
    }
    listaRef.current?.querySelector<HTMLElement>('[data-em-foco="true"]')?.scrollIntoView({ block: "nearest" });
  }, [aberta, emFoco, opcoes.length]);

  function aoTeclar(e: React.KeyboardEvent) {
    if (disabled) return;
    if (!aberta) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        abrir();
      }
      return;
    }
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setAberta(false);
        break;
      case "ArrowDown":
        e.preventDefault();
        setEmFoco((i) => mover(i, 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setEmFoco((i) => mover(i, -1));
        break;
      case "Home":
        e.preventDefault();
        setEmFoco(mover(-1, 1));
        break;
      case "End":
        e.preventDefault();
        setEmFoco(mover(opcoes.length, -1));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        escolher(emFoco);
        break;
      case "Tab":
        escolher(emFoco);
        break;
      default:
        // Digitar letras salta para a primeira opção que começa com elas.
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          const agora = Date.now();
          busca.current.texto = agora - busca.current.em > 900 ? e.key : busca.current.texto + e.key;
          busca.current.em = agora;
          const alvo = busca.current.texto.toLowerCase();
          const achado = opcoes.findIndex((o) => !o.desabilitada && o.rotulo.toLowerCase().startsWith(alvo));
          if (achado >= 0) setEmFoco(achado);
        }
    }
  }

  return (
    <div ref={raizRef} className={cn("relative", className)}>
      <button
        type="button"
        id={idBotao}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={aberta}
        aria-controls={aberta ? idLista : undefined}
        aria-invalid={aria["aria-invalid"]}
        aria-label={aria["aria-label"]}
        disabled={disabled}
        onClick={() => (aberta ? setAberta(false) : abrir())}
        onKeyDown={aoTeclar}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-control border bg-branco px-3 text-left text-sm transition-[border-color,box-shadow] duration-150",
          "hover:border-azul-medio focus:border-azul focus:shadow-glow focus:outline-none",
          "disabled:cursor-not-allowed disabled:bg-gelo-2 disabled:text-marinho-3",
          aria["aria-invalid"] ? "border-bordo" : "border-gelo",
          aberta && "border-azul shadow-glow",
        )}
      >
        {selecionada?.icone}
        <span className={cn("min-w-0 flex-1 truncate", selecionada ? "text-marinho" : "text-marinho-3")}>
          {selecionada?.rotulo ?? placeholder}
        </span>
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
          className={cn("shrink-0 text-marinho-3 transition-transform duration-150", aberta && "rotate-180")}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {aberta && (
        <ul
          ref={listaRef}
          id={idLista}
          role="listbox"
          aria-activedescendant={`${idBotao}-op-${emFoco}`}
          tabIndex={-1}
          className={cn(
            "rolagem-fina absolute z-50 max-h-72 w-full animate-fade overflow-y-auto rounded-panel border border-gelo bg-branco p-1 shadow-card",
            paraCima ? "bottom-full mb-1" : "top-full mt-1",
          )}
        >
          {opcoes.map((opcao, i) => {
            const escolhida = opcao.valor === valor;
            return (
              <li
                key={String(opcao.valor)}
                id={`${idBotao}-op-${i}`}
                role="option"
                aria-selected={escolhida}
                aria-disabled={opcao.desabilitada}
                data-em-foco={i === emFoco}
                onMouseEnter={() => !opcao.desabilitada && setEmFoco(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => escolher(i)}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-control px-2.5 py-2 text-sm",
                  opcao.desabilitada && "cursor-not-allowed opacity-40",
                  i === emFoco && !opcao.desabilitada && "bg-gelo-2",
                  escolhida && "bg-azul-claro/60",
                )}
              >
                {opcao.icone}
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate", escolhida ? "font-medium text-azul-profundo" : "text-marinho")}>{opcao.rotulo}</span>
                  {opcao.descricao && <span className="block truncate text-[12px] text-marinho-3">{opcao.descricao}</span>}
                </span>
                {escolhida && (
                  <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-azul">
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
