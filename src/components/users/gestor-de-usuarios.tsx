"use client";

import { useCallback, useEffect, useState } from "react";
import { CabecalhoPagina } from "@/components/shell/cabecalho-pagina";
import { Avatar } from "@/components/ui/avatar";
import { Selo } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EstadoVazio, Painel } from "@/components/ui/card";
import { Entrada } from "@/components/ui/field";
import { IconeAtualizar, IconeBusca, IconeMais, IconeUsuarios } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import { FormularioUsuario } from "@/components/users/formulario-usuario";
import { chamarApi, type RespostaLista, type UsuarioLista } from "@/components/users/tipos";
import { PAPEL_INFO } from "@/lib/auth/roles";
import { tempoRelativo } from "@/lib/utils";

type Gaveta = { modo: "fechada" } | { modo: "novo" } | { modo: "editar"; usuario: UsuarioLista };

export function GestorDeUsuarios({
  usuarioAtualId,
  managementPronto,
}: {
  usuarioAtualId: string;
  managementPronto: boolean;
}) {
  const [busca, setBusca] = useState("");
  // Consulta efetiva: termo, página e um contador de recarga manual.
  const [consulta, setConsulta] = useState({ termo: "", pagina: 0, recarga: 0 });
  const [dados, setDados] = useState<RespostaLista | null>(null);
  const [carregando, setCarregando] = useState(managementPronto);
  const [erro, setErro] = useState<string | null>(null);
  const [gaveta, setGaveta] = useState<Gaveta>({ modo: "fechada" });

  const { termo, pagina } = consulta;

  // Toda mudança de consulta liga o estado "carregando" no mesmo callback que a dispara.
  const consultar = useCallback((mudanca: Partial<typeof consulta>) => {
    setCarregando(true);
    setConsulta((atual) => ({ ...atual, ...mudanca }));
  }, []);
  const recarregar = useCallback(() => consultar({ recarga: Date.now() }), [consultar]);

  // Busca a lista sempre que a consulta muda. setState só dentro dos callbacks da promise.
  useEffect(() => {
    if (!managementPronto) return;
    let ativo = true;
    const params = new URLSearchParams({ pagina: String(consulta.pagina), porPagina: "25" });
    if (consulta.termo) params.set("q", consulta.termo);
    chamarApi<RespostaLista>(`/api/admin/users?${params}`)
      .then((resposta) => {
        if (!ativo) return;
        setDados(resposta);
        setErro(null);
      })
      .catch((e: Error) => {
        if (ativo) setErro(e.message);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [managementPronto, consulta]);

  // Busca com pequeno atraso para não chamar a API a cada tecla.
  useEffect(() => {
    const limpo = busca.trim();
    if (limpo === termo) return;
    const t = window.setTimeout(() => consultar({ termo: limpo, pagina: 0 }), 350);
    return () => window.clearTimeout(t);
  }, [busca, termo, consultar]);

  const fechar = () => setGaveta({ modo: "fechada" });
  const chaveGaveta = gaveta.modo === "editar" ? gaveta.usuario.user_id : gaveta.modo;

  const inicio = dados ? dados.pagina * dados.porPagina + 1 : 0;
  const fim = dados ? Math.min(dados.total, (dados.pagina + 1) * dados.porPagina) : 0;
  const temAnterior = pagina > 0;
  const temProxima = dados ? fim < dados.total : false;

  return (
    <>
      <CabecalhoPagina
        titulo="Usuários"
        descricao="Quem acessa a plataforma e com qual papel. As contas vivem no Auth0."
        acoes={
          <Button icone={<IconeMais tamanho={16} />} onClick={() => setGaveta({ modo: "novo" })} disabled={!managementPronto}>
            Novo usuário
          </Button>
        }
      />

      {!managementPronto ? (
        <Painel>
          <EstadoVazio
            icone={<IconeUsuarios />}
            titulo="Gestão de usuários ainda não conectada"
            descricao="Crie uma aplicação Machine to Machine no Auth0 e preencha AUTH0_MGMT_CLIENT_ID e AUTH0_MGMT_CLIENT_SECRET no .env. O passo a passo está em docs/04-autenticacao-auth0.md."
          />
        </Painel>
      ) : (
        <Painel semPreenchimento>
          <div className="flex flex-wrap items-center gap-3 border-b border-gelo px-4 py-3">
            <div className="relative min-w-[240px] flex-1">
              <IconeBusca tamanho={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-marinho-3" />
              <Entrada
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou e-mail"
                aria-label="Buscar usuários"
                className="pl-9"
              />
            </div>
            <Button variante="fantasma" tamanho="sm" icone={<IconeAtualizar tamanho={15} />} onClick={recarregar} disabled={carregando}>
              Atualizar
            </Button>
          </div>

          {erro ? (
            <EstadoVazio
              titulo="Não foi possível carregar os usuários"
              descricao={erro}
              acao={
                <Button variante="secundario" tamanho="sm" onClick={recarregar}>
                  Tentar de novo
                </Button>
              }
            />
          ) : carregando && !dados ? (
            <div className="flex items-center justify-center gap-2 px-6 py-14 text-sm text-marinho-2">
              <Spinner /> Carregando usuários
            </div>
          ) : dados && dados.usuarios.length === 0 ? (
            <EstadoVazio
              icone={<IconeUsuarios />}
              titulo={termo ? "Nenhum usuário encontrado" : "Nenhum usuário ainda"}
              descricao={termo ? "Tente outro nome ou e-mail." : "Crie o primeiro usuário da equipe para começar."}
              acao={
                termo ? undefined : (
                  <Button icone={<IconeMais tamanho={16} />} onClick={() => setGaveta({ modo: "novo" })}>
                    Novo usuário
                  </Button>
                )
              }
            />
          ) : (
            <div className="rolagem-fina overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="text-[12px] text-marinho-3">
                    <th className="px-4 py-2.5 font-medium">Usuário</th>
                    <th className="px-4 py-2.5 font-medium">Papéis</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Último acesso</th>
                    <th className="px-4 py-2.5 font-medium">Criado</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className={carregando ? "opacity-60" : undefined}>
                  {dados?.usuarios.map((u) => {
                    const ehVoce = u.user_id === usuarioAtualId;
                    const pendente = !u.blocked && (u.logins_count ?? 0) === 0;
                    return (
                      <tr key={u.user_id} className="border-t border-gelo transition-colors hover:bg-gelo-2/60">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar nome={u.name} email={u.email} src={u.picture} tamanho="sm" />
                            <div className="min-w-0">
                              <p className="flex items-center gap-2 truncate font-medium text-marinho">
                                {u.name || u.nickname || "Sem nome"}
                                {ehVoce && <Selo tom="azul">você</Selo>}
                              </p>
                              <p className="truncate text-[13px] text-marinho-2">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {u.papeis.length ? (
                              u.papeis.map((p) => (
                                <Selo key={p} tom={p === "admin" ? "dourado" : "azul"}>
                                  {PAPEL_INFO[p].rotulo}
                                </Selo>
                              ))
                            ) : (
                              <span className="text-[13px] text-marinho-3">Nenhum</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {u.blocked ? (
                            <Selo tom="bordo" ponto>
                              Bloqueado
                            </Selo>
                          ) : pendente ? (
                            <Selo tom="ambar" ponto>
                              Convite pendente
                            </Selo>
                          ) : (
                            <Selo tom="verde" ponto>
                              Ativo
                            </Selo>
                          )}
                        </td>
                        <td className="px-4 py-3 text-marinho-2">{tempoRelativo(u.last_login)}</td>
                        <td className="px-4 py-3 text-marinho-2">{tempoRelativo(u.created_at)}</td>
                        <td className="px-4 py-3 text-right">
                          <Button variante="secundario" tamanho="sm" onClick={() => setGaveta({ modo: "editar", usuario: u })}>
                            Editar
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {dados && dados.total > 0 && (
            <div className="flex items-center justify-between gap-3 border-t border-gelo px-4 py-3 text-[13px] text-marinho-2">
              <span>
                Mostrando {inicio} a {fim} de {dados.total}
              </span>
              <div className="flex gap-2">
                <Button variante="secundario" tamanho="sm" disabled={!temAnterior || carregando} onClick={() => consultar({ pagina: pagina - 1 })}>
                  Anterior
                </Button>
                <Button variante="secundario" tamanho="sm" disabled={!temProxima || carregando} onClick={() => consultar({ pagina: pagina + 1 })}>
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </Painel>
      )}

      {/* A key força um formulário novo a cada abertura, sem efeitos para reinicializar estado. */}
      <FormularioUsuario
        key={chaveGaveta}
        aberta={gaveta.modo !== "fechada"}
        usuario={gaveta.modo === "editar" ? gaveta.usuario : null}
        usuarioAtualId={usuarioAtualId}
        onFechar={fechar}
        onSalvo={() => {
          fechar();
          recarregar();
        }}
      />
    </>
  );
}
