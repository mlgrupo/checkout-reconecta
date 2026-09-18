import "server-only";
import QRCode from "qrcode";
import { ErroAsaas } from "@/lib/asaas/cliente";
import type {
  AsaasCliente,
  AsaasCobranca,
  AsaasLinhaDigitavel,
  AsaasPixQrCode,
  AsaasWebhook,
  NovaCobranca,
  NovoCliente,
  NovoWebhook,
  PortaAsaas,
} from "@/lib/asaas/tipos";

/**
 * Asaas simulado: permite testar o checkout inteiro sem chave de API.
 * Guarda cobranças em memória (globalThis) e reproduz as respostas reais.
 * Cartões recusados no sandbox real também são recusados aqui.
 */

const CARTOES_RECUSADOS = new Set(["5184019740373151", "4916561358240741"]);

type Memoria = { cobrancas: Map<string, AsaasCobranca>; clientes: Map<string, AsaasCliente>; webhooks: AsaasWebhook[] };
const g = globalThis as unknown as { __asaasSimulado?: Memoria };
const memoria: Memoria = (g.__asaasSimulado ??= { cobrancas: new Map(), clientes: new Map(), webhooks: [] });

function idAleatorio(prefixo: string) {
  const n = crypto.getRandomValues(new Uint32Array(2));
  return `${prefixo}_sim${n[0].toString(36)}${n[1].toString(36)}`;
}

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

function bandeira(numero: string) {
  if (/^4/.test(numero)) return "VISA";
  if (/^5[1-5]/.test(numero) || /^2[2-7]/.test(numero)) return "MASTERCARD";
  if (/^3[47]/.test(numero)) return "AMEX";
  if (/^(636368|438935|504175|451416|636297)/.test(numero)) return "ELO";
  return "OUTRA";
}

/** Monta um payload Pix "copia e cola" verossímil (formato EMV/BR Code). */
function payloadPix(id: string, valor: number) {
  const campo = (tag: string, v: string) => `${tag}${String(v.length).padStart(2, "0")}${v}`;
  const conta = campo("00", "br.gov.bcb.pix") + campo("01", `simulacao-${id}@reconecta.com.br`);
  const corpo =
    campo("00", "01") +
    campo("26", conta) +
    campo("52", "0000") +
    campo("53", "986") +
    campo("54", valor.toFixed(2)) +
    campo("58", "BR") +
    campo("59", "RECONECTA SIMULACAO") +
    campo("60", "SAO PAULO") +
    campo("62", campo("05", id.slice(-12)));
  return `${corpo}6304ABCD`;
}

export const asaasSimulado: PortaAsaas = {
  ambiente: "simulacao",

  async obterOuCriarCliente(dados: NovoCliente): Promise<AsaasCliente> {
    const cpfCnpj = dados.cpfCnpj.replace(/\D/g, "");
    const existente = memoria.clientes.get(cpfCnpj);
    if (existente) return existente;
    const cliente: AsaasCliente = {
      id: idAleatorio("cus"),
      name: dados.name,
      email: dados.email,
      cpfCnpj,
      mobilePhone: dados.mobilePhone,
      externalReference: dados.externalReference,
    };
    memoria.clientes.set(cpfCnpj, cliente);
    return cliente;
  },

  async criarCobranca(dados: NovaCobranca): Promise<AsaasCobranca> {
    const id = idAleatorio("pay");
    const base: AsaasCobranca = {
      object: "payment",
      id,
      dateCreated: hoje(),
      customer: dados.customer,
      status: "PENDING",
      billingType: dados.billingType,
      value: dados.value,
      netValue: Math.round(dados.value * 0.99 * 100) / 100,
      description: dados.description,
      externalReference: dados.externalReference,
      dueDate: dados.dueDate,
      invoiceUrl: `https://sandbox.asaas.com/i/${id}`,
      bankSlipUrl: dados.billingType === "BOLETO" ? `https://sandbox.asaas.com/b/pdf/${id}` : null,
    };

    if (dados.billingType === "CREDIT_CARD") {
      const numero = dados.creditCard?.number.replace(/\D/g, "") ?? "";
      if (!dados.creditCard || !dados.creditCardHolderInfo) {
        throw new ErroAsaas(400, "Dados do cartão incompletos.", [
          { code: "invalid_creditCard", description: "Informe os dados do cartão e do titular." },
        ]);
      }
      if (CARTOES_RECUSADOS.has(numero) || numero.endsWith("0000")) {
        throw new ErroAsaas(400, "Transação não autorizada.", [
          { code: "invalid_action", description: "Transação não autorizada. Verifique os dados do cartão ou use outro cartão." },
        ]);
      }
      base.status = "CONFIRMED";
      base.confirmedDate = hoje();
      base.creditCard = { creditCardNumber: numero.slice(-4), creditCardBrand: bandeira(numero) };
      if (dados.installmentCount && dados.installmentCount > 1) {
        base.installment = idAleatorio("ins");
        base.installmentNumber = 1;
        base.value = Math.round(((dados.totalValue ?? dados.value) / dados.installmentCount) * 100) / 100;
      }
    }

    memoria.cobrancas.set(id, base);
    return base;
  },

  async obterCobranca(id: string): Promise<AsaasCobranca> {
    const c = memoria.cobrancas.get(id);
    if (!c) throw new ErroAsaas(404, "Cobrança não encontrada na simulação (o servidor reiniciou?).");
    return c;
  },

  async obterQrCodePix(id: string): Promise<AsaasPixQrCode> {
    const c = await this.obterCobranca(id);
    const payload = payloadPix(id, c.value);
    const dataUrl = await QRCode.toDataURL(payload, { margin: 1, width: 320, errorCorrectionLevel: "M" });
    const expira = new Date();
    expira.setHours(23, 59, 59, 0);
    return {
      encodedImage: dataUrl.replace(/^data:image\/png;base64,/, ""),
      payload,
      expirationDate: expira.toISOString(),
    };
  },

  async obterLinhaDigitavel(id: string): Promise<AsaasLinhaDigitavel> {
    await this.obterCobranca(id);
    const digitos = id.replace(/\D/g, "").padEnd(12, "7").slice(0, 12);
    return {
      identificationField: `23793.38128 60000.${digitos.slice(0, 6)} ${digitos.slice(6, 11)}0.${digitos.slice(11)}9 1 96500000010000`,
      nossoNumero: digitos,
      barCode: `23791965000000100003381286000${digitos}00000`,
    };
  },

  async confirmarPagamentoTeste(id: string): Promise<AsaasCobranca> {
    const c = await this.obterCobranca(id);
    const agora = new Date().toISOString();
    const atualizada: AsaasCobranca = {
      ...c,
      status: "RECEIVED",
      paymentDate: agora.slice(0, 10),
      clientPaymentDate: agora.slice(0, 10),
      transactionReceiptUrl: `https://sandbox.asaas.com/comprovantes/${id}`,
    };
    memoria.cobrancas.set(id, atualizada);
    return atualizada;
  },

  async listarWebhooks() {
    return memoria.webhooks;
  },

  async criarWebhook(dados: NovoWebhook) {
    const criado: AsaasWebhook = { ...dados, id: idAleatorio("wh") };
    memoria.webhooks.push(criado);
    return criado;
  },
};
