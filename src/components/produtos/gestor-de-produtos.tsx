"use client";

import { useCallback, useEffect, useState } from "react";
import { FormularioProduto } from "@/components/produtos/formulario-produto";
import type { ProdutoLista } from "@/components/produtos/tipos";
import { CabecalhoPagina } from "@/components/shell/cabecalho-pagina";
import { Selo } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EstadoVazio, Painel } from "@/components/ui/card";
import { IconeCaixa, IconeMais } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import { dinheiro } from "@/lib/formato";
import { chamarApi } from "@/lib/http-cliente";

type Gaveta = { modo: "fechada" } | { modo: "novo" } | { modo: "editar"; produto: ProdutoLista };

export function GestorDeProdutos({ podeExcluir }: { podeExcluir: boolean }) {
  const [produtos, setProdutos] = useState<ProdutoLista[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);
  const [gaveta, setGaveta] = useState<Gaveta>({ modo: "fechada" });

  useEffect(() => {
    let ativo = true;
    chamarApi<{ produtos: ProdutoLista[] }>("/api/admin/produtos?todos=1")
      .then((r) => ativo && setProdutos(r.produtos))
      .catch((e: Error) => ativo && setErro(e.message));
    return () => {
      ativo = false;
    };
  }, [versao]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);
  const fechar = () => setGaveta({ modo: "fechada" });
  const chave = gaveta.modo === "editar" ? gaveta.produto.id : gaveta.modo;

  return (
    <>
      <CabecalhoPagina
        titulo="Produtos"
        descricao="O que você vende. Cada produto pode ter vários links de checkout e servir de order bump."
        acoes={
          <Button icone={<IconeMais tamanho={16} />} onClick={() => setGaveta({ modo: "novo" })}>
            Novo produto
          </Button>
        }
      />

      <Painel semPreenchimento>
        {erro ? (
          <EstadoVazio titulo="Não foi possível carregar os produtos" descricao={erro} acao={<Button variante="secundario" tamanho="sm" onClick={recarregar}>Tentar de novo</Button>} />
        ) : !produtos ? (
          <div className="flex items-center justify-center gap-2 px-6 py-14 text-sm text-marinho-2">
            <Spinner /> Carregando produtos
          </div>
        ) : produtos.length === 0 ? (
          <EstadoVazio
            icone={<IconeCaixa />}
            titulo="Nenhum produto ainda"
            descricao="Cadastre o primeiro produto para gerar um link de checkout."
            acao={
              <Button icone={<IconeMais tamanho={16} />} onClick={() => setGaveta({ modo: "novo" })}>
                Novo produto
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-gelo">
            {produtos.map((p) => (
              <li key={p.id} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-gelo-2/60 sm:px-5">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-panel border border-gelo bg-neve">
                  {p.imagem ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imagem} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <IconeCaixa className="text-marinho-3" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-marinho">
                    <span className="truncate">{p.nome}</span>
                    {!p.ativo && <Selo tom="neutro">Inativo</Selo>}
                  </p>
                  <p className="truncate text-[13px] text-marinho-2">
                    {p.totalLinks === 0 ? "Sem links" : p.totalLinks === 1 ? "1 link de checkout" : `${p.totalLinks} links de checkout`}
                    {p.descricao ? ` · ${p.descricao}` : ""}
                  </p>
                </div>
                <span className="hidden font-display text-[15px] font-semibold text-marinho sm:block">{dinheiro(p.precoCentavos)}</span>
                <Button variante="secundario" tamanho="sm" onClick={() => setGaveta({ modo: "editar", produto: p })}>
                  Editar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Painel>

      <FormularioProduto
        key={chave}
        aberta={gaveta.modo !== "fechada"}
        produto={gaveta.modo === "editar" ? gaveta.produto : null}
        podeExcluir={podeExcluir}
        onFechar={fechar}
        onSalvo={() => {
          fechar();
          recarregar();
        }}
      />
    </>
  );
}
