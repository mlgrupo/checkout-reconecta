import type { Metodo, StatusPedido } from "@/lib/dominio";

export type PedidoLista = {
  id: string;
  numero: number;
  status: StatusPedido;
  metodo: Metodo;
  valorTotalCentavos: number;
  jurosCentavos: number;
  bumpAceito: boolean;
  parcelas: number;
  clienteNome: string;
  clienteEmail: string;
  clienteCpfCnpj: string;
  clienteTelefone: string | null;
  asaasCobrancaId: string | null;
  asaasStatus: string | null;
  asaasInvoiceUrl: string | null;
  asaasBoletoUrl: string | null;
  pixPayload: string | null;
  cartaoBandeira: string | null;
  cartaoFinal: string | null;
  utm: Record<string, string> | null;
  pagoEm: string | null;
  criadoEm: string;
  linkNome: string | null;
  linkCodigo: string | null;
};

export type PedidoDetalhe = {
  pedido: PedidoLista & { ip: string | null; userAgent: string | null; asaasClienteId: string | null; boletoLinhaDigitavel: string | null };
  itens: { id: string; tipo: "principal" | "order_bump"; nome: string; precoCentavos: number; quantidade: number }[];
  eventos: { id: string; tipo: string; descricao: string; dados: Record<string, unknown> | null; criadoEm: string }[];
  link: { codigo: string; nome: string } | null;
};

export const STATUS_UI: Record<StatusPedido, { rotulo: string; tom: "azul" | "dourado" | "bordo" | "verde" | "ambar" | "neutro" }> = {
  aguardando: { rotulo: "Aguardando", tom: "ambar" },
  em_analise: { rotulo: "Em análise", tom: "azul" },
  pago: { rotulo: "Pago", tom: "verde" },
  recusado: { rotulo: "Recusado", tom: "bordo" },
  expirado: { rotulo: "Expirado", tom: "neutro" },
  cancelado: { rotulo: "Cancelado", tom: "neutro" },
  estornado: { rotulo: "Estornado", tom: "bordo" },
};

export const METODO_ROTULO: Record<Metodo, string> = { pix: "Pix", boleto: "Boleto", cartao: "Cartão" };
