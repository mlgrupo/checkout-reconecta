"use client";

import { useMemo, useRef, useState } from "react";
import { PreviaEscalada } from "@/components/aparencia/previa-escalada";
import { Checkout } from "@/components/checkout/checkout";
import { MolduraCheckout } from "@/components/checkout/moldura";
import { TemaCheckout } from "@/components/checkout/tema";
import { Selo } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Campo, Entrada, Interruptor, Selecao } from "@/components/ui/field";
import { IconeAtualizar, IconeFechar, IconeMais, IconeSeta, IconeUpload } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import {
  ALINHAMENTOS,
  APARENCIA_PADRAO,
  BLOCO_INFO,
  FUNDOS,
  LADOS,
  MODELO_INFO,
  MODELOS,
  type Aparencia,
  type Depoimento,
  type LadoResumo,
  type Modelo,
} from "@/lib/aparencia";
import { ehHexValido, normalizarHex } from "@/lib/cores";
import { acharFonte, FONTES } from "@/lib/fontes";
import { chamarApi, ErroHttp } from "@/lib/http-cliente";
import type { CheckoutPublico } from "@/lib/links";
import { cn } from "@/lib/utils";

type Props = {
  /** Aparência inicial já resolvida (padrão da loja, ou padrão + ajustes do link). */
  inicial: Aparencia;
  /** Onde salvar. Para link, também permite voltar a herdar. */
  destino: { tipo: "loja" } | { tipo: "link"; id: string; nome: string };
  /** Base da prévia: o checkout real do link, ou um exemplo para o padrão da loja. */
  base: CheckoutPublico;
  /** Campos que hoje estão sobrescritos neste link. */
  personalizados?: string[];
};

const CORES_SUGERIDAS = ["#0b3dff", "#7a1e2e", "#c9a227", "#0f8a5f", "#6d28d9", "#0a1633"];

