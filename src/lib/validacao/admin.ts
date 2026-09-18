import { z } from "zod";
import { METODOS } from "@/db/schema";

/** Schemas dos formulários administrativos (compartilhados entre rotas). */

export const schemaProduto = z.object({
  nome: z.string().trim().min(2, "Informe o nome do produto.").max(120, "Máximo de 120 caracteres."),
  descricao: z.string().trim().max(2000, "Máximo de 2000 caracteres.").optional().nullable(),
  precoCentavos: z.number().int("Valor inválido.").min(500, "O valor mínimo é R$ 5,00.").max(100_000_000, "Valor acima do limite."),
  imagemUrl: z.union([z.literal(""), z.string().trim().url("Informe uma URL válida.")]).optional().nullable(),
  imagemId: z.string().uuid().optional().nullable(),
  ativo: z.boolean().optional(),
});

export const schemaLink = z.object({
  nome: z.string().trim().min(2, "Dê um nome interno ao link.").max(120),
  produtoId: z.string().uuid("Escolha o produto principal."),
  bumpProdutoId: z.union([z.literal(""), z.string().uuid()]).optional().nullable(),
  bumpPrecoCentavos: z.number().int().min(100, "Mínimo R$ 1,00.").optional().nullable(),
  bumpTitulo: z.string().trim().max(120).optional().nullable(),
  bumpDescricao: z.string().trim().max(500).optional().nullable(),
  metodos: z.array(z.enum(METODOS)).min(1, "Escolha pelo menos um meio de pagamento."),
  parcelasMax: z.number().int().min(1).max(12),
  urlSucesso: z.union([z.literal(""), z.string().trim().url("Informe uma URL válida.")]).optional().nullable(),
  ativo: z.boolean().optional(),
  codigo: z.union([z.literal(""), z.string().trim().toLowerCase()]).optional().nullable(),
});
