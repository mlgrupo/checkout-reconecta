import type { AparenciaParcial } from "@/lib/aparencia";
import type { Metodo } from "@/lib/dominio";

export type LinkLista = {
  id: string;
  codigo: string;
  nome: string;
  produtoId: string;
  bumpProdutoId: string | null;
  bumpPrecoCentavos: number | null;
  bumpTitulo: string | null;
  bumpDescricao: string | null;
  metodos: Metodo[];
  parcelasMax: number;
  urlSucesso: string | null;
  aparencia: AparenciaParcial | null;
  ativo: boolean;
  criadoEm: string;
  produto: { id: string; nome: string; precoCentavos: number; ativo: boolean };
  bump: { id: string; nome: string; precoCentavos: number } | null;
  totalPedidos: number;
  pedidosPagos: number;
  url: string;
};

export const METODO_INFO: Record<Metodo, { rotulo: string }> = {
  pix: { rotulo: "Pix" },
  boleto: { rotulo: "Boleto" },
  cartao: { rotulo: "Cartão" },
};
