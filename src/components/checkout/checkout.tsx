"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BannerCheckout, CabecalhoOferta, Cronometro, Depoimentos, Garantia } from "@/components/checkout/blocos";
import { Button } from "@/components/ui/button";
import { Campo, Entrada, Selecao } from "@/components/ui/field";
import { IconeBoleto, IconeCadeado, IconeCheck, IconeCheckout, IconePix } from "@/components/ui/icons";
import { METODO_INFO, type Metodo } from "@/lib/dominio";
import {
  dinheiro,
  mascararCartao,
  mascararCep,
  mascararCpfCnpj,
  mascararTelefone,
  mascararValidade,
  somenteDigitos,
  validadeCartao,
  validarCpfCnpj,
  validarEmail,
  validarNumeroCartao,
  validarTelefone,
} from "@/lib/formato";
import { enviarEvento, lerUtm, reais, type ItemGtm } from "@/lib/gtm/eventos";
import { chamarApi, ErroHttp } from "@/lib/http-cliente";
import type { CheckoutPublico } from "@/lib/links";
import { cn } from "@/lib/utils";

type Props = {
  checkout: CheckoutPublico;
  /** Prévia do editor: nada é enviado ao servidor nem ao GTM. */
  modoPrevia?: boolean;
};

type Cliente = { nome: string; email: string; cpfCnpj: string; telefone: string };
type Cartao = { numero: string; nome: string; validade: string; cvv: string; cep: string; numeroEndereco: string; complemento: string };

const ICONES: Record<Metodo, React.ReactNode> = {
  pix: <IconePix tamanho={20} />,
  cartao: <IconeCheckout tamanho={20} />,
  boleto: <IconeBoleto tamanho={20} />,
};

const ORDEM: Metodo[] = ["pix", "cartao", "boleto"];

