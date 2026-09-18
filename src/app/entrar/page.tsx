import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AnelParceria } from "@/components/brand/anel";
import { MarcaParceria } from "@/components/brand/lockup";
import { Button } from "@/components/ui/button";
import { IconeAlerta, IconeEscudo } from "@/components/ui/icons";
import { obterUsuario } from "@/lib/auth/session";
import { prontidao } from "@/lib/env";

export const metadata: Metadata = { title: "Entrar" };

const mensagensDeErro: Record<string, string> = {
  "access_denied": "Seu acesso foi negado. Fale com um administrador da Reconecta.",
  "sessao-expirada": "Sua sessão expirou. Entre novamente.",
};

export default async function PaginaEntrar({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; returnTo?: string }>;
}) {
  const usuario = await obterUsuario();
  if (usuario) redirect("/painel");

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
            Use sua conta corporativa para acessar o painel de operações.
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

          {!prontidao.auth0 && (
            <div
              role="status"
              className="mt-6 rounded-panel border border-ambar/30 bg-ambar-claro px-3.5 py-3 text-[13px] text-ambar"
            >
              O Auth0 ainda não está configurado neste ambiente. Preencha as variáveis no arquivo
              <code className="mx-1 font-mono">.env</code>
              seguindo <span className="font-medium">docs/04-autenticacao-auth0.md</span>.
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3">
            <Button href={`/auth/login?returnTo=${encodeURIComponent(destino)}`} tamanho="lg" className="w-full">
              Entrar com minha conta
            </Button>
            <p className="text-center text-[13px] text-marinho-3">
              Sem acesso? Peça a um administrador da Reconecta para criar seu usuário.
            </p>
          </div>

          <div className="mt-8 flex items-center gap-2 border-t border-gelo pt-5 text-[12px] text-marinho-3">
            <IconeEscudo tamanho={15} className="text-azul" />
            Autenticação protegida pelo Auth0. Sua senha nunca passa por este servidor.
          </div>
        </div>
      </section>
    </main>
  );
}
