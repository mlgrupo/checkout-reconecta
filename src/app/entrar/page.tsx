import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AnelParceria } from "@/components/brand/anel";
import { MarcaParceria } from "@/components/brand/lockup";
import { FormularioEntrar } from "@/components/auth/formulario-entrar";
import { Button } from "@/components/ui/button";
import { IconeAlerta, IconeEscudo } from "@/components/ui/icons";
import { obterUsuario } from "@/lib/auth/session";
import { acessoLocalDisponivel } from "@/lib/auth/sessao-local";
import { prontidao } from "@/lib/env";

export const metadata: Metadata = { title: "Entrar" };

const mensagensDeErro: Record<string, string> = {
  "access_denied": "Seu acesso foi negado. Fale com um administrador da Reconecta.",
  "sessao-expirada": "Sua sessão expirou. Entre novamente.",
  "auth0-indisponivel": "O serviço de login está indisponível no momento. Tente de novo em alguns minutos.",
};

export default async function PaginaEntrar({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; returnTo?: string }>;
}) {
  const usuario = await obterUsuario();
  if (usuario) redirect("/painel");

  const acessoLocal = await acessoLocalDisponivel();
  const { erro, returnTo } = await searchParams;
  const destino = returnTo && returnTo.startsWith("/") ? returnTo : "/painel";
  const mensagemErro = erro ? (mensagensDeErro[erro] ?? "Não foi possível entrar. Tente de novo.") : null;

  return (
    <main className="grid min-h-dvh grid-cols-1 overflow-x-hidden lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      {/* Painel de marca */}
      <section className="malha relative flex min-w-0 flex-col justify-between overflow-hidden px-6 py-6 sm:px-10 sm:py-8 lg:px-14">
        <MarcaParceria altura={30} />

        <div className="relative mx-auto my-8 flex w-full max-w-[440px] items-center justify-center lg:my-0">
          <AnelParceria tamanho={440} />
          <p className="absolute max-w-[220px] text-center font-display text-sm leading-relaxed text-marinho-2">
            Checkout construído sobre a infraestrutura de pagamentos do Asaas.
          </p>
        </div>

        <div className="max-w-md">
          <h2 className="text-2xl font-semibold leading-tight sm:text-3xl">Checkout Reconecta</h2>
          <p className="mt-2 text-[15px] text-marinho-2">
            Pix, boleto e cartão em um fluxo único, com a conciliação feita no Asaas.
          </p>
        </div>
      </section>

      {/* Formulário de entrada */}
      <section className="flex min-w-0 items-center justify-center bg-neve px-4 py-12 sm:px-10">
        <div className="colchetes w-full max-w-[420px] animate-rise rounded-card border border-gelo bg-branco p-7 shadow-card sm:p-9">
          <h1 className="text-[28px] font-semibold leading-tight">Entrar</h1>
          <p className="mt-2 text-[15px] text-marinho-2">
            {acessoLocal
              ? "Acesse o painel de operações com seu e-mail e senha."
              : "Use sua conta corporativa para acessar o painel de operações."}
          </p>

          {mensagemErro && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-2.5 rounded-panel border border-bordo/30 bg-bordo-claro px-3.5 py-3 text-[13px] text-bordo"
            >
              <IconeAlerta tamanho={16} className="mt-0.5 shrink-0" />
              <span>{mensagemErro}</span>
            </div>
          )}

          {!prontidao.auth0 && !acessoLocal && (
            <div
              role="status"
              className="mt-6 rounded-panel border border-ambar/30 bg-ambar-claro px-3.5 py-3 text-[13px] text-ambar"
            >
              Nenhuma forma de acesso está configurada neste ambiente. Preencha as variáveis do Auth0 ou o acesso de
              administrador, seguindo <span className="font-medium">docs/04-autenticacao-auth0.md</span>.
            </div>
          )}

          {acessoLocal && <FormularioEntrar destino={destino} />}

          {prontidao.auth0 && (
            <div className={acessoLocal ? "mt-6 border-t border-gelo pt-6" : "mt-8"}>
              <Button
                href={`/auth/login?returnTo=${encodeURIComponent(destino)}`}
                tamanho="lg"
                variante={acessoLocal ? "secundario" : "primario"}
                className="w-full"
              >
                Entrar com minha conta corporativa
              </Button>
            </div>
          )}

          {!acessoLocal && (
            <p className="mt-3 text-center text-[13px] text-marinho-3">
              Sem acesso? Peça a um administrador da Reconecta para criar seu usuário.
            </p>
          )}

          <div className="mt-8 flex items-start gap-2 border-t border-gelo pt-5 text-[12px] text-marinho-3">
            <IconeEscudo tamanho={15} className="mt-0.5 shrink-0 text-azul" />
            {acessoLocal ? (
              <span>
                A sessão dura 8 horas e fica em um cookie assinado. Sua senha é guardada protegida, nunca em texto.
              </span>
            ) : (
              <span>Autenticação protegida pelo Auth0. Sua senha nunca passa por este servidor.</span>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
