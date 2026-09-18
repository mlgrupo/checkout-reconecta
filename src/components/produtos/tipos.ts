export type ProdutoLista = {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  precoCentavos: number;
  imagemId: string | null;
  imagemUrl: string | null;
  imagem: string | null;
  ativo: boolean;
  totalLinks: number;
  criadoEm: string;
};
