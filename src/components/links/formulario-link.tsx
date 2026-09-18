"use client";

import { useState } from "react";
import { METODO_INFO, type LinkLista } from "@/components/links/tipos";
import type { ProdutoLista } from "@/components/produtos/tipos";
import { Button } from "@/components/ui/button";
import { Gaveta } from "@/components/ui/drawer";
import { EntradaDinheiro } from "@/components/ui/entrada-dinheiro";
import { Escolha } from "@/components/ui/escolha";
import { Campo, Entrada, Interruptor } from "@/components/ui/field";
import { IconeLixeira } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { METODOS, type Metodo } from "@/lib/dominio";
import { dinheiro } from "@/lib/formato";
import { opcoesDeParcelamento, taxaParaBps } from "@/lib/parcelas";
import { chamarApi, ErroHttp } from "@/lib/http-cliente";
import { cn } from "@/lib/utils";

type Props = {
  aberta: boolean;
  link: LinkLista | null;
  produtos: ProdutoLista[];
  podeExcluir: boolean;
  onFechar: () => void;
  onSalvo: () => void;
};

export function FormularioLink({ aberta, link, produtos, podeExcluir, onFechar, onSalvo }: Props) {
  const { notificar } = useToast();
  const editando = Boolean(link);

  const [nome, setNome] = useState(link?.nome ?? "");
  const [produtoId, setProdutoId] = useState(link?.produtoId ?? produtos.find((p) => p.ativo)?.id ?? "");
  const [codigo, setCodigo] = useState(link?.codigo ?? "");
  const [bumpProdutoId, setBumpProdutoId] = useState(link?.bumpProdutoId ?? "");
  const [bumpPreco, setBumpPreco] = useState<number | null>(link?.bumpPrecoCentavos ?? null);
  const [bumpTitulo, setBumpTitulo] = useState(link?.bumpTitulo ?? "");
  const [bumpDescricao, setBumpDescricao] = useState(link?.bumpDescricao ?? "");
  const [metodos, setMetodos] = useState<Metodo[]>(link?.metodos ?? ["pix", "cartao", "boleto"]);
  const [parcelasMax, setParcelasMax] = useState(link?.parcelasMax ?? 1);
  const [parcelasSemJuros, setParcelasSemJuros] = useState(link?.parcelasSemJuros ?? 12);
  const [jurosTexto, setJurosTexto] = useState(((link?.jurosMensalBps ?? 0) / 100).toFixed(2).replace(".", ","));
  const [urlSucesso, setUrlSucesso] = useState(link?.urlSucesso ?? "");
  const [ativo, setAtivo] = useState(link?.ativo ?? true);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  const produtoPrincipal = produtos.find((p) => p.id === produtoId);
  const produtoBump = produtos.find((p) => p.id === bumpProdutoId);

  // Taxa digitada: null significa fora do intervalo aceito (0 a 20% ao mês).
  const jurosMensalBps = taxaParaBps(jurosTexto);
  const semJurosEfetivo = Math.min(parcelasSemJuros, parcelasMax);
  const tudoSemJuros = (jurosMensalBps ?? 0) === 0 || semJurosEfetivo >= parcelasMax;
  // Simulação com o maior valor possível do link: produto principal mais o order bump.
  const valorSimulado = (produtoPrincipal?.precoCentavos ?? 0) + (bumpProdutoId ? (bumpPreco ?? produtoBump?.precoCentavos ?? 0) : 0);
  const simulacao = valorSimulado > 0 ? opcoesDeParcelamento(valorSimulado, { parcelasMax, parcelasSemJuros: semJurosEfetivo, jurosMensalBps: jurosMensalBps ?? 0 }) : [];

  function alternarMetodo(m: Metodo) {
    setMetodos((atual) => (atual.includes(m) ? atual.filter((x) => x !== m) : [...atual, m]));
  }

  async function salvar() {
    if (metodos.includes("cartao") && jurosMensalBps === null) {
      setErros({ jurosMensalBps: "Informe uma taxa entre 0 e 20% ao mês." });
      return;
    }
    setSalvando(true);
    setErros({});
    try {
      const corpo = {
        nome,
        produtoId,
        codigo: codigo || null,
        bumpProdutoId: bumpProdutoId || null,
        bumpPrecoCentavos: bumpProdutoId ? bumpPreco : null,
        bumpTitulo: bumpProdutoId ? bumpTitulo || null : null,
        bumpDescricao: bumpProdutoId ? bumpDescricao || null : null,
        metodos,
        parcelasMax: metodos.includes("cartao") ? parcelasMax : 1,
        parcelasSemJuros: metodos.includes("cartao") ? semJurosEfetivo : 1,
        jurosMensalBps: metodos.includes("cartao") ? (jurosMensalBps ?? 0) : 0,
        urlSucesso: urlSucesso || null,
        ativo,
      };
      if (editando && link) {
        await chamarApi(`/api/admin/links/${link.id}`, { method: "PATCH", body: JSON.stringify(corpo) });
        notificar({ tom: "sucesso", titulo: "Link salvo" });
      } else {
        const r = await chamarApi<{ link: { codigo: string } }>("/api/admin/links", { method: "POST", body: JSON.stringify(corpo) });
        notificar({ tom: "sucesso", titulo: "Link criado", descricao: `Disponível em /c/${r.link.codigo}` });
      }
      onSalvo();
    } catch (e) {
      const erro = e as ErroHttp;
      if (erro.campos) setErros(erro.campos);
      notificar({ tom: "erro", titulo: "Não foi possível salvar", descricao: erro.message });
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!link) return;
    setSalvando(true);
    try {
      await chamarApi(`/api/admin/links/${link.id}`, { method: "DELETE" });
      notificar({ tom: "info", titulo: "Link excluído" });
      onSalvo();
    } catch (e) {
      notificar({ tom: "erro", titulo: "Não foi possível excluir", descricao: (e as Error).message });
    } finally {
      setSalvando(false);
      setConfirmandoExclusao(false);
    }
  }

  return (
    <Gaveta
      aberta={aberta}
      onFechar={onFechar}
      largura="lg"
      titulo={editando ? "Editar link de checkout" : "Novo link de checkout"}
      descricao={editando ? link?.url : "Escolha o produto, o order bump e os meios de pagamento."}
      rodape={
        <>
          <Button variante="fantasma" onClick={onFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} carregando={salvando}>
            {editando ? "Salvar alterações" : "Criar link"}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          void salvar();
        }}
      >
        <section className="flex flex-col gap-4">
          <Campo rotulo="Nome interno" htmlFor="l-nome" erro={erros.nome} dica="Só a equipe vê. Ex.: Campanha Instagram setembro.">
            <Entrada id="l-nome" value={nome} onChange={(e) => setNome(e.target.value)} aria-invalid={Boolean(erros.nome)} />
          </Campo>

          <Campo rotulo="Produto principal" htmlFor="l-produto" erro={erros.produtoId}>
            <Escolha
              id="l-produto"
              valor={produtoId}
              onChange={setProdutoId}
              placeholder="Escolha um produto"
              aria-invalid={Boolean(erros.produtoId)}
              opcoes={produtos.map((p) => ({
                valor: p.id,
                rotulo: p.nome,
                descricao: `${dinheiro(p.precoCentavos)}${p.ativo ? "" : " · inativo"}`,
              }))}
            />
          </Campo>

          <Campo rotulo="Código da URL" htmlFor="l-codigo" opcional erro={erros.codigo} dica="Deixe em branco para gerar automaticamente. Só letras minúsculas, números e hífen.">
            <div className="flex items-center gap-2">
              <span className="text-sm text-marinho-3">/c/</span>
              <Entrada id="l-codigo" value={codigo} onChange={(e) => setCodigo(e.target.value.toLowerCase())} placeholder="mentoria-setembro" aria-invalid={Boolean(erros.codigo)} />
            </div>
          </Campo>
        </section>

        <section className="colchetes flex flex-col gap-4 rounded-panel border border-dourado/40 bg-dourado-claro/30 p-4">
          <div>
            <h3 className="text-sm font-semibold text-marinho">Order bump</h3>
            <p className="text-[13px] text-marinho-2">
              Oferta extra mostrada antes do botão de pagar. Se o cliente aceitar, produto e bump viram uma única cobrança.
            </p>
          </div>
          <Campo rotulo="Produto do order bump" htmlFor="l-bump" erro={erros.bumpProdutoId}>
            <Escolha
              id="l-bump"
              valor={bumpProdutoId}
              onChange={setBumpProdutoId}
              opcoes={[
                { valor: "", rotulo: "Sem order bump", descricao: "O checkout mostra só o produto principal." },
                ...produtos
                  .filter((p) => p.id !== produtoId)
                  .map((p) => ({ valor: p.id, rotulo: p.nome, descricao: dinheiro(p.precoCentavos) })),
              ]}
            />
          </Campo>
          {bumpProdutoId && (
            <>
              <Campo
                rotulo="Preço especial no bump"
                htmlFor="l-bump-preco"
                opcional
                erro={erros.bumpPrecoCentavos}
                dica={produtoBump ? `Em branco usa o preço normal (${dinheiro(produtoBump.precoCentavos)}). Um desconto aqui aumenta a conversão.` : undefined}
              >
                <EntradaDinheiro id="l-bump-preco" centavos={bumpPreco} onCentavos={setBumpPreco} />
              </Campo>
              <Campo rotulo="Chamada do bump" htmlFor="l-bump-titulo" opcional erro={erros.bumpTitulo} dica="Ex.: Sim! Quero adicionar o Workbook por apenas R$ 47.">
                <Entrada id="l-bump-titulo" value={bumpTitulo} onChange={(e) => setBumpTitulo(e.target.value)} maxLength={120} />
              </Campo>
              <Campo rotulo="Texto de apoio" htmlFor="l-bump-desc" opcional erro={erros.bumpDescricao}>
                <textarea
                  id="l-bump-desc"
                  value={bumpDescricao}
                  onChange={(e) => setBumpDescricao(e.target.value)}
                  rows={2}
                  maxLength={500}
                  className="w-full rounded-control border border-gelo bg-branco px-3 py-2 text-sm text-marinho placeholder:text-marinho-3 hover:border-azul-medio focus:border-azul focus:shadow-glow focus:outline-none"
                />
              </Campo>
            </>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-[13px] font-medium text-marinho">Meios de pagamento</legend>
            <div className="grid grid-cols-3 gap-2">
              {METODOS.map((m) => {
                const marcado = metodos.includes(m);
                return (
                  <label
                    key={m}
                    className={cn(
                      "flex cursor-pointer items-center justify-center gap-2 rounded-panel border px-3 py-2.5 text-sm font-medium transition-colors",
                      marcado ? "border-azul/40 bg-azul-claro/50 text-azul-profundo" : "border-gelo text-marinho-2 hover:border-azul-medio",
                    )}
                  >
                    <input type="checkbox" className="accent-azul" checked={marcado} onChange={() => alternarMetodo(m)} />
                    {METODO_INFO[m].rotulo}
                  </label>
                );
              })}
            </div>
            {erros.metodos && <p className="text-[13px] text-bordo">{erros.metodos}</p>}
          </fieldset>

          {metodos.includes("cartao") && (
            <div className="flex flex-col gap-4 rounded-panel border border-gelo bg-neve/60 p-4">
              <Campo rotulo="Parcelamento máximo no cartão" htmlFor="l-parcelas" erro={erros.parcelasMax}>
                <Escolha
                  id="l-parcelas"
                  valor={parcelasMax}
                  onChange={(n) => {
                    setParcelasMax(n);
                    if (parcelasSemJuros > n) setParcelasSemJuros(n);
                  }}
                  opcoes={Array.from({ length: 12 }, (_, i) => i + 1).map((n) => ({
                    valor: n,
                    rotulo: n === 1 ? "À vista" : `Até ${n}x`,
                    descricao: n > 1 && valorSimulado > 0 ? `${dinheiro(Math.ceil(valorSimulado / n))} por parcela sem juros` : undefined,
                  }))}
                />
              </Campo>

              {parcelasMax > 1 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Campo rotulo="Parcelas sem juros" htmlFor="l-sem-juros" dica="Acima disso, a taxa abaixo entra na conta.">
                    <Escolha
                      id="l-sem-juros"
                      valor={semJurosEfetivo}
                      onChange={setParcelasSemJuros}
                      opcoes={Array.from({ length: parcelasMax }, (_, i) => i + 1).map((n) => ({
                        valor: n,
                        rotulo: n === 1 ? "Só à vista" : `Até ${n}x`,
                        descricao: n >= parcelasMax ? "Tudo sem juros para o comprador" : undefined,
                      }))}
                    />
                  </Campo>
                  <Campo
                    rotulo="Juros ao mês"
                    htmlFor="l-juros"
                    erro={erros.jurosMensalBps ?? (jurosMensalBps === null ? "Use um número entre 0 e 20." : undefined)}
                    dica="Tabela Price, como no mercado. Zero mantém tudo sem juros."
                  >
                    <div className="flex items-center gap-2">
                      <Entrada
                        id="l-juros"
                        inputMode="decimal"
                        value={jurosTexto}
                        onChange={(e) => setJurosTexto(e.target.value)}
                        placeholder="2,99"
                        aria-invalid={jurosMensalBps === null}
                        className="max-w-28"
                      />
                      <span className="text-sm text-marinho-2">% ao mês</span>
                    </div>
                  </Campo>
                </div>
              )}

              {simulacao.length > 1 && (
                <div>
                  <p className="text-[13px] font-medium text-marinho">
                    O comprador vai ver{tudoSemJuros ? " (tudo sem juros)" : ""}
                  </p>
                  <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-[13px] text-marinho-2 sm:grid-cols-2">
                    {simulacao.map((p) => (
                      <li key={p.numero} className="flex justify-between gap-3 border-b border-gelo/70 py-1 last:border-0">
                        <span>
                          {p.numero === 1 ? "À vista" : `${p.numero}x de ${dinheiro(p.parcelaCentavos)}`}
                          {p.numero > 1 && !p.comJuros && <span className="ml-1 text-verde">sem juros</span>}
                        </span>
                        <span className={p.comJuros ? "text-bordo" : "text-marinho"}>{dinheiro(p.totalCentavos)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[12px] text-marinho-3">
                    Simulação com {dinheiro(valorSimulado)}{bumpProdutoId ? " (produto mais order bump)" : ""}. As taxas que o Asaas cobra de você seguem o contrato da sua conta.
                  </p>
                </div>
              )}
            </div>
          )}

          <Campo rotulo="Redirecionar após o pagamento" htmlFor="l-sucesso" opcional erro={erros.urlSucesso} dica="Página de obrigado ou área de membros. Em branco mostra a confirmação padrão.">
            <Entrada id="l-sucesso" type="url" value={urlSucesso} onChange={(e) => setUrlSucesso(e.target.value)} placeholder="https://..." />
          </Campo>

          <Interruptor ativo={ativo} onChange={setAtivo} rotulo="Link ativo" descricao="Inativo: a página mostra que o link não está disponível." />
        </section>

        {editando && podeExcluir && (
          <div className="rounded-panel border border-bordo/25 bg-bordo-claro/50 p-4">
            <p className="text-sm font-medium text-bordo">Excluir link</p>
            <p className="mt-0.5 text-[13px] text-marinho-2">Só é possível se não houver pedidos neste link. Caso contrário, desative-o.</p>
            {confirmandoExclusao ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variante="perigo" tamanho="sm" icone={<IconeLixeira tamanho={15} />} carregando={salvando} onClick={excluir}>
                  Confirmar exclusão
                </Button>
                <Button variante="fantasma" tamanho="sm" onClick={() => setConfirmandoExclusao(false)}>
                  Manter link
                </Button>
              </div>
            ) : (
              <Button variante="secundario" tamanho="sm" className="mt-3 text-bordo hover:border-bordo hover:text-bordo" onClick={() => setConfirmandoExclusao(true)}>
                Excluir este link
              </Button>
            )}
          </div>
        )}
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Gaveta>
  );
}
