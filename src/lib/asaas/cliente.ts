import "server-only";
import { env } from "@/lib/env";
import type {
  AsaasCliente,
  AsaasCobranca,
  AsaasErro,
  AsaasLinhaDigitavel,
  AsaasLista,
  AsaasPixQrCode,
  AsaasWebhook,
  NovaCobranca,
  NovoCliente,
  NovoWebhook,
  PortaAsaas,
} from "@/lib/asaas/tipos";

const BASES = {
  sandbox: "https://api-sandbox.asaas.com/v3",
  production: "https://api.asaas.com/v3",
} as const;

export class ErroAsaas extends Error {
  constructor(
    public status: number,
    message: string,
    public erros: AsaasErro[] = [],
    public detalhe?: unknown,
  ) {
    super(message);
    this.name = "ErroAsaas";
  }
  /** Mensagem amigável para exibir ao pagador (sem detalhes internos). */
  get mensagemPublica() {
    return this.erros[0]?.description || "O provedor de pagamentos não aceitou a operação. Tente novamente.";
  }
}

type Opcoes = RequestInit & { timeoutMs?: number; chave?: string };

async function chamar<T>(caminho: string, init: Opcoes = {}): Promise<T> {
  if (env.ASAAS_ENV === "simulacao") {
    throw new ErroAsaas(500, "Cliente real do Asaas chamado em modo simulação.");
  }
  const { timeoutMs = 30_000, chave = env.ASAAS_API_KEY, ...resto } = init;
  if (!chave) {
    throw new ErroAsaas(503, "ASAAS_API_KEY não configurada. Preencha o .env (ver docs/06).");
  }
  const base = BASES[env.ASAAS_ENV];
  const res = await fetch(`${base}${caminho}`, {
    ...resto,
    headers: {
      access_token: chave,
      "content-type": "application/json",
      accept: "application/json",
      "user-agent": "CheckoutReconecta/0.1",
      ...(resto.headers ?? {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const texto = await res.text();
  let corpo: unknown;
  try {
    corpo = texto ? JSON.parse(texto) : undefined;
  } catch {
    corpo = texto;
  }
  if (!res.ok) {
    const erros =
      corpo && typeof corpo === "object" && "errors" in corpo && Array.isArray(corpo.errors)
        ? (corpo.errors as AsaasErro[])
        : [];
    const msg = erros[0]?.description || `Asaas respondeu ${res.status} em ${caminho}.`;
    throw new ErroAsaas(res.status, msg, erros, corpo);
  }
  return corpo as T;
}

/** Cliente real da API Asaas (sandbox ou produção). */
export const asaasReal: PortaAsaas = {
  get ambiente() {
    return env.ASAAS_ENV;
  },

  async obterOuCriarCliente(dados: NovoCliente): Promise<AsaasCliente> {
    const cpfCnpj = dados.cpfCnpj.replace(/\D/g, "");
    const busca = await chamar<AsaasLista<AsaasCliente>>(`/customers?cpfCnpj=${encodeURIComponent(cpfCnpj)}&limit=5`);
    const existente = busca.data.find((c) => !c.deleted);
    if (existente) return existente;
    return chamar<AsaasCliente>("/customers", {
      method: "POST",
      body: JSON.stringify({
        name: dados.name,
        cpfCnpj,
        email: dados.email,
        mobilePhone: dados.mobilePhone,
        externalReference: dados.externalReference,
        notificationDisabled: dados.notificationDisabled ?? true,
      }),
    });
  },

  async criarCobranca(dados: NovaCobranca): Promise<AsaasCobranca> {
    // Cartão exige timeout maior (o Asaas recomenda pelo menos 60s).
    const timeoutMs = dados.billingType === "CREDIT_CARD" ? 70_000 : 30_000;
    return chamar<AsaasCobranca>("/payments", { method: "POST", body: JSON.stringify(dados), timeoutMs });
  },

  obterCobranca(id) {
    return chamar<AsaasCobranca>(`/payments/${encodeURIComponent(id)}`);
  },

  obterQrCodePix(id) {
    return chamar<AsaasPixQrCode>(`/payments/${encodeURIComponent(id)}/pixQrCode`);
  },

  obterLinhaDigitavel(id) {
    return chamar<AsaasLinhaDigitavel>(`/payments/${encodeURIComponent(id)}/identificationField`);
  },

  async confirmarPagamentoTeste(id) {
    if (env.ASAAS_ENV !== "sandbox") {
      throw new ErroAsaas(400, "Confirmação manual só existe no sandbox.");
    }
    return chamar<AsaasCobranca>(`/sandbox/payment/${encodeURIComponent(id)}/confirm`, { method: "POST" });
  },

  async listarWebhooks() {
    const lista = await chamar<AsaasLista<AsaasWebhook>>("/webhooks?limit=50");
    return lista.data;
  },

  criarWebhook(dados: NovoWebhook) {
    return chamar<AsaasWebhook>("/webhooks", { method: "POST", body: JSON.stringify(dados) });
  },
};

export type PagamentoQrCode = {
  id: string;
  status: string;
  value: number;
  endToEndIdentifier?: string | null;
  transactionReceiptUrl?: string | null;
};

/**
 * Paga um QR Code Pix usando a conta pagadora do sandbox (ASAAS_SANDBOX_PAYER_API_KEY).
 * Reproduz o caminho real: o dinheiro sai da conta pagadora, entra na conta da plataforma e o
 * Asaas dispara PAYMENT_RECEIVED pelo webhook. Exige chave Pix cadastrada na conta recebedora.
 */
export async function pagarQrCodeComoPagador(dados: { payload: string; value: number; description?: string }) {
  if (env.ASAAS_ENV !== "sandbox") throw new ErroAsaas(400, "A conta pagadora só existe no sandbox.");
  if (!env.ASAAS_SANDBOX_PAYER_API_KEY) throw new ErroAsaas(503, "ASAAS_SANDBOX_PAYER_API_KEY não configurada.");
  return chamar<PagamentoQrCode>("/pix/qrCodes/pay", {
    method: "POST",
    chave: env.ASAAS_SANDBOX_PAYER_API_KEY,
    body: JSON.stringify({ qrCode: { payload: dados.payload }, value: dados.value, description: dados.description }),
  });
}
