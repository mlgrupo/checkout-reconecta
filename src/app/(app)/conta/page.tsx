import type { Metadata } from "next";
import { AcoesConta } from "@/components/conta/acoes-conta";
import { CabecalhoPagina } from "@/components/shell/cabecalho-pagina";
import { Avatar } from "@/components/ui/avatar";
import { Selo } from "@/components/ui/badge";
import { Painel } from "@/components/ui/card";
import { PAPEIS, PAPEL_INFO } from "@/lib/auth/roles";
import { exigirUsuario } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Minha conta" };
export const dynamic = "force-dynamic";

export default async function PaginaConta() {
  const usuario = await exigirUsuario();
  const ehAcessoLocal = usuario.sub.startsWith("local|");

  return (
    <>
      <CabecalhoPagina titulo="Minha conta" descricao="Seus dados de acesso vêm do Auth0. Nome e foto são editados lá." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1fr]">
        <Painel>
          <div className="flex items-start gap-4">
            <Avatar nome={usuario.name} email={usuario.email} src={usuario.picture} tamanho="lg" />
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{usuario.name || usuario.nickname || "Sem nome"}</p>
              <p className="truncate text-[15px] text-marinho-2">{usuario.email}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {usuario.email_verified ? (
                  <Selo tom="verde" ponto>
                    E-mail verificado
                  </Selo>
                ) : (
                  <Selo tom="ambar" ponto>
                    E-mail não verificado
                  </Selo>
                )}
              </div>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-3 border-t border-gelo pt-5 text-sm">
            <div className="flex flex-col gap-0.5">
              <dt className="text-[13px] text-marinho-3">Identificador</dt>
              <dd className="truncate font-mono text-[13px] text-marinho-2">{usuario.sub}</dd>
            </div>
          </dl>

          <div className="mt-6 border-t border-gelo pt-5">
            <AcoesConta podeRedefinirSenha={!ehAcessoLocal} />
            {ehAcessoLocal && (
              <p className="mt-3 text-[13px] text-marinho-2">
                Você entrou pelo acesso de administrador local. A senha fica nas variáveis de ambiente do servidor e é
                trocada por lá.
              </p>
            )}
          </div>
        </Painel>

        <Painel titulo="Papéis e permissões" descricao="O que cada papel pode fazer nesta plataforma.">
          <ul className="flex flex-col gap-3">
            {PAPEIS.map((p) => {
              const tem = usuario.roles.includes(p);
              return (
                <li
                  key={p}
                  className={
                    tem
                      ? "rounded-panel border border-azul/30 bg-azul-claro/40 px-4 py-3"
                      : "rounded-panel border border-gelo px-4 py-3"
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-marinho">{PAPEL_INFO[p].rotulo}</p>
                    {tem && <Selo tom={p === "admin" ? "dourado" : "azul"}>Seu papel</Selo>}
                  </div>
                  <p className="mt-0.5 text-[13px] text-marinho-2">{PAPEL_INFO[p].descricao}</p>
                </li>
              );
            })}
          </ul>
        </Painel>
      </div>
    </>
  );
}
