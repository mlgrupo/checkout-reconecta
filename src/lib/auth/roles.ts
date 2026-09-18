/**
 * Papéis da plataforma. São Roles do Auth0 com exatamente estes nomes.
 * A Action "Adicionar papéis ao token" copia-os para o claim AUTH0_ROLES_CLAIM.
 * Ver docs/04-autenticacao-auth0.md.
 */
export const PAPEIS = ["admin", "operador", "leitura"] as const;
export type Papel = (typeof PAPEIS)[number];

export const PAPEL_INFO: Record<Papel, { rotulo: string; descricao: string }> = {
  admin: {
    rotulo: "Administrador",
    descricao: "Acesso total: gerencia usuários, integrações e checkouts.",
  },
  operador: {
    rotulo: "Operador",
    descricao: "Cria e acompanha checkouts e cobranças. Não gerencia usuários.",
  },
  leitura: {
    rotulo: "Somente leitura",
    descricao: "Visualiza painéis e relatórios sem alterar nada.",
  },
};

export function ehPapel(valor: unknown): valor is Papel {
  return typeof valor === "string" && (PAPEIS as readonly string[]).includes(valor);
}

/** Extrai a lista de papéis do usuário da sessão (já normalizada em beforeSessionSaved). */
export function papeisDoUsuario(user: { roles?: unknown } | null | undefined): Papel[] {
  const brutos = Array.isArray(user?.roles) ? user.roles : [];
  return brutos.filter(ehPapel);
}

export function temPapel(user: { roles?: unknown } | null | undefined, papel: Papel) {
  return papeisDoUsuario(user).includes(papel);
}

export function ehAdmin(user: { roles?: unknown } | null | undefined) {
  return temPapel(user, "admin");
}
