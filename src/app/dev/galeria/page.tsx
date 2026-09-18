import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CabecalhoPagina } from "@/components/shell/cabecalho-pagina";
import { Shell } from "@/components/shell/shell";
import { Avatar } from "@/components/ui/avatar";
import { Selo } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Painel } from "@/components/ui/card";
import { Campo, Entrada, Selecao } from "@/components/ui/field";
import { IconeChave, IconeMais } from "@/components/ui/icons";
import type { UsuarioSessao } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Galeria de componentes" };

/**
 * Galeria do design system. Só existe em desenvolvimento: serve para revisar
 * visualmente o shell e os primitivos sem precisar de sessão no Auth0.
 */
export default function PaginaGaleria() {
  if (process.env.NODE_ENV === "production") notFound();

  const usuario: UsuarioSessao = {
    sub: "auth0|galeria",
    name: "Ana Souza",
    email: "ana@reconectaoficial.com.br",
    email_verified: true,
    roles: ["admin"],
  };

  const amostra = [
    { nome: "Ana Souza", email: "ana@reconectaoficial.com.br", papeis: ["admin"], status: "ativo", acesso: "há 2 horas", voce: true },
    { nome: "Bruno Lima", email: "bruno@reconectaoficial.com.br", papeis: ["operador"], status: "ativo", acesso: "ontem" },
    { nome: "Carla Mendes", email: "carla@reconectaoficial.com.br", papeis: ["operador", "leitura"], status: "pendente", acesso: "nunca" },
    { nome: "Diego Rocha", email: "diego@reconectaoficial.com.br", papeis: [], status: "bloqueado", acesso: "há 3 meses" },
  ] as const;

  return (
    <Shell usuario={usuario}>
      <CabecalhoPagina
        titulo="Galeria de componentes"
        descricao="Referência visual do design system. Esta página não existe em produção."
        acoes={
          <Button icone={<IconeMais tamanho={16} />}>Novo usuário</Button>
        }
      />

      <div className="flex flex-col gap-5">
        <Painel destaque titulo="Botões" descricao="Um primário por contexto. Bordô só para o irreversível.">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primário</Button>
            <Button variante="secundario">Secundário</Button>
            <Button variante="fantasma">Fantasma</Button>
            <Button variante="dourado">Dourado</Button>
            <Button variante="perigo">Confirmar exclusão</Button>
            <Button carregando>Salvando</Button>
            <Button disabled>Desabilitado</Button>
            <Button tamanho="sm" variante="secundario" icone={<IconeChave tamanho={15} />}>
              Pequeno com ícone
            </Button>
          </div>
        </Painel>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Painel titulo="Selos e avatares">
            <div className="flex flex-wrap gap-2">
              <Selo tom="azul">Operador</Selo>
              <Selo tom="dourado">Administrador</Selo>
              <Selo tom="verde" ponto>Ativo</Selo>
              <Selo tom="ambar" ponto>Convite pendente</Selo>
              <Selo tom="bordo" ponto>Bloqueado</Selo>
              <Selo tom="neutro">Neutro</Selo>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <Avatar nome="Ana Souza" tamanho="sm" />
              <Avatar nome="Bruno Lima" />
              <Avatar email="carla@reconecta.com.br" tamanho="lg" />
            </div>
          </Painel>

          <Painel titulo="Campos de formulário">
            <div className="flex flex-col gap-4">
              <Campo rotulo="Nome completo" htmlFor="g-nome" dica="Como aparece para a equipe.">
                <Entrada id="g-nome" defaultValue="Ana Souza" />
              </Campo>
              <Campo rotulo="E-mail" htmlFor="g-email" erro="Informe um e-mail válido.">
                <Entrada id="g-email" type="email" defaultValue="ana@reconecta" aria-invalid />
              </Campo>
              <Campo rotulo="Papel" htmlFor="g-papel" opcional>
                <Selecao id="g-papel" defaultValue="operador">
                  <option value="admin">Administrador</option>
                  <option value="operador">Operador</option>
                  <option value="leitura">Somente leitura</option>
                </Selecao>
              </Campo>
            </div>
          </Painel>
        </div>

        <Painel titulo="Tabela de usuários" descricao="Como a listagem real aparece com dados." semPreenchimento>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="text-[12px] text-marinho-3">
                  <th className="px-4 py-2.5 font-medium">Usuário</th>
                  <th className="px-4 py-2.5 font-medium">Papéis</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Último acesso</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {amostra.map((u) => (
                  <tr key={u.email} className="border-t border-gelo hover:bg-gelo-2/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar nome={u.nome} tamanho="sm" />
                        <div>
                          <p className="flex items-center gap-2 font-medium text-marinho">
                            {u.nome}
                            {"voce" in u && u.voce && <Selo tom="azul">você</Selo>}
                          </p>
                          <p className="text-[13px] text-marinho-2">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {u.papeis.length ? (
                          u.papeis.map((p) => (
                            <Selo key={p} tom={p === "admin" ? "dourado" : "azul"}>
                              {p === "admin" ? "Administrador" : p === "operador" ? "Operador" : "Somente leitura"}
                            </Selo>
                          ))
                        ) : (
                          <span className="text-[13px] text-marinho-3">Nenhum</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {u.status === "ativo" && <Selo tom="verde" ponto>Ativo</Selo>}
                      {u.status === "pendente" && <Selo tom="ambar" ponto>Convite pendente</Selo>}
                      {u.status === "bloqueado" && <Selo tom="bordo" ponto>Bloqueado</Selo>}
                    </td>
                    <td className="px-4 py-3 text-marinho-2">{u.acesso}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variante="secundario" tamanho="sm">Editar</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Painel>
      </div>
    </Shell>
  );
}