export function Checkout({ checkout, modoPrevia = false }: Props) {
  const router = useRouter();
  const metodosDisponiveis = ORDEM.filter((m) => checkout.metodos.includes(m));
  const aparencia = checkout.aparencia;

  const [cliente, setCliente] = useState<Cliente>({ nome: "", email: "", cpfCnpj: "", telefone: "" });
  const [metodo, setMetodo] = useState<Metodo>(metodosDisponiveis[0] ?? "pix");
  const [bumpAceito, setBumpAceito] = useState(false);
  const [parcelas, setParcelas] = useState(1);
  const [cartao, setCartao] = useState<Cartao>({ numero: "", nome: "", validade: "", cvv: "", cep: "", numeroEndereco: "", complemento: "" });
  const [tocados, setTocados] = useState<Record<string, boolean>>({});
  const [errosServidor, setErrosServidor] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const iniciou = useRef(false);
  const leadEnviado = useRef(false);
  const utm = useRef<Record<string, string>>({});

  const itens = useMemo<ItemGtm[]>(() => {
    const lista: ItemGtm[] = [
      { item_id: checkout.produto.id, item_name: checkout.produto.nome, price: reais(checkout.produto.precoCentavos), quantity: 1, item_category: "principal" },
    ];
    if (bumpAceito && checkout.bump) {
      lista.push({ item_id: checkout.bump.id, item_name: checkout.bump.nome, price: reais(checkout.bump.precoCentavos), quantity: 1, item_category: "order_bump" });
    }
    return lista;
  }, [checkout, bumpAceito]);
  const total = checkout.produto.precoCentavos + (bumpAceito && checkout.bump ? checkout.bump.precoCentavos : 0);

  useEffect(() => {
    if (modoPrevia) return;
    utm.current = lerUtm();
    enviarEvento("view_item", { currency: "BRL", value: reais(checkout.produto.precoCentavos), items: itens });
    // Só no carregamento: os itens iniciais são o produto principal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function aoInteragir() {
    if (iniciou.current || modoPrevia) return;
    iniciou.current = true;
    enviarEvento("begin_checkout", { currency: "BRL", value: reais(total), items: itens });
  }

  // Validação de cliente
  const errosCliente: Partial<Record<keyof Cliente, string>> = {
    nome: cliente.nome.trim().length < 3 ? "Informe seu nome completo." : undefined,
    email: !validarEmail(cliente.email) ? "Informe um e-mail válido." : undefined,
    cpfCnpj: !validarCpfCnpj(cliente.cpfCnpj) ? "CPF ou CNPJ inválido." : undefined,
    telefone: !validarTelefone(cliente.telefone) ? "Informe um celular com DDD." : undefined,
  };
  const clienteValido = !Object.values(errosCliente).some(Boolean);

  useEffect(() => {
    if (modoPrevia) return;
    if (clienteValido && !leadEnviado.current) {
      leadEnviado.current = true;
      enviarEvento("generate_lead", { currency: "BRL", value: reais(total), items: itens }, { email_informado: true });
      enviarEvento("checkout_dados_completos", undefined, { metodo });
    }
    // Dispara uma vez, quando os quatro campos ficam válidos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteValido]);

  const errosCartao: Partial<Record<keyof Cartao, string>> =
    metodo === "cartao"
      ? {
          numero: !validarNumeroCartao(cartao.numero) ? "Número de cartão inválido." : undefined,
          nome: cartao.nome.trim().length < 3 ? "Nome como está no cartão." : undefined,
          validade: validadeCartao(cartao.validade) ? undefined : "Validade inválida.",
          cvv: /^\d{3,4}$/.test(cartao.cvv) ? undefined : "CVV inválido.",
          cep: somenteDigitos(cartao.cep).length === 8 ? undefined : "CEP inválido.",
          numeroEndereco: cartao.numeroEndereco.trim() ? undefined : "Informe o número.",
        }
      : {};
  const cartaoValido = !Object.values(errosCartao).some(Boolean);
  const formularioValido = clienteValido && cartaoValido;

  const erro = (campo: string, local?: string) => errosServidor[campo] || (tocados[campo] ? local : undefined);
  const tocar = (campo: string) => setTocados((t) => ({ ...t, [campo]: true }));

  function alternarBump() {
    if (!checkout.bump) return;
    const item: ItemGtm = { item_id: checkout.bump.id, item_name: checkout.bump.nome, price: reais(checkout.bump.precoCentavos), quantity: 1, item_category: "order_bump" };
    const novo = !bumpAceito;
    setBumpAceito(novo);
    if (!modoPrevia) {
      enviarEvento(novo ? "add_to_cart" : "remove_from_cart", { currency: "BRL", value: item.price, items: [item] });
    }
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (modoPrevia) return;
    setTocados({ nome: true, email: true, cpfCnpj: true, telefone: true, numero: true, nomeCartao: true, validade: true, cvv: true, cep: true, numeroEndereco: true });
    setErrosServidor({});
    setErroGeral(null);
    if (!formularioValido) {
      setErroGeral("Confira os campos destacados antes de continuar.");
      return;
    }
    setEnviando(true);
    enviarEvento("add_payment_info", { currency: "BRL", value: reais(total), items: itens, payment_type: metodo }, { parcelas: metodo === "cartao" ? parcelas : 1 });
    try {
      const r = await chamarApi<{ pedido: { id: string } }>(`/api/checkout/${checkout.codigo}/pedidos`, {
        method: "POST",
        body: JSON.stringify({
          cliente,
          metodo,
          bumpAceito,
          parcelas: metodo === "cartao" ? parcelas : undefined,
          cartao: metodo === "cartao" ? cartao : undefined,
          utm: utm.current,
        }),
      });
      try {
        sessionStorage.setItem(`gtm:novo:${r.pedido.id}`, "1");
      } catch {}
      router.push(`/c/${checkout.codigo}/pedido/${r.pedido.id}`);
    } catch (err) {
      const falha = err as ErroHttp;
      if (falha.campos) {
        const mapeados: Record<string, string> = {};
        for (const [k, v] of Object.entries(falha.campos)) mapeados[k.replace(/^cliente\./, "").replace(/^cartao\./, "")] = v;
        setErrosServidor(mapeados);
      }
      setErroGeral(falha.message);
      if (falha.status === 402) enviarEvento("pagamento_recusado", undefined, { metodo, motivo: falha.message });
      setEnviando(false);
    }
  }

  const rotuloPadrao =
    metodo === "pix" ? `Pagar ${dinheiro(total)} com Pix` : metodo === "cartao" ? `Pagar ${dinheiro(total)} no cartão` : `Gerar boleto de ${dinheiro(total)}`;
  const rotuloBotao = aparencia.textoBotao?.trim() || rotuloPadrao;

  return (
    <>
      {aparencia.bannerUrl && <BannerCheckout url={aparencia.bannerUrl} />}
      <CabecalhoOferta aparencia={aparencia} />
      {aparencia.cronometro.ativo && (
        <div className="mb-5">
          <Cronometro minutos={aparencia.cronometro.minutos} texto={aparencia.cronometro.texto} chave={checkout.codigo} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 @4xl:grid-cols-[minmax(0,1fr)_380px] @4xl:items-start">
      {/* Resumo (à direita no desktop, no topo no celular) */}
      <aside className="@4xl:sticky @4xl:top-6 @4xl:order-2">
        <div className="colchetes rounded-card border border-gelo bg-branco p-5 shadow-card">
          <div className="flex gap-4">
            <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-panel border border-gelo bg-neve">
              {checkout.produto.imagem ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={checkout.produto.imagem} alt="" className="h-full w-full object-cover" />
              ) : (
                <IconeCheckout className="text-marinho-3" />
              )}
            </span>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold leading-tight">{checkout.produto.nome}</h1>
              {checkout.produto.descricao && <p className="mt-1 line-clamp-3 text-[13px] text-marinho-2">{checkout.produto.descricao}</p>}
            </div>
          </div>
          <dl className="mt-5 flex flex-col gap-2 border-t border-gelo pt-4 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-marinho-2">{checkout.produto.nome}</dt>
              <dd className="text-marinho">{dinheiro(checkout.produto.precoCentavos)}</dd>
            </div>
            {bumpAceito && checkout.bump && (
              <div className="flex justify-between gap-3">
                <dt className="flex items-center gap-2 text-marinho-2">
                  {checkout.bump.nome}
                  <button type="button" onClick={alternarBump} className="text-[12px] text-bordo hover:underline">
                    remover
                  </button>
                </dt>
                <dd className="text-marinho">{dinheiro(checkout.bump.precoCentavos)}</dd>
              </div>
            )}
            <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-gelo pt-3">
              <dt className="font-medium text-marinho">Total</dt>
              <dd className="font-display text-2xl font-semibold text-marinho">{dinheiro(total)}</dd>
            </div>
            {metodo === "cartao" && parcelas > 1 && (
              <p className="text-right text-[12px] text-marinho-3">
                {parcelas}x de {dinheiro(Math.ceil(total / parcelas))}
              </p>
            )}
          </dl>
        </div>
      </aside>

      {/* Formulário */}
      <form onSubmit={enviar} className="flex flex-col gap-5 @4xl:order-1" noValidate onFocusCapture={aoInteragir}>
        <section className="rounded-card border border-gelo bg-branco p-5 shadow-card sm:p-6">
          <h2 className="flex items-center gap-3 text-[15px] font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-chip bg-azul font-display text-[12px] text-branco">1</span>
            Seus dados
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo rotulo="Nome completo" htmlFor="nome" erro={erro("nome", errosCliente.nome)} className="sm:col-span-2">
              <Entrada id="nome" autoComplete="name" value={cliente.nome} onChange={(e) => setCliente({ ...cliente, nome: e.target.value })} onBlur={() => tocar("nome")} aria-invalid={Boolean(erro("nome", errosCliente.nome))} />
            </Campo>
            <Campo rotulo="E-mail" htmlFor="email" erro={erro("email", errosCliente.email)} dica="Enviamos a confirmação e o acesso para este e-mail.">
              <Entrada id="email" type="email" inputMode="email" autoComplete="email" value={cliente.email} onChange={(e) => setCliente({ ...cliente, email: e.target.value })} onBlur={() => tocar("email")} aria-invalid={Boolean(erro("email", errosCliente.email))} />
            </Campo>
            <Campo rotulo="Celular" htmlFor="telefone" erro={erro("telefone", errosCliente.telefone)}>
              <Entrada id="telefone" type="tel" inputMode="tel" autoComplete="tel-national" value={cliente.telefone} onChange={(e) => setCliente({ ...cliente, telefone: mascararTelefone(e.target.value) })} onBlur={() => tocar("telefone")} placeholder="(11) 99999-9999" aria-invalid={Boolean(erro("telefone", errosCliente.telefone))} />
            </Campo>
            <Campo rotulo="CPF ou CNPJ" htmlFor="cpf" erro={erro("cpfCnpj", errosCliente.cpfCnpj)} className="sm:col-span-2">
              <Entrada id="cpf" inputMode="numeric" value={cliente.cpfCnpj} onChange={(e) => setCliente({ ...cliente, cpfCnpj: mascararCpfCnpj(e.target.value) })} onBlur={() => tocar("cpfCnpj")} placeholder="000.000.000-00" aria-invalid={Boolean(erro("cpfCnpj", errosCliente.cpfCnpj))} />
            </Campo>
          </div>
        </section>

        <section className="rounded-card border border-gelo bg-branco p-5 shadow-card sm:p-6">
          <h2 className="flex items-center gap-3 text-[15px] font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-chip bg-azul font-display text-[12px] text-branco">2</span>
            Pagamento
          </h2>
          <div className="mt-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${metodosDisponiveis.length}, minmax(0, 1fr))` }} role="radiogroup" aria-label="Forma de pagamento">
            {metodosDisponiveis.map((m) => {
              const ativo = m === metodo;
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={ativo}
                  onClick={() => setMetodo(m)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-panel border px-2 py-3 text-center transition-colors",
                    ativo ? "border-azul bg-azul-claro/50 text-azul-profundo shadow-glow" : "border-gelo text-marinho-2 hover:border-azul-medio",
                  )}
                >
                  {ICONES[m]}
                  <span className="text-sm font-medium">{METODO_INFO[m].rotulo}</span>
                  <span className="text-[11px] leading-tight text-marinho-3">{METODO_INFO[m].descricao}</span>
                </button>
              );
            })}
          </div>

          {metodo === "pix" && (
            <p className="mt-4 rounded-panel border border-gelo bg-neve px-4 py-3 text-[13px] text-marinho-2">
              Ao continuar, você recebe um QR Code e um código copia e cola. A confirmação é automática, em segundos.
            </p>
          )}
          {metodo === "boleto" && (
            <p className="mt-4 rounded-panel border border-gelo bg-neve px-4 py-3 text-[13px] text-marinho-2">
              O boleto vence em 3 dias e pode ser pago em qualquer banco ou app. A liberação acontece após a compensação.
            </p>
          )}
          {metodo === "cartao" && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Campo rotulo="Número do cartão" htmlFor="c-numero" erro={erro("numero", errosCartao.numero)} className="sm:col-span-2">
                <Entrada id="c-numero" inputMode="numeric" autoComplete="cc-number" value={cartao.numero} onChange={(e) => setCartao({ ...cartao, numero: mascararCartao(e.target.value) })} onBlur={() => tocar("numero")} placeholder="0000 0000 0000 0000" aria-invalid={Boolean(erro("numero", errosCartao.numero))} />
              </Campo>
              <Campo rotulo="Nome impresso no cartão" htmlFor="c-nome" erro={erro("nomeCartao", errosCartao.nome)} className="sm:col-span-2">
                <Entrada id="c-nome" autoComplete="cc-name" value={cartao.nome} onChange={(e) => setCartao({ ...cartao, nome: e.target.value.toUpperCase() })} onBlur={() => tocar("nomeCartao")} aria-invalid={Boolean(erro("nomeCartao", errosCartao.nome))} />
              </Campo>
              <Campo rotulo="Validade" htmlFor="c-validade" erro={erro("validade", errosCartao.validade)}>
                <Entrada id="c-validade" inputMode="numeric" autoComplete="cc-exp" value={cartao.validade} onChange={(e) => setCartao({ ...cartao, validade: mascararValidade(e.target.value) })} onBlur={() => tocar("validade")} placeholder="MM/AA" aria-invalid={Boolean(erro("validade", errosCartao.validade))} />
              </Campo>
              <Campo rotulo="CVV" htmlFor="c-cvv" erro={erro("cvv", errosCartao.cvv)}>
                <Entrada id="c-cvv" inputMode="numeric" autoComplete="cc-csc" value={cartao.cvv} onChange={(e) => setCartao({ ...cartao, cvv: somenteDigitos(e.target.value).slice(0, 4) })} onBlur={() => tocar("cvv")} placeholder="123" aria-invalid={Boolean(erro("cvv", errosCartao.cvv))} />
              </Campo>
              <Campo rotulo="CEP do titular" htmlFor="c-cep" erro={erro("cep", errosCartao.cep)}>
                <Entrada id="c-cep" inputMode="numeric" autoComplete="postal-code" value={cartao.cep} onChange={(e) => setCartao({ ...cartao, cep: mascararCep(e.target.value) })} onBlur={() => tocar("cep")} placeholder="00000-000" aria-invalid={Boolean(erro("cep", errosCartao.cep))} />
              </Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo rotulo="Número" htmlFor="c-num-end" erro={erro("numeroEndereco", errosCartao.numeroEndereco)}>
                  <Entrada id="c-num-end" value={cartao.numeroEndereco} onChange={(e) => setCartao({ ...cartao, numeroEndereco: e.target.value })} onBlur={() => tocar("numeroEndereco")} aria-invalid={Boolean(erro("numeroEndereco", errosCartao.numeroEndereco))} />
                </Campo>
                <Campo rotulo="Complemento" htmlFor="c-compl" opcional>
                  <Entrada id="c-compl" value={cartao.complemento} onChange={(e) => setCartao({ ...cartao, complemento: e.target.value })} />
                </Campo>
              </div>
              {checkout.parcelasMax > 1 && (
                <Campo rotulo="Parcelas" htmlFor="c-parcelas" className="sm:col-span-2">
                  <Selecao id="c-parcelas" value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))}>
                    {Array.from({ length: checkout.parcelasMax }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n === 1 ? `À vista ${dinheiro(total)}` : `${n}x de ${dinheiro(Math.ceil(total / n))}`}
                      </option>
                    ))}
                  </Selecao>
                </Campo>
              )}
            </div>
          )}
        </section>

        {/* Order bump: some ao ser aceito e vira item do resumo */}
        {checkout.bump &&
          (bumpAceito ? (
            <div className="flex items-center justify-between gap-3 rounded-panel border border-verde/30 bg-verde-claro px-4 py-3 text-sm text-verde">
              <span className="flex items-center gap-2">
                <IconeCheck tamanho={16} />
                {checkout.bump.nome} adicionado ao seu pedido por {dinheiro(checkout.bump.precoCentavos)}.
              </span>
              <button type="button" onClick={alternarBump} className="text-[13px] font-medium text-marinho-2 hover:underline">
                Remover
              </button>
            </div>
          ) : (
            <label className="colchetes flex cursor-pointer gap-4 rounded-card border-2 border-dashed border-dourado bg-dourado-claro/40 p-4 transition-colors hover:bg-dourado-claro/70 sm:p-5">
              <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-azul" checked={false} onChange={alternarBump} aria-label={`Adicionar ${checkout.bump.nome}`} />
              <div className="flex min-w-0 flex-1 gap-4">
                {checkout.bump.imagem && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={checkout.bump.imagem} alt="" className="hidden h-16 w-16 shrink-0 rounded-panel border border-gelo object-cover sm:block" />
                )}
                <div className="min-w-0">
                  <p className="font-display text-[15px] font-semibold text-marinho">{checkout.bump.titulo}</p>
                  {checkout.bump.descricao && <p className="mt-1 text-[13px] text-marinho-2">{checkout.bump.descricao}</p>}
                  <p className="mt-2 flex items-baseline gap-2">
                    {checkout.bump.precoCentavos < checkout.bump.precoOriginalCentavos && (
                      <span className="text-[13px] text-marinho-3 line-through">{dinheiro(checkout.bump.precoOriginalCentavos)}</span>
                    )}
                    <span className="font-display text-lg font-semibold text-dourado-escuro">+ {dinheiro(checkout.bump.precoCentavos)}</span>
                  </p>
                </div>
              </div>
            </label>
          ))}

        {erroGeral && (
          <div role="alert" className="rounded-panel border border-bordo/30 bg-bordo-claro px-4 py-3 text-[13px] text-bordo">
            {erroGeral}
          </div>
        )}

        <Button type="submit" tamanho="lg" className="sobre-primaria w-full text-[16px]" carregando={enviando}>
          {rotuloBotao}
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-[12px] text-marinho-3">
          <IconeCadeado tamanho={14} className="text-azul" />
          Ambiente seguro. Seus dados são protegidos e o pagamento é processado pelo Asaas.
        </p>

        {aparencia.garantia.ativo && <Garantia dias={aparencia.garantia.dias} texto={aparencia.garantia.texto} />}
        <Depoimentos itens={aparencia.depoimentos} />
      </form>
      </div>
    </>
  );
}
