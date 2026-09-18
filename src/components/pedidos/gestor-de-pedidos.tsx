"use client";

import { useCallback, useEffect, useState } from "react";
import { DetalhePedido } from "@/components/pedidos/detalhe-pedido";
import { METODO_ROTULO, STATUS_UI, type PedidoLista } from "@/components/pedidos/tipos";
import { CabecalhoPagina } from "@/components/shell/cabecalho-pagina";
import { Selo } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EstadoVazio, Painel } from "@/components/ui/card";
import { Escolha } from "@/components/ui/escolha";
import { Entrada } from "@/components/ui/field";
import { IconeAtualizar, IconeBusca, IconeCheckout } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import { STATUS_PEDIDO, type StatusPedido } from "@/lib/dominio";
import { dinheiro } from "@/lib/formato";
import { chamarApi } from "@/lib/http-cliente";
import { tempoRelativo } from "@/lib/utils";

type Resposta = { pedidos: PedidoLista[]; total: number; pagina: number; porPagina: number };

export function GestorDePedidos({ podeSimular }: { podeSimular: boolean }) {
  const [busca, setBusca] = useState("");
  const [consulta, setConsulta] = useState<{ termo: string; status: StatusPedido | ""; pagina: number; recarga: number }>({
    termo: "",
    status: "",
    pagina: 0,
    recarga: 0,
  });
  const [dados, setDados] = useState<Resposta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);

  const consultar = useCallback((mudanca: Partial<typeof consulta>) => {
    setCarregando(true);
    setConsulta((atual) => ({ ...atual, ...mudanca }));
  }, []);
  const recarregar = useCallback(() => consultar({ recarga: Date.now() }), [consultar]);

  useEffect(() => {
    let ativo = true;
    const params = new URLSearchParams({ pagina: String(consulta.pagina), porPagina: "25" });
    if (consulta.termo) params.set("q", consulta.termo);
    if (consulta.status) params.set("status", consulta.status);
    chamarApi<Resposta>(`/api/admin/pedidos?${params}`)
      .then((r) => {
        if (!ativo) return;
        setDados(r);
        setErro(null);
      })
      .catch((e: Error) => ativo && setErro(e.message))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [consulta]);

  useEffect(() => {
    const limpo = busca.trim();
    if (limpo === consulta.termo) return;
    const t = window.setTimeout(() => consultar({ termo: limpo, pagina: 0 }), 350);
    return () => window.clearTimeout(t);
  }, [busca, consulta.termo, consultar]);

  const inicio = dados ? dados.pagina * dados.porPagina + 1 : 0;
  const fim = dados ? Math.min(dados.total, (dados.pagina + 1) * dados.porPagina) : 0;

  return (
    <>
      <CabecalhoPagina titulo="Pedidos" descricao="Todas as tentativas de compra, com o status sincronizado com o Asaas." />

      <Painel semPreenchimento>
        <div className="flex flex-wrap items-center gap-3 border-b border-gelo px-4 py-3">
          <div className="relative min-w-[220px] flex-1">
            <IconeBusca tamanho={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-marinho-3" />
            <Entrada type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome, e-mail, CPF, nº do pedido ou id da cobrança" aria-label="Buscar pedidos" className="pl-9" />
          </div>
          <div className="w-48">
            <Escolha
              valor={consulta.status}
              onChange={(v) => consultar({ status: v as StatusPedido | "", pagina: 0 })}
              aria-label="Filtrar por status"
              opcoes={[
                { valor: "", rotulo: "Todos os status" },
                ...STATUS_PEDIDO.map((s) => ({ valor: s as string, rotulo: STATUS_UI[s].rotulo })),
              ]}
            />
          </div>
          <Button variante="fantasma" tamanho="sm" icone={<IconeAtualizar tamanho={15} />} onClick={recarregar} disabled={carregando}>
            Atualizar
          </Button>
        </div>

        {erro ? (
          <EstadoVazio titulo="Não foi possível carregar os pedidos" descricao={erro} acao={<Button variante="secundario" tamanho="sm" onClick={recarregar}>Tentar de novo</Button>} />
        ) : carregando && !dados ? (
          <div className="flex items-center justify-center gap-2 px-6 py-14 text-sm text-marinho-2">
            <Spinner /> Carregando pedidos
          </div>
        ) : dados && dados.pedidos.length === 0 ? (
          <EstadoVazio
            icone={<IconeCheckout />}
            titulo={consulta.termo || consulta.status ? "Nenhum pedido encontrado" : "Nenhum pedido ainda"}
            descricao={consulta.termo || consulta.status ? "Tente outros filtros." : "Quando alguém abrir um link de checkout e gerar um pagamento, ele aparece aqui."}
          />
        ) : (
          <div className="rolagem-fina overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="text-[12px] text-marinho-3">
                  <th className="px-4 py-2.5 font-medium">Pedido</th>
                  <th className="px-4 py-2.5 font-medium">Cliente</th>
                  <th className="px-4 py-2.5 font-medium">Link</th>
                  <th className="px-4 py-2.5 font-medium">Pagamento</th>
                  <th className="px-4 py-2.5 text-right font-medium">Valor</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Quando</th>
                </tr>
              </thead>
              <tbody className={carregando ? "opacity-60" : undefined}>
                {dados?.pedidos.map((p) => (
                  <tr key={p.id} className="cursor-pointer border-t border-gelo transition-colors hover:bg-gelo-2/60" onClick={() => setAberto(p.id)}>
                    <td className="px-4 py-3 font-mono text-[13px] text-marinho-2">#{p.numero}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-marinho">{p.clienteNome}</p>
                      <p className="text-[13px] text-marinho-2">{p.clienteEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-marinho-2">
                      {p.linkNome ?? "—"}
                      {p.bumpAceito && (
                        <Selo tom="dourado" className="ml-2">
                          bump
                        </Selo>
                      )}
                    </td>
                    <td className="px-4 py-3 text-marinho-2">
                      {METODO_ROTULO[p.metodo]}
                      {p.metodo === "cartao" && p.parcelas > 1 ? ` ${p.parcelas}x` : ""}
                    </td>
                    <td className="px-4 py-3 text-right font-display font-semibold text-marinho">{dinheiro(p.valorTotalCentavos + p.jurosCentavos)}</td>
                    <td className="px-4 py-3">
                      <Selo tom={STATUS_UI[p.status].tom} ponto>
                        {STATUS_UI[p.status].rotulo}
                      </Selo>
                    </td>
                    <td className="px-4 py-3 text-marinho-2">{tempoRelativo(p.criadoEm)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {dados && dados.total > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-gelo px-4 py-3 text-[13px] text-marinho-2">
            <span>
              Mostrando {inicio} a {fim} de {dados.total}
            </span>
            <div className="flex gap-2">
              <Button variante="secundario" tamanho="sm" disabled={consulta.pagina === 0 || carregando} onClick={() => consultar({ pagina: consulta.pagina - 1 })}>
                Anterior
              </Button>
              <Button variante="secundario" tamanho="sm" disabled={fim >= dados.total || carregando} onClick={() => consultar({ pagina: consulta.pagina + 1 })}>
                Próxima
              </Button>
            </div>
          </div>
        )}
      </Painel>

      <DetalhePedido
        key={aberto ?? "fechado"}
        pedidoId={aberto}
        podeSimular={podeSimular}
        onFechar={() => setAberto(null)}
        onMudou={recarregar}
      />
    </>
  );
}
