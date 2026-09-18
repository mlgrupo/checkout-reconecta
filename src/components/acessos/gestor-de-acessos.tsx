"use client";

import { useCallback, useEffect, useState } from "react";
import { FormularioAcesso } from "@/components/acessos/formulario-acesso";
import type { Acesso } from "@/components/acessos/tipos";
import { CabecalhoPagina } from "@/components/shell/cabecalho-pagina";
import { Avatar } from "@/components/ui/avatar";
import { Selo } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EstadoVazio, Painel } from "@/components/ui/card";
import { IconeMais, IconeUsuarios } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import { PAPEL_INFO } from "@/lib/auth/roles";
import { chamarApi } from "@/lib/http-cliente";
import { tempoRelativo } from "@/lib/utils";

type Gaveta = { modo: "fechada" } | { modo: "novo" } | { modo: "editar"; acesso: Acesso };

export function GestorDeAcessos({ emailDoAmbiente }: { emailDoAmbiente: string | null }) {
  const [acessos, setAcessos] = useState<Acesso[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);
  const [gaveta, setGaveta] = useState<Gaveta>({ modo: "fechada" });

  useEffect(() => {
    let ativo = true;
    chamarApi<{ acessos: Acesso[] }>("/api/admin/acessos")
      .then((r) => ativo && setAcessos(r.acessos))
      .catch((e: Error) => ativo && setErro(e.message));
    return () => {
      ativo = false;
    };
  }, [versao]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);
  const fechar = () => setGaveta({ modo: "fechada" });
  const chave = gaveta.modo === "editar" ? gaveta.acesso.id : gaveta.modo;

  return (
    <>
      <CabecalhoPagina
        titulo="Acessos"
        descricao="Quem entra no painel e o que cada pessoa pode fazer. As senhas ficam protegidas, nunca em texto."
        acoes={
          <Button icone={<IconeMais tamanho={16} />} onClick={() => setGaveta({ modo: "novo" })}>
            Novo acesso
          </Button>
        }
      />

      {emailDoAmbiente && (
        <div className="mb-5 rounded-panel border border-gelo bg-branco px-4 py-3 text-[13px] text-marinho-2 shadow-card">
          <span className="font-medium text-marinho">{emailDoAmbiente}</span> entra pelas variáveis do servidor e não
          aparece na lista. É a porta de entrada de emergência: ela continua funcionando mesmo que todos os acessos
          abaixo sejam desativados.
        </div>
      )}

      <Painel semPreenchimento>
        {erro ? (
          <EstadoVazio
            titulo="Não foi possível carregar os acessos"
            descricao={erro}
            acao={
              <Button variante="secundario" tamanho="sm" onClick={recarregar}>
                Tentar de novo
              </Button>
            }
          />
        ) : !acessos ? (
          <div className="flex items-center justify-center gap-2 px-6 py-14 text-sm text-marinho-2">
            <Spinner /> Carregando acessos
          </div>
        ) : acessos.length === 0 ? (
          <EstadoVazio
            icone={<IconeUsuarios />}
            titulo="Nenhum acesso criado"
            descricao="Crie um acesso para cada pessoa da equipe, com o papel que ela precisa."
            acao={
              <Button icone={<IconeMais tamanho={16} />} onClick={() => setGaveta({ modo: "novo" })}>
                Novo acesso
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-gelo">
            {acessos.map((a) => (
              <li key={a.id} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-gelo-2/60 sm:px-5">
                <Avatar nome={a.nome} email={a.email} tamanho="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-marinho">{a.nome}</p>
                  <p className="truncate text-[13px] text-marinho-2">{a.email}</p>
                </div>
                <div className="hidden text-right text-[12px] text-marinho-3 sm:block">
                  <p>último acesso</p>
                  <p>{tempoRelativo(a.ultimoAcessoEm)}</p>
                </div>
                <Selo tom={a.papel === "admin" ? "dourado" : "azul"}>{PAPEL_INFO[a.papel].rotulo}</Selo>
                <Selo tom={a.ativo ? "verde" : "bordo"} ponto>
                  {a.ativo ? "Ativo" : "Desativado"}
                </Selo>
                <Button variante="secundario" tamanho="sm" onClick={() => setGaveta({ modo: "editar", acesso: a })}>
                  Editar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Painel>

      <FormularioAcesso
        key={chave}
        aberta={gaveta.modo !== "fechada"}
        acesso={gaveta.modo === "editar" ? gaveta.acesso : null}
        onFechar={fechar}
        onSalvo={() => {
          fechar();
          recarregar();
        }}
      />
    </>
  );
}
