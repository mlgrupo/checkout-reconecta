import type { Papel } from "@/lib/auth/roles";

export type Acesso = {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  ativo: boolean;
  ultimoAcessoEm: string | null;
  criadoEm: string;
};
