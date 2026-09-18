"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { IconeCheck, IconeCopiar, IconeExterno, IconeRelogio } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import { dataBr, dinheiro } from "@/lib/formato";
import { enviarEvento, reais, type ItemGtm } from "@/lib/gtm/eventos";
import type { PedidoPublico } from "@/lib/pedidos/consultas";

type Props = { inicial: PedidoPublico; codigo: string };

const INTERVALO_MS = 4000;

function marcarUmaVez(chave: string) {
  try {
    if (sessionStorage.getItem(chave)) return false;
    sessionStorage.setItem(chave, "1");
    return true;
  } catch {
    return true;
  }
}

export function Pagamento({ inicial, codigo }: Props) {
  const [pedido, setPedido] = useState(inicial);
  const [copiado, setCopiado] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());
  const statusAnterior = useRef(inicial.status);

  const itens: ItemGtm[] = pedido.itens.map((i, idx) => ({
    item_id: `${pedido.id}-${idx}`,
    item_name: i.nome,
    price: reais(i.precoCentavos),
    quantity: 1,
    item_category: i.tipo === "order_bump" ? "order_bump" : "principal",
  }));

  // Eventos de geração do pagamento (uma vez por pedido, mesmo com recarregamento).
  useEffect(() => {
    const ecommerce = { currency: "BRL" as const, value: reais(pedido.valorTotalCentavos), items: itens, payment_type: pedido.metodo };
    if (marcarUmaVez(`gtm:gerado:${pedido.id}`)) {
      enviarEvento(pedido.metodo === "pix" ? "pix_gerado" : pedido.metodo === "boleto" ? "boleto_gerado" : "cartao_enviado", ecommerce, { pedido: pedido.numero });
      if (!pedido.final) enviarEvento("aguardando_pagamento", ecommerce, { pedido: pedido.numero });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Eventos de resultado, quando o status muda (ou já nasce final).
  useEffect(() => {
    const ecommerce = { currency: "BRL" as const, value: reais(pedido.valorTotalCentavos), items: itens, payment_type: pedido.metodo, transaction_id: String(pedido.numero) };
    if (pedido.status === "pago" && marcarUmaVez(`gtm:purchase:${pedido.id}`)) {
      enviarEvento("purchase", ecommerce, { pedido: pedido.numero, bump: pedido.itens.some((i) => i.tipo === "order_bump") });
    } else if (pedido.status === "expirado" && marcarUmaVez(`gtm:expirado:${pedido.id}`)) {
      enviarEvento("pagamento_expirado", ecommerce);
    } else if (pedido.status === "recusado" && statusAnterior.current !== "recusado" && marcarUmaVez(`gtm:recusado:${pedido.id}`)) {
      enviarEvento("pagamento_recusado", ecommerce);
    }
    statusAnterior.current = pedido.status;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido.status]);

  // Consulta o status até virar final.
  useEffect(() => {
    if (pedido.final) return;
    let ativo = true;
    const t = window.setInterval(async () => {
      try {
        const r = await fetch(`/api/pedidos/${pedido.id}`, { cache: "no-store" });
        if (!r.ok) return;
        const { pedido: novo } = (await r.json()) as { pedido: PedidoPublico };
        if (ativo && novo.status !== pedido.status) setPedido(novo);
      } catch {}
    }, INTERVALO_MS);
    return () => {
      ativo = false;
      window.clearInterval(t);
    };
  }, [pedido.id, pedido.final, pedido.status]);

  // Relógio para o contador do Pix.
  useEffect(() => {
    if (pedido.metodo !== "pix" || pedido.final) return;
    const t = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [pedido.metodo, pedido.final]);

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {}
  }

  const resumo = (
    <dl className="flex flex-col gap-1.5 rounded-panel border border-gelo bg-neve p-4 text-sm">
      {pedido.itens.map((i, idx) => (
        <div key={idx} className="flex justify-between gap-3">
          <dt className="text-marinho-2">{i.nome}</dt>
          <dd className="text-marinho">{dinheiro(i.precoCentavos)}</dd>
        </div>
      ))}
      <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-gelo pt-2">
        <dt className="font-medium text-marinho">Total</dt>
        <dd className="font-display text-xl font-semibold text-marinho">{dinheiro(pedido.valorTotalCentavos)}</dd>
      </div>
      {pedido.metodo === "cartao" && pedido.parcelas > 1 && <p className="text-right text-[12px] text-marinho-3">{pedido.parcelas}x no cartão</p>}
    </dl>
  );

  // ── Pago ────────────────────────────────────────────────────
  if (pedido.status === "pago") {
    return (
      <div className="mx-auto max-w-lg animate-rise rounded-card border border-gelo bg-branco p-6 text-center shadow-card sm:p-8">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-chip bg-dourado-claro text-dourado-escuro ring-4 ring-dourado/30">
          <IconeCheck tamanho={30} />
        </span>
        <h1 className="mt-5 text-2xl font-semibold">Pagamento confirmado</h1>
        <p className="mt-2 text-[15px] text-marinho-2">
          Obrigado, {pedido.clienteNome.split(" ")[0]}. Enviamos a confirmação para <span className="font-medium text-marinho">{pedido.clienteEmail}</span>.
        </p>
        <div className="mt-6 text-left">{resumo}</div>
        <p className="mt-3 text-[12px] text-marinho-3">
          Pedido #{pedido.numero} · {pedido.pagoEm ? dataBr(pedido.pagoEm) : ""}
        </p>
        {pedido.urlSucesso ? (
          <Button href={pedido.urlSucesso} tamanho="lg" className="mt-6 w-full">
            Continuar
          </Button>
        ) : (
          pedido.invoiceUrl && (
            <Button variante="secundario" href={pedido.invoiceUrl} target="_blank" rel="noreferrer" icone={<IconeExterno tamanho={16} />} className="mt-6">
              Ver comprovante
            </Button>
          )
        )}
      </div>
    );
  }

  // ── Recusado / expirado / cancelado / estornado ─────────────
  if (pedido.final || pedido.status === "em_analise") {
    const textos: Record<string, { titulo: string; corpo: string }> = {
      recusado: { titulo: "Pagamento não autorizado", corpo: "A operadora do cartão recusou a transação. Você pode tentar com outro cartão ou escolher Pix." },
      expirado: { titulo: "Este pagamento expirou", corpo: "O prazo para pagar terminou. Gere um novo pagamento para continuar." },
      cancelado: { titulo: "Pagamento cancelado", corpo: "Esta cobrança foi cancelada. Se precisar, gere um novo pagamento." },
      estornado: { titulo: "Pagamento estornado", corpo: "O valor foi devolvido. Qualquer dúvida, fale com o suporte." },
      em_analise: { titulo: "Pagamento em análise", corpo: "A operadora está analisando a transação. Avisamos por e-mail assim que for aprovada; costuma levar alguns minutos." },
    };
    const t = textos[pedido.status];
    return (
      <div className="mx-auto max-w-lg rounded-card border border-gelo bg-branco p-6 text-center shadow-card sm:p-8">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-chip bg-neve text-marinho-2">
          {pedido.status === "em_analise" ? <Spinner tamanho={24} /> : <IconeRelogio tamanho={26} />}
        </span>
        <h1 className="mt-5 text-2xl font-semibold">{t.titulo}</h1>
        <p className="mt-2 text-[15px] text-marinho-2">{t.corpo}</p>
        <div className="mt-6 text-left">{resumo}</div>
        {pedido.status !== "em_analise" && pedido.status !== "estornado" && (
          <Link href={`/c/${codigo}`} className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-control bg-azul px-5 text-[15px] font-medium text-branco hover:bg-azul-escuro">
            Gerar novo pagamento
          </Link>
        )}
      </div>
    );
  }

  // ── Aguardando: Pix ─────────────────────────────────────────
  if (pedido.metodo === "pix" && pedido.pix) {
    const expira = pedido.pix.expiraEm ? new Date(pedido.pix.expiraEm).getTime() : null;
    const restante = expira ? Math.max(0, expira - agora) : null;
    const textoRestante =
      restante === null
        ? null
        : restante >= 3_600_000
          ? `Válido por ${Math.floor(restante / 3_600_000)}h ${String(Math.floor((restante % 3_600_000) / 60_000)).padStart(2, "0")}min`
          : `Válido por ${String(Math.floor(restante / 60_000)).padStart(2, "0")}:${String(Math.floor((restante % 60_000) / 1000)).padStart(2, "0")}`;
    return (
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="rounded-card border border-gelo bg-branco p-5 shadow-card sm:p-6">
          <div className="flex items-center gap-2 text-[13px] font-medium text-ambar">
            <Spinner tamanho={16} />
            Aguardando pagamento
          </div>
          <h1 className="mt-2 text-2xl font-semibold">Pague com Pix</h1>
          <p className="mt-1 text-[15px] text-marinho-2">Escaneie o QR Code ou copie o código. Assim que o banco confirmar, esta página atualiza sozinha.</p>

          <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="colchetes rounded-panel border border-gelo bg-branco p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`data:image/png;base64,${pedido.pix.imagemBase64}`} alt="QR Code Pix" width={220} height={220} className="h-[220px] w-[220px]" />
            </div>
            <div className="flex w-full min-w-0 flex-1 flex-col gap-3">
              <label className="text-[13px] font-medium text-marinho" htmlFor="pix-codigo">
                Pix copia e cola
              </label>
              <textarea id="pix-codigo" readOnly value={pedido.pix.payload} rows={4} className="w-full resize-none rounded-control border border-gelo bg-neve px-3 py-2 font-mono text-[12px] text-marinho-2" onFocus={(e) => e.currentTarget.select()} />
              <Button tamanho="lg" icone={copiado ? <IconeCheck tamanho={18} /> : <IconeCopiar tamanho={18} />} onClick={() => copiar(pedido.pix!.payload)} className="w-full">
                {copiado ? "Código copiado" : "Copiar código Pix"}
              </Button>
              {restante !== null && (
                <p className="flex items-center justify-center gap-1.5 text-[13px] text-marinho-3">
                  <IconeRelogio tamanho={15} />
                  {restante > 0 ? textoRestante : "Código expirado"}
                </p>
              )}
            </div>
          </div>

          <ol className="mt-6 grid grid-cols-1 gap-3 border-t border-gelo pt-5 text-[13px] text-marinho-2 sm:grid-cols-3">
            {["Abra o app do seu banco e escolha pagar com Pix.", "Escaneie o QR Code ou cole o código copiado.", "Confirme o valor e finalize. A confirmação é imediata."].map((passo, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-chip border border-gelo font-display text-[11px] font-semibold text-marinho-3">{i + 1}</span>
                {passo}
              </li>
            ))}
          </ol>
        </div>
        <aside className="lg:sticky lg:top-6">
          {resumo}
          <p className="mt-3 text-center text-[12px] text-marinho-3">Pedido #{pedido.numero} · {pedido.clienteEmail}</p>
        </aside>
      </div>
    );
  }

  // ── Aguardando: Boleto ──────────────────────────────────────
  if (pedido.metodo === "boleto" && pedido.boleto) {
    return (
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="rounded-card border border-gelo bg-branco p-5 shadow-card sm:p-6">
          <div className="flex items-center gap-2 text-[13px] font-medium text-ambar">
            <Spinner tamanho={16} />
            Aguardando pagamento
          </div>
          <h1 className="mt-2 text-2xl font-semibold">Seu boleto está pronto</h1>
          <p className="mt-1 text-[15px] text-marinho-2">
            Pague até <span className="font-medium text-marinho">{pedido.boleto.vencimento ? dataBr(`${pedido.boleto.vencimento}T12:00:00`, { dateStyle: "long" }) : "o vencimento"}</span> em qualquer banco ou app. A confirmação leva até 3 dias úteis e avisamos por e-mail.
          </p>
          <label className="mt-5 block text-[13px] font-medium text-marinho" htmlFor="linha">
            Linha digitável
          </label>
          <textarea id="linha" readOnly value={pedido.boleto.linhaDigitavel} rows={2} className="mt-1.5 w-full resize-none rounded-control border border-gelo bg-neve px-3 py-2 font-mono text-[13px] text-marinho-2" onFocus={(e) => e.currentTarget.select()} />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button tamanho="lg" icone={copiado ? <IconeCheck tamanho={18} /> : <IconeCopiar tamanho={18} />} onClick={() => copiar(pedido.boleto!.linhaDigitavel)} className="flex-1">
              {copiado ? "Copiada" : "Copiar linha digitável"}
            </Button>
            {pedido.boleto.url && (
              <Button variante="secundario" tamanho="lg" icone={<IconeExterno tamanho={18} />} href={pedido.boleto.url} target="_blank" rel="noreferrer" className="flex-1">
                Abrir boleto em PDF
              </Button>
            )}
          </div>
        </div>
        <aside className="lg:sticky lg:top-6">
          {resumo}
          <p className="mt-3 text-center text-[12px] text-marinho-3">Pedido #{pedido.numero} · {pedido.clienteEmail}</p>
        </aside>
      </div>
    );
  }

  // ── Aguardando: cartão (pendente sem análise) ou dados ausentes ──
  return (
    <div className="mx-auto max-w-lg rounded-card border border-gelo bg-branco p-6 text-center shadow-card sm:p-8">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-chip bg-neve text-azul">
        <Spinner tamanho={24} />
      </span>
      <h1 className="mt-5 text-2xl font-semibold">Processando seu pagamento</h1>
      <p className="mt-2 text-[15px] text-marinho-2">Estamos confirmando com a operadora. Isso leva poucos segundos; esta página atualiza sozinha.</p>
      <div className="mt-6 text-left">{resumo}</div>
    </div>
  );
}
