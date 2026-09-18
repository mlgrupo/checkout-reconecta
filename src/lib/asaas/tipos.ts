/**
 * Tipos da API Asaas v3 usados pela plataforma.
 * Referência: https://docs.asaas.com/reference (ver docs/06-integracao-asaas.md).
 */

export type AsaasBillingType = "PIX" | "BOLETO" | "CREDIT_CARD" | "UNDEFINED";

export type AsaasStatusCobranca =
  | "PENDING"
  | "RECEIVED"
  | "CONFIRMED"
  | "OVERDUE"
  | "REFUNDED"
  | "RECEIVED_IN_CASH"
  | "REFUND_REQUESTED"
  | "REFUND_IN_PROGRESS"
  | "CHARGEBACK_REQUESTED"
  | "CHARGEBACK_DISPUTE"
  | "AWAITING_CHARGEBACK_REVERSAL"
  | "DUNNING_REQUESTED"
  | "DUNNING_RECEIVED"
  | "AWAITING_RISK_ANALYSIS"
  | "AUTHORIZED";

export type AsaasCliente = {
  id: string;
  name: string;
  email?: string | null;
  cpfCnpj?: string | null;
  mobilePhone?: string | null;
  phone?: string | null;
  externalReference?: string | null;
  deleted?: boolean;
};

export type AsaasLista<T> = {
  object: "list";
  hasMore: boolean;
  totalCount: number;
  limit: number;
  offset: number;
  data: T[];
};

export type AsaasCartaoResposta = {
  creditCardNumber: string; // últimos 4 dígitos
  creditCardBrand: string;
  creditCardToken?: string;
};

export type AsaasCobranca = {
  object: "payment";
  id: string;
  dateCreated: string;
  customer: string;
  status: AsaasStatusCobranca;
  billingType: AsaasBillingType;
  value: number;
  netValue?: number;
  originalValue?: number | null;
  description?: string | null;
  externalReference?: string | null;
  dueDate: string;
  originalDueDate?: string;
  paymentDate?: string | null;
  clientPaymentDate?: string | null;
  confirmedDate?: string | null;
  invoiceUrl?: string;
  bankSlipUrl?: string | null;
  transactionReceiptUrl?: string | null;
  invoiceNumber?: string;
  installmentNumber?: number | null;
  installment?: string | null;
  creditCard?: AsaasCartaoResposta | null;
  pixQrCodeId?: string | null;
  deleted?: boolean;
};

export type AsaasPixQrCode = {
  encodedImage: string; // PNG em base64
  payload: string; // "copia e cola"
  expirationDate: string;
  description?: string | null;
};

export type AsaasLinhaDigitavel = {
  identificationField: string;
  nossoNumero: string;
  barCode: string;
};

export type AsaasCartao = {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
};

export type AsaasTitularCartao = {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  addressComplement?: string;
  phone: string;
  mobilePhone?: string;
};

export type NovaCobranca = {
  customer: string;
  billingType: Exclude<AsaasBillingType, "UNDEFINED">;
  value: number;
  dueDate: string; // YYYY-MM-DD
  description?: string;
  externalReference?: string;
  remoteIp?: string;
  creditCard?: AsaasCartao;
  creditCardHolderInfo?: AsaasTitularCartao;
  creditCardToken?: string;
  installmentCount?: number;
  totalValue?: number;
  callback?: { successUrl: string; autoRedirect?: boolean };
};

export type NovoCliente = {
  name: string;
  cpfCnpj: string;
  email?: string;
  mobilePhone?: string;
  externalReference?: string;
  notificationDisabled?: boolean;
};

export type AsaasErro = { code: string; description: string };

export type AsaasEventoWebhook =
  | "PAYMENT_CREATED"
  | "PAYMENT_AWAITING_RISK_ANALYSIS"
  | "PAYMENT_APPROVED_BY_RISK_ANALYSIS"
  | "PAYMENT_REPROVED_BY_RISK_ANALYSIS"
  | "PAYMENT_AUTHORIZED"
  | "PAYMENT_UPDATED"
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED"
  | "PAYMENT_ANTICIPATED"
  | "PAYMENT_OVERDUE"
  | "PAYMENT_DELETED"
  | "PAYMENT_RESTORED"
  | "PAYMENT_REFUNDED"
  | "PAYMENT_PARTIALLY_REFUNDED"
  | "PAYMENT_REFUND_IN_PROGRESS"
  | "PAYMENT_REFUND_DENIED"
  | "PAYMENT_RECEIVED_IN_CASH_UNDONE"
  | "PAYMENT_CHARGEBACK_REQUESTED"
  | "PAYMENT_CHARGEBACK_DISPUTE"
  | "PAYMENT_AWAITING_CHARGEBACK_REVERSAL"
  | "PAYMENT_DUNNING_RECEIVED"
  | "PAYMENT_DUNNING_REQUESTED"
  | "PAYMENT_BANK_SLIP_CANCELLED"
  | "PAYMENT_BANK_SLIP_VIEWED"
  | "PAYMENT_CHECKOUT_VIEWED"
  | (string & {});

export type AsaasWebhookPayload = {
  id: string;
  event: AsaasEventoWebhook;
  dateCreated: string;
  account?: { id: string; ownerId?: string | null };
  payment?: AsaasCobranca;
};

export type NovoWebhook = {
  name: string;
  url: string;
  email: string;
  enabled: boolean;
  interrupted: boolean;
  apiVersion: 3;
  authToken: string;
  sendType: "SEQUENTIALLY" | "NON_SEQUENTIALLY";
  events: string[];
};

export type AsaasWebhook = NovoWebhook & { id: string };

/** Contrato que o cliente real e o simulado implementam. */
export interface PortaAsaas {
  readonly ambiente: "simulacao" | "sandbox" | "production";
  obterOuCriarCliente(dados: NovoCliente): Promise<AsaasCliente>;
  criarCobranca(dados: NovaCobranca): Promise<AsaasCobranca>;
  obterCobranca(id: string): Promise<AsaasCobranca>;
  obterQrCodePix(id: string): Promise<AsaasPixQrCode>;
  obterLinhaDigitavel(id: string): Promise<AsaasLinhaDigitavel>;
  /** Somente sandbox e simulação: marca a cobrança como recebida. */
  confirmarPagamentoTeste(id: string): Promise<AsaasCobranca>;
  listarWebhooks(): Promise<AsaasWebhook[]>;
  criarWebhook(dados: NovoWebhook): Promise<AsaasWebhook>;
}
