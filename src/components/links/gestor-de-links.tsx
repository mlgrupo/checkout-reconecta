"use client";

import { useCallback, useEffect, useState } from "react";
import { FormularioLink } from "@/components/links/formulario-link";
import { METODO_INFO, type LinkLista } from "@/components/links/tipos";
import type { ProdutoLista } from "@/components/produtos/tipos";
import { CabecalhoPagina } from "@/components/shell/cabecalho-pagina";
import { Selo } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EstadoVazio, Painel } from "@/components/ui/card";
import { IconeCopiar, IconeExterno, IconeLink, IconeMais, IconePincel } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { dinheiro } from "@/lib/formato";
import { chamarApi } from "@/lib/http-cliente";

type Gaveta = { modo: "fechada" } | { modo: "novo" } | { modo: "editar"; link: LinkLista };

export function GestorDeLinks({ podeExcluir }: { podeExcluir: boolean }) {
  const { notificar } = useToast();
  const [links, setLinks] = useState<LinkLista[] | null>(null);
  const [produtos, setProdutos] = useState<ProdutoLista[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);
  const [gaveta, setGaveta] = useState<Gaveta>({ modo: "fechada" });

  useEffect(() => {
    let ativo = true;
    Promise.all([
      chamarApi<{ links: LinkLista[] }>("/api/admin/links"),
      chamarApi<{ produtos: ProdutoLista[] }>("/api/admin/produtos?todos=1"),
    ])
      .then(([l, p]) => {
        if (!ativo) return;
        setLinks(l.links);
        setProdutos(p.produtos);
      })
      .catch((e: Error) => ativo && setErro(e.message));
    return () => {
      ativo = false;
    };
  }, [versao]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);
  const fechar = () => setGaveta({ modo: "fechada" });
  const chave = gaveta.modo === "editar" ? gaveta.link.id : gaveta.modo;

  async function copiar(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      notificar({ tom: "sucesso", titulo: "Link copiado", descricao: url });
    } catch {
      notificar({ tom: "erro", titulo: "Não foi possível copiar", descricao: url });
    }
  }

  const semProdutos = produtos.length === 0;

  return (
    <>
      <CabecalhoPagina
        titulo="Links de checkout"
        descricao="Cada link vende um produto e pode oferecer um order bump. Compartilhe a URL em anúncios, e-mails e redes."
        acoes={
          <Button icone={<IconeMais tamanho={16} />} onClick={() => setGaveta({ modo: "novo" })} disabled={semProdutos}>
            Novo link
          </Button>
        }
      />

      <Painel semPreenchimento>
        {erro ? (
          <EstadoVazio titulo="Não foi possível carregar os links" descricao={erro} acao={<Button variante="secundario" tamanho="sm" onClick={recarregar}>Tentar de novo</Button>} />
        ) : !links ? (
          <div className="flex items-center justify-center gap-2 px-6 py-14 text-sm text-marinho-2">
            <Spinner /> Carregando links
          </div>
        ) : links.length === 0 ? (
          <EstadoVazio
            icone={<IconeLink />}
            titulo={semProdutos ? "Cadastre um produto primeiro" : "Nenhum link ainda"}
            descricao={semProdutos ? "Links de checkout precisam de um produto para vender." : "Crie o primeiro link e comece a receber."}
            acao={
              semProdutos ? (
                <Button href="/produtos" variante="secundario">
                  Ir para produtos
                </Button>
              ) : (
                <Button icone={<IconeMais tamanho={16} />} onClick={() => setGaveta({ modo: "novo" })}>
                  Novo link
                </Button>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-gelo">
            {links.map((l) => (
              <li key={l.id} className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-gelo-2/60 sm:flex-row sm:items-center sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-marinho">
                    <span className="truncate">{l.nome}</span>
                    {!l.ativo && <Selo tom="neutro">Inativo</Selo>}
                    {l.bump && <Selo tom="dourado">order bump</Selo>}
                    {l.aparencia && Object.keys(l.aparencia).length > 0 && <Selo tom="azul">aparência própria</Selo>}
                  </p>
                  <p className="mt-0.5 truncate text-[13px] text-marinho-2">
                    {l.produto.nome} · {dinheiro(l.produto.precoCentavos)}
                    {l.bump ? ` + ${l.bump.nome} (${dinheiro(l.bumpPrecoCentavos ?? l.bump.precoCentavos)})` : ""}
                  </p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-marinho-3">
                    <span className="font-mono text-marinho-2">/c/{l.codigo}</span>
                    <span>{l.metodos.map((m) => METODO_INFO[m].rotulo).join(", ")}</span>
                    <span>
                      {l.pedidosPagos} pago{l.pedidosPagos === 1 ? "" : "s"} de {l.totalPedidos} pedido{l.totalPedidos === 1 ? "" : "s"}
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button variante="secundario" tamanho="sm" icone={<IconeCopiar tamanho={15} />} onClick={() => copiar(l.url)}>
                    Copiar link
                  </Button>
                  <Button variante="fantasma" tamanho="sm" icone={<IconeExterno tamanho={15} />} href={l.url} target="_blank" rel="noreferrer">
                    Abrir
                  </Button>
                  <Button variante="secundario" tamanho="sm" icone={<IconePincel tamanho={15} />} href={`/links/${l.id}/aparencia`}>
                    Aparência
                  </Button>
                  <Button variante="secundario" tamanho="sm" onClick={() => setGaveta({ modo: "editar", link: l })}>
                    Editar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Painel>

      <FormularioLink
        key={chave}
        aberta={gaveta.modo !== "fechada"}
        link={gaveta.modo === "editar" ? gaveta.link : null}
        produtos={produtos}
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
