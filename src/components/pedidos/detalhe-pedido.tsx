"use client";

import { useEffect, useState } from "react";
import { METODO_ROTULO, STATUS_UI, type PedidoDetalhe as Detalhe } from "@/components/pedidos/tipos";
import { Selo } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gaveta } from "@/components/ui/drawer";
import { IconeAtualizar, IconeCheck, IconeCopiar, IconeExterno } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { dataBr, dinheiro, mascararCpfCnpj, mascararTelefone } from "@/lib/formato";
import { chamarApi } from "@/lib/http-cliente";

type Props = {
  pedidoId: string | null;
  podeSimular: boolean;
  onFechar: () => void;
  onMudou: () => void;
};

export function DetalhePedido({ pedidoId, podeSimular, onFechar, onMudou }: Props) {
  const { notificar } = useToast();
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);
  const [acao, setAcao] = useState<"sincronizar" | "simular" | null>(null);

  useEffect(() => {
    if (!pedidoId) return;
    let ativo = true;
    chamarApi<Detalhe>(`/api/admin/pedidos/${pedidoId}`)
      .then((d) => ativo && setDetalhe(d))
      .catch((e: Error) => ativo && setErro(e.message));
    return () => {
      ativo = false;
    };
  }, [pedidoId, versao]);

  async function sincronizar() {
    if (!pedidoId) return;
    setAcao("sincronizar");
    try {
      const d = await chamarApi<Detalhe>(`/api/admin/pedidos/${pedidoId}?sincronizar=1`);
      setDetalhe(d);
      onMudou();
      notificar({ tom: "info", titulo: "Sincronizado com o Asaas", descricao: `Status: ${STATUS_UI[d.pedido.status].rotulo}.` });
    } catch (e) {
      notificar({ tom: "erro", titulo: "Falha ao sincronizar", descricao: (e as Error).message });
    } finally {
      setAcao(null);
    }
  }

  async function simular() {
    if (!pedidoId) return;
    setAcao("simular");
    try {
      await chamarApi(`/api/admin/pedidos/${pedidoId}/simular-pagamento`, { method: "POST" });
      setVersao((v) => v + 1);
      onMudou();
      notificar({ tom: "sucesso", titulo: "Pagamento simulado", descricao: "O pedido foi marcado como pago, como se o webhook tivesse chegado." });
    } catch (e) {
      notificar({ tom: "erro", titulo: "Não foi possível simular", descricao: (e as Error).message });
    } finally {
      setAcao(null);
    }
  }

  async function copiar(texto: string, rotulo: string) {
    try {
      await navigator.clipboard.writeText(texto);
      notificar({ tom: "sucesso", titulo: `${rotulo} copiado` });
    } catch {
      notificar({ tom: "erro", titulo: "Não foi possível copiar" });
    }
  }

  const p = detalhe?.pedido;

  return (
    <Gaveta
      aberta={Boolean(pedidoId)}
      onFechar={onFechar}
      largura="lg"
      titulo={p ? `Pedido #${p.numero}` : "Pedido"}
      descricao={p ? `${dataBr(p.criadoEm)} · ${METODO_ROTULO[p.metodo]}${p.parcelas > 1 ? ` em ${p.parcelas}x` : ""}` : undefined}
      rodape={
        p ? (
          <>
            <Button variante="secundario" tamanho="sm" icone={<IconeAtualizar tamanho={15} />} carregando={acao === "sincronizar"} onClick={sincronizar} disabled={!p.asaasCobrancaId}>
              Sincronizar com o Asaas
            </Button>
            {podeSimular && (p.status === "aguardando" || p.status === "em_analise") && (
              <Button variante="dourado" tamanho="sm" icone={<IconeCheck tamanho={15} />} carregando={acao === "simular"} onClick={simular}>
                Simular pagamento
              </Button>
            )}
          </>
        ) : undefined
      }
    >
      {erro ? (
        <p className="text-sm text-bordo">{erro}</p>
      ) : !detalhe || !p ? (
        <div className="flex items-center gap-2 py-8 text-sm text-marinho-2">
          <Spinner /> Carregando pedido
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Selo tom={STATUS_UI[p.status].tom} ponto className="text-[13px]">
              {STATUS_UI[p.status].rotulo}
            </Selo>
            <span className="font-display text-2xl font-semibold text-marinho">{dinheiro(p.valorTotalCentavos)}</span>
          </div>

          <section>
            <h3 className="mb-2 text-[13px] font-medium text-marinho-3">Itens</h3>
            <ul className="divide-y divide-gelo rounded-panel border border-gelo">
              {detalhe.itens.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="flex items-center gap-2 text-marinho">
                    {i.nome}
                    {i.tipo === "order_bump" && <Selo tom="dourado">order bump</Selo>}
                  </span>
                  <span className="text-marinho-2">{dinheiro(i.precoCentavos * i.quantidade)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-[13px] font-medium text-marinho-3">Cliente</h3>
              <dl className="flex flex-col gap-1 text-sm">
                <dd className="font-medium text-marinho">{p.clienteNome}</dd>
                <dd className="text-marinho-2">{p.clienteEmail}</dd>
                <dd className="text-marinho-2">{mascararCpfCnpj(p.clienteCpfCnpj)}</dd>
                {p.clienteTelefone && <dd className="text-marinho-2">{mascararTelefone(p.clienteTelefone)}</dd>}
              </dl>
            </div>
            <div>
              <h3 className="mb-2 text-[13px] font-medium text-marinho-3">Origem</h3>
              <dl className="flex flex-col gap-1 text-sm">
                <dd className="text-marinho">{detalhe.link ? `${detalhe.link.nome} (/c/${detalhe.link.codigo})` : "Link removido"}</dd>
                {p.utm && Object.keys(p.utm).length > 0 && (
                  <dd className="text-[12px] text-marinho-2">
                    {Object.entries(p.utm)
                      .map(([k, v]) => `${k}=${v}`)
                      .join(" · ")}
                  </dd>
                )}
                {p.ip && <dd className="font-mono text-[12px] text-marinho-3">{p.ip}</dd>}
              </dl>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-[13px] font-medium text-marinho-3">Asaas</h3>
            {p.asaasCobrancaId ? (
              <div className="flex flex-col gap-2 rounded-panel border border-gelo p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-[13px] text-marinho-2">{p.asaasCobrancaId}</span>
                  <span className="text-[12px] text-marinho-3">status Asaas: {p.asaasStatus ?? "—"}</span>
                </div>
                {p.metodo === "cartao" && p.cartaoBandeira && (
                  <p className="text-marinho-2">
                    {p.cartaoBandeira} final {p.cartaoFinal}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  {p.asaasInvoiceUrl && (
                    <Button variante="secundario" tamanho="sm" icone={<IconeExterno tamanho={15} />} href={p.asaasInvoiceUrl} target="_blank" rel="noreferrer">
                      Fatura no Asaas
                    </Button>
                  )}
                  {p.asaasBoletoUrl && (
                    <Button variante="secundario" tamanho="sm" icone={<IconeExterno tamanho={15} />} href={p.asaasBoletoUrl} target="_blank" rel="noreferrer">
                      Boleto (PDF)
                    </Button>
                  )}
                  {p.pixPayload && (
                    <Button variante="secundario" tamanho="sm" icone={<IconeCopiar tamanho={15} />} onClick={() => copiar(p.pixPayload!, "Código Pix")}>
                      Copiar Pix
                    </Button>
                  )}
                  {p.boletoLinhaDigitavel && (
                    <Button variante="secundario" tamanho="sm" icone={<IconeCopiar tamanho={15} />} onClick={() => copiar(p.boletoLinhaDigitavel!, "Linha digitável")}>
                      Copiar linha digitável
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-marinho-2">Nenhuma cobrança foi criada para este pedido.</p>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-[13px] font-medium text-marinho-3">Linha do tempo</h3>
            <ol className="relative flex flex-col gap-3 border-l border-gelo pl-4">
              {detalhe.eventos.map((e) => (
                <li key={e.id} className="relative text-sm">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-chip border-2 border-branco bg-azul" />
                  <p className="text-marinho">{e.descricao}</p>
                  <p className="text-[12px] text-marinho-3">{dataBr(e.criadoEm, { dateStyle: "short", timeStyle: "medium" })}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </Gaveta>
  );
}