function EntradaCor({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  const hex = normalizarHex(valor) ?? "#0b3dff";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <label className="relative h-10 w-12 shrink-0 cursor-pointer overflow-hidden rounded-control border border-gelo">
          <input
            type="color"
            value={hex}
            onChange={(e) => onChange(e.target.value)}
            className="absolute -left-2 -top-2 h-16 w-20 cursor-pointer border-0 p-0"
            aria-label="Escolher cor"
          />
        </label>
        <Entrada
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono uppercase"
          aria-invalid={!ehHexValido(valor)}
          maxLength={7}
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {CORES_SUGERIDAS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-label={`Usar ${c}`}
            className={cn(
              "h-6 w-6 rounded-chip border transition-transform hover:scale-110",
              hex === c ? "border-marinho ring-2 ring-marinho/20" : "border-gelo",
            )}
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  );
}

/** Move um item da lista sem alterar o array original. */
function mover<T>(lista: T[], de: number, passo: number): T[] {
  const para = de + passo;
  if (para < 0 || para >= lista.length) return lista;
  const copia = [...lista];
  [copia[de], copia[para]] = [copia[para], copia[de]];
  return copia;
}

/** Miniatura do modelo: retângulos representando resumo e formulário. */
function DiagramaModelo({ modelo, lado }: { modelo: Modelo; lado: LadoResumo }) {
  const resumo = <span className="rounded-[2px] bg-current opacity-40" />;
  const form = <span className="rounded-[2px] bg-current opacity-80" />;
  if (modelo === "classico") {
    return (
      <span className="grid h-8 w-12 gap-1" style={{ gridTemplateColumns: lado === "direita" ? "1fr 8px" : "8px 1fr" }}>
        {lado === "direita" ? (
          <>
            {form}
            {resumo}
          </>
        ) : (
          <>
            {resumo}
            {form}
          </>
        )}
      </span>
    );
  }
  if (modelo === "compacto") {
    return (
      <span className="grid h-8 w-12 grid-rows-[8px_1fr] gap-1">
        {resumo}
        {form}
      </span>
    );
  }
  return (
    <span className="flex h-8 w-12 justify-center">
      <span className="grid w-7 grid-rows-[8px_1fr] gap-1">
        {resumo}
        {form}
      </span>
    </span>
  );
}

function Secao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-gelo px-5 py-5 last:border-b-0">
      <h3 className="text-sm font-semibold text-marinho">{titulo}</h3>
      {descricao && <p className="mt-0.5 text-[13px] text-marinho-2">{descricao}</p>}
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

export function EditorAparencia({ inicial, destino, base, personalizados = [] }: Props) {
  const { notificar } = useToast();
  const [a, setA] = useState<Aparencia>(inicial);
  const [salvando, setSalvando] = useState(false);
  const [enviandoBanner, setEnviandoBanner] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [aba, setAba] = useState<"editar" | "previa">("editar");
  const [larguraPrevia, setLarguraPrevia] = useState<"celular" | "computador">("computador");
  const arquivoRef = useRef<HTMLInputElement>(null);

  const mudar = <K extends keyof Aparencia>(chave: K, valor: Aparencia[K]) => setA((atual) => ({ ...atual, [chave]: valor }));
  const mudarTipografia = (parcial: Partial<Aparencia["tipografia"]>) =>
    setA((atual) => ({ ...atual, tipografia: { ...atual.tipografia, ...parcial } }));
  const alterado = useMemo(() => JSON.stringify(a) !== JSON.stringify(inicial), [a, inicial]);

  const checkoutPrevia: CheckoutPublico = useMemo(() => ({ ...base, aparencia: a }), [base, a]);

  async function enviarBanner(arquivo: File) {
    setEnviandoBanner(true);
    try {
      const form = new FormData();
      form.append("arquivo", arquivo);
      const r = await chamarApi<{ imagem: { url: string } }>("/api/admin/imagens", { method: "POST", body: form });
      mudar("bannerUrl", r.imagem.url);
    } catch (e) {
      notificar({ tom: "erro", titulo: "Não foi possível enviar a imagem", descricao: (e as Error).message });
    } finally {
      setEnviandoBanner(false);
    }
  }

  async function salvar() {
    setSalvando(true);
    setErros({});
    const url = destino.tipo === "loja" ? "/api/admin/aparencia" : `/api/admin/links/${destino.id}/aparencia`;
    try {
      await chamarApi(url, { method: "PUT", body: JSON.stringify(a) });
      notificar({
        tom: "sucesso",
        titulo: "Aparência salva",
        descricao: destino.tipo === "loja" ? "Vale para todos os checkouts que não têm ajuste próprio." : `Aplicada a ${destino.nome}.`,
      });
    } catch (e) {
      const erro = e as ErroHttp;
      if (erro.campos) setErros(erro.campos);
      notificar({ tom: "erro", titulo: "Não foi possível salvar", descricao: erro.message });
    } finally {
      setSalvando(false);
    }
  }

  async function voltarAoPadrao() {
    if (destino.tipo !== "link") return;
    setSalvando(true);
    try {
      const r = await chamarApi<{ aparencia: Aparencia }>(`/api/admin/links/${destino.id}/aparencia`, { method: "DELETE" });
      setA(r.aparencia);
      notificar({ tom: "info", titulo: "Link voltou a herdar a aparência da loja" });
    } catch (e) {
      notificar({ tom: "erro", titulo: "Não foi possível redefinir", descricao: (e as Error).message });
    } finally {
      setSalvando(false);
    }
  }

  const painel = (
    <div className="rolagem-fina flex flex-col rounded-card border border-gelo bg-branco shadow-card lg:max-h-[calc(100dvh-180px)] lg:overflow-y-auto">
      <Secao titulo="Modelo" descricao="Onde o resumo fica e a largura da página.">
        <div className="grid grid-cols-3 gap-2">
          {MODELOS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => mudar("modelo", m)}
              title={MODELO_INFO[m].descricao}
              className={cn(
                "flex flex-col items-center gap-2 rounded-panel border px-2 py-3 transition-colors",
                a.modelo === m ? "border-azul bg-azul-claro/50 text-azul-profundo" : "border-gelo text-marinho-2 hover:border-azul-medio",
              )}
            >
              <DiagramaModelo modelo={m} lado={a.ladoResumo} />
              <span className="text-[12px] font-medium">{MODELO_INFO[m].rotulo}</span>
            </button>
          ))}
        </div>
        <p className="text-[12px] text-marinho-3">{MODELO_INFO[a.modelo].descricao}</p>

        {a.modelo === "classico" && (
          <Campo rotulo="Lado do resumo">
            <div className="grid grid-cols-2 gap-2">
              {LADOS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => mudar("ladoResumo", l)}
                  className={cn(
                    "rounded-control border px-3 py-2 text-sm font-medium capitalize transition-colors",
                    a.ladoResumo === l ? "border-azul bg-azul-claro/50 text-azul-profundo" : "border-gelo text-marinho-2 hover:border-azul-medio",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </Campo>
        )}

        <Campo rotulo="Fundo da página">
          <div className="grid grid-cols-2 gap-2">
            {FUNDOS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => mudar("fundo", f)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-control border px-3 py-2 text-sm font-medium capitalize transition-colors",
                  a.fundo === f ? "border-azul bg-azul-claro/50 text-azul-profundo" : "border-gelo text-marinho-2 hover:border-azul-medio",
                )}
              >
                <span
                  className={cn("h-4 w-4 rounded-[4px] border", f === "escuro" ? "border-marinho bg-marinho" : "border-gelo bg-branco")}
                />
                {f}
              </button>
            ))}
          </div>
        </Campo>
      </Secao>

      <Secao titulo="Ordem dos blocos" descricao="Vale também para a navegação por teclado. O botão de pagar fica sempre no fim.">
        <ul className="flex flex-col gap-2">
          {a.ordem.map((bloco, i) => (
            <li key={bloco} className="flex items-center gap-2 rounded-panel border border-gelo px-3 py-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-chip bg-gelo-2 font-display text-[11px] font-semibold text-marinho-2">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-marinho">{BLOCO_INFO[bloco].rotulo}</span>
                <span className="block truncate text-[12px] text-marinho-3">{BLOCO_INFO[bloco].descricao}</span>
              </span>
              <span className="flex shrink-0 gap-1">
                <button
                  type="button"
                  aria-label={`Mover ${BLOCO_INFO[bloco].rotulo} para cima`}
                  disabled={i === 0}
                  onClick={() => mudar("ordem", mover(a.ordem, i, -1))}
                  className="rounded-control p-1 text-marinho-2 hover:bg-gelo-2 disabled:opacity-30"
                >
                  <IconeSeta tamanho={15} className="-rotate-90" />
                </button>
                <button
                  type="button"
                  aria-label={`Mover ${BLOCO_INFO[bloco].rotulo} para baixo`}
                  disabled={i === a.ordem.length - 1}
                  onClick={() => mudar("ordem", mover(a.ordem, i, 1))}
                  className="rounded-control p-1 text-marinho-2 hover:bg-gelo-2 disabled:opacity-30"
                >
                  <IconeSeta tamanho={15} className="rotate-90" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      </Secao>

      <Secao titulo="Cor" descricao="Usada nos botões, nos destaques e no método de pagamento selecionado.">
        <Campo rotulo="Cor principal" erro={erros.corPrincipal}>
          <EntradaCor valor={a.corPrincipal} onChange={(v) => mudar("corPrincipal", v)} />
        </Campo>
      </Secao>

      <Secao titulo="Tipografia" descricao="A fonte vale para o checkout inteiro. O resto é do título e do subtítulo.">
        <Campo rotulo="Fonte" htmlFor="t-fonte" erro={erros["tipografia.fonte"]}>
          <Selecao id="t-fonte" value={a.tipografia.fonte} onChange={(e) => mudarTipografia({ fonte: e.target.value })}>
            {FONTES.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </Selecao>
        </Campo>
        {acharFonte(a.tipografia.fonte).google && (
          <p className="text-[12px] text-marinho-3">
            Esta fonte é carregada do Google Fonts, o que soma uma requisição à página de pagamento.
          </p>
        )}

        <Campo rotulo="Alinhamento">
          <div className="grid grid-cols-3 gap-2">
            {ALINHAMENTOS.map((al) => (
              <button
                key={al}
                type="button"
                onClick={() => mudarTipografia({ alinhamento: al })}
                className={cn(
                  "rounded-control border px-2 py-2 text-[13px] font-medium capitalize transition-colors",
                  a.tipografia.alinhamento === al
                    ? "border-azul bg-azul-claro/50 text-azul-profundo"
                    : "border-gelo text-marinho-2 hover:border-azul-medio",
                )}
              >
                {al}
              </button>
            ))}
          </div>
        </Campo>

        <Campo
          rotulo={`Tamanho do título: ${a.tipografia.tituloTamanho} px`}
          htmlFor="t-tamanho"
          erro={erros["tipografia.tituloTamanho"]}
          dica="Em telas estreitas o título encolhe sozinho a partir deste tamanho."
        >
          <input
            id="t-tamanho"
            type="range"
            min={16}
            max={64}
            step={1}
            value={a.tipografia.tituloTamanho}
            onChange={(e) => mudarTipografia({ tituloTamanho: Number(e.target.value) })}
            className="w-full accent-azul"
          />
        </Campo>

        <Campo rotulo="Estilo do título">
          <div className="flex gap-2">
            <button
              type="button"
              aria-pressed={a.tipografia.tituloNegrito}
              onClick={() => mudarTipografia({ tituloNegrito: !a.tipografia.tituloNegrito })}
              className={cn(
                "h-10 w-12 rounded-control border font-bold transition-colors",
                a.tipografia.tituloNegrito ? "border-azul bg-azul-claro/50 text-azul-profundo" : "border-gelo text-marinho-2 hover:border-azul-medio",
              )}
            >
              N
            </button>
            <button
              type="button"
              aria-pressed={a.tipografia.tituloItalico}
              onClick={() => mudarTipografia({ tituloItalico: !a.tipografia.tituloItalico })}
              className={cn(
                "h-10 w-12 rounded-control border font-serif italic transition-colors",
                a.tipografia.tituloItalico ? "border-azul bg-azul-claro/50 text-azul-profundo" : "border-gelo text-marinho-2 hover:border-azul-medio",
              )}
            >
              I
            </button>
          </div>
        </Campo>
      </Secao>

      <Secao titulo="Topo da página" descricao="Imagem e chamada que aparecem antes do formulário.">
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-marinho">Banner</span>
          {a.bannerUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.bannerUrl} alt="" className="w-full rounded-panel border border-gelo object-cover" />
          )}
          <input
            ref={arquivoRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void enviarBanner(f);
              e.target.value = "";
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button variante="secundario" tamanho="sm" icone={<IconeUpload tamanho={15} />} carregando={enviandoBanner} onClick={() => arquivoRef.current?.click()}>
              {a.bannerUrl ? "Trocar banner" : "Enviar banner"}
            </Button>
            {a.bannerUrl && (
              <Button variante="fantasma" tamanho="sm" onClick={() => mudar("bannerUrl", null)}>
                Remover
              </Button>
            )}
          </div>
          <p className="text-[12px] text-marinho-3">Proporção larga funciona melhor, algo como 1200 por 300. Até 2 MB.</p>
        </div>

        <Campo rotulo="Título" opcional erro={erros.titulo} dica="Em branco, o checkout começa direto no formulário.">
          <Entrada value={a.titulo ?? ""} onChange={(e) => mudar("titulo", e.target.value || null)} placeholder="Falta pouco para garantir sua vaga" maxLength={80} />
        </Campo>
        <Campo rotulo="Subtítulo" opcional erro={erros.subtitulo}>
          <Entrada value={a.subtitulo ?? ""} onChange={(e) => mudar("subtitulo", e.target.value || null)} placeholder="Preencha seus dados e escolha como quer pagar" maxLength={160} />
        </Campo>
      </Secao>

      <Secao titulo="Botão de pagamento" descricao="Em branco, o texto muda sozinho conforme o método escolhido.">
        <Campo rotulo="Texto do botão" opcional erro={erros.textoBotao}>
          <Entrada value={a.textoBotao ?? ""} onChange={(e) => mudar("textoBotao", e.target.value || null)} placeholder="Quero garantir agora" maxLength={40} />
        </Campo>
      </Secao>

      <Secao titulo="Cronômetro" descricao="Contagem regressiva no topo. O prazo continua de onde parou se a pessoa recarregar.">
        <Interruptor
          ativo={a.cronometro.ativo}
          onChange={(v) => mudar("cronometro", { ...a.cronometro, ativo: v })}
          rotulo="Mostrar cronômetro"
          descricao="Reserva a oferta por um tempo."
        />
        {a.cronometro.ativo && (
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <Campo rotulo="Minutos" erro={erros["cronometro.minutos"]}>
              <Entrada
                inputMode="numeric"
                value={String(a.cronometro.minutos)}
                onChange={(e) => mudar("cronometro", { ...a.cronometro, minutos: Number(e.target.value.replace(/\D/g, "")) || 1 })}
              />
            </Campo>
            <Campo rotulo="Texto" erro={erros["cronometro.texto"]}>
              <Entrada value={a.cronometro.texto} onChange={(e) => mudar("cronometro", { ...a.cronometro, texto: e.target.value })} maxLength={60} />
            </Campo>
          </div>
        )}
      </Secao>

      <Secao titulo="Garantia" descricao="Selo abaixo do botão, com o prazo de devolução.">
        <Interruptor
          ativo={a.garantia.ativo}
          onChange={(v) => mudar("garantia", { ...a.garantia, ativo: v })}
          rotulo="Mostrar selo de garantia"
        />
        {a.garantia.ativo && (
          <div className="flex flex-col gap-3">
            <Campo rotulo="Dias" erro={erros["garantia.dias"]} className="max-w-[110px]">
              <Entrada
                inputMode="numeric"
                value={String(a.garantia.dias)}
                onChange={(e) => mudar("garantia", { ...a.garantia, dias: Number(e.target.value.replace(/\D/g, "")) || 1 })}
              />
            </Campo>
            <Campo rotulo="Texto" erro={erros["garantia.texto"]}>
              <textarea
                value={a.garantia.texto}
                onChange={(e) => mudar("garantia", { ...a.garantia, texto: e.target.value })}
                rows={2}
                maxLength={200}
                className="w-full rounded-control border border-gelo bg-branco px-3 py-2 text-sm text-marinho hover:border-azul-medio focus:border-azul focus:shadow-glow focus:outline-none"
              />
            </Campo>
          </div>
        )}
      </Secao>

      <Secao titulo="Depoimentos" descricao="Aparecem abaixo do botão. No máximo seis.">
        {a.depoimentos.map((d, i) => (
          <div key={i} className="rounded-panel border border-gelo p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-medium text-marinho">Depoimento {i + 1}</span>
              <button
                type="button"
                aria-label="Remover depoimento"
                onClick={() => mudar("depoimentos", a.depoimentos.filter((_, j) => j !== i))}
                className="rounded-control p-1 text-marinho-3 hover:bg-bordo-claro hover:text-bordo"
              >
                <IconeFechar tamanho={15} />
              </button>
            </div>
            <div className="mt-2 flex flex-col gap-2">
              <Entrada
                value={d.nome}
                placeholder="Nome de quem falou"
                onChange={(e) => mudar("depoimentos", a.depoimentos.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))}
                maxLength={60}
              />
              <textarea
                value={d.texto}
                placeholder="O que essa pessoa disse"
                onChange={(e) => mudar("depoimentos", a.depoimentos.map((x, j) => (j === i ? { ...x, texto: e.target.value } : x)))}
                rows={2}
                maxLength={300}
                className="w-full rounded-control border border-gelo bg-branco px-3 py-2 text-sm text-marinho placeholder:text-marinho-3 hover:border-azul-medio focus:border-azul focus:shadow-glow focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-marinho-2">Nota</span>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`${n} estrelas`}
                    onClick={() => mudar("depoimentos", a.depoimentos.map((x, j) => (j === i ? { ...x, nota: n } : x)))}
                    className={cn("text-lg leading-none", n <= d.nota ? "text-dourado" : "text-gelo")}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
        {a.depoimentos.length < 6 && (
          <Button
            variante="secundario"
            tamanho="sm"
            icone={<IconeMais tamanho={15} />}
            onClick={() => mudar("depoimentos", [...a.depoimentos, { nome: "", texto: "", nota: 5 } as Depoimento])}
          >
            Adicionar depoimento
          </Button>
        )}
        {erros.depoimentos && <p className="text-[13px] text-bordo">{erros.depoimentos}</p>}
      </Secao>

      <div className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-gelo bg-branco/95 px-5 py-4 backdrop-blur">
        <Button onClick={salvar} carregando={salvando} disabled={!alterado}>
          {alterado ? "Salvar aparência" : "Tudo salvo"}
        </Button>
        <Button variante="fantasma" tamanho="sm" onClick={() => setA(inicial)} disabled={!alterado || salvando}>
          Desfazer
        </Button>
        {destino.tipo === "link" && personalizados.length > 0 && (
          <Button variante="fantasma" tamanho="sm" icone={<IconeAtualizar tamanho={15} />} onClick={voltarAoPadrao} disabled={salvando}>
            Herdar da loja
          </Button>
        )}
        {destino.tipo === "loja" && (
          <Button variante="fantasma" tamanho="sm" onClick={() => setA(APARENCIA_PADRAO)} disabled={salvando}>
            Voltar ao original
          </Button>
        )}
      </div>
    </div>
  );

  const previa = (
    <div className="rounded-card border border-gelo bg-neve shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-gelo bg-branco px-4 py-2.5">
        <span className="text-[13px] font-medium text-marinho-2">Prévia</span>
        <div className="flex gap-1">
          {(["celular", "computador"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLarguraPrevia(l)}
              className={cn(
                "rounded-control px-2.5 py-1 text-[12px] font-medium capitalize transition-colors",
                larguraPrevia === l ? "bg-azul-claro text-azul-profundo" : "text-marinho-3 hover:bg-gelo-2",
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="rolagem-fina max-h-[calc(100dvh-220px)] overflow-y-auto p-4">
        <PreviaEscalada largura={larguraPrevia === "celular" ? 390 : 1180}>
          <TemaCheckout aparencia={a}>
            <MolduraCheckout nomeLoja="Reconecta">
              <Checkout checkout={checkoutPrevia} modoPrevia />
            </MolduraCheckout>
          </TemaCheckout>
        </PreviaEscalada>
      </div>
    </div>
  );

  return (
    <>
      {/* Abas no celular, duas colunas no computador */}
      <div className="mb-4 flex gap-1 rounded-control border border-gelo bg-branco p-1 lg:hidden">
        {(["editar", "previa"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setAba(t)}
            className={cn(
              "flex-1 rounded-control px-3 py-2 text-sm font-medium transition-colors",
              aba === t ? "bg-azul-claro text-azul-profundo" : "text-marinho-2",
            )}
          >
            {t === "editar" ? "Editar" : "Prévia"}
          </button>
        ))}
      </div>

      {destino.tipo === "link" && (
        <p className="mb-4 flex flex-wrap items-center gap-2 text-[13px] text-marinho-2">
          <span>
            Editando <span className="font-medium text-marinho">{destino.nome}</span>
          </span>
          {personalizados.length > 0 ? (
            <Selo tom="dourado">
              {personalizados.length} {personalizados.length === 1 ? "ajuste próprio" : "ajustes próprios"}
            </Selo>
          ) : (
            <Selo tom="neutro">herdando tudo da loja</Selo>
          )}
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[400px_minmax(0,1fr)] lg:items-start">
        <div className={cn(aba === "editar" ? "block" : "hidden", "lg:block lg:sticky lg:top-6")}>{painel}</div>
        <div className={cn(aba === "previa" ? "block" : "hidden", "lg:block")}>{previa}</div>
      </div>
    </>
  );
}
