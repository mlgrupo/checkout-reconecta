import type { ReactNode } from "react";
import { SeloAsaas } from "@/components/brand/selo-asaas";
import { IconeCadeado, IconeEscudo } from "@/components/ui/icons";

type Props = {
  nomeLoja: string;
  emailSuporte?: string;
  whatsappSuporte?: string;
  children: ReactNode;
};

/** Moldura das páginas públicas de checkout: cabeçalho com a marca e rodapé com o selo Asaas. */
export function MolduraCheckout({ nomeLoja, emailSuporte, whatsappSuporte, children }: Props) {
  const zap = whatsappSuporte?.replace(/\D/g, "");
  return (
    /* @container: todo o checkout responde à largura deste bloco, não à da janela.
       É o que faz a prévia do editor mostrar o que o cliente vê no celular. */
    <div className="@container flex min-h-dvh flex-col bg-neve">
      <header className="border-b border-gelo bg-branco">
        <div className="mx-auto flex h-16 w-full max-w-[1080px] items-center justify-between gap-3 px-4 @xl:px-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/reconecta.svg" alt={nomeLoja} className="h-7 w-auto shrink-0 @xl:h-8" />

          {/* Selos de confiança. No celular o texto sai e ficam o cadeado e o selo do Asaas. */}
          <div className="flex shrink-0 items-center gap-2 @md:gap-3">
            <span className="flex items-center gap-1.5 text-[12px] font-medium text-marinho-2">
              <IconeCadeado tamanho={15} className="shrink-0 text-azul" />
              <span className="hidden @md:inline">Pagamento seguro</span>
            </span>
            <span aria-hidden className="hidden h-5 w-px bg-gelo @md:block" />
            <SeloAsaas altura={16} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1080px] flex-1 px-4 py-6 @xl:px-6 @xl:py-8">{children}</main>

      <footer className="border-t border-gelo bg-branco">
        <div className="mx-auto flex w-full max-w-[1080px] flex-col items-center gap-4 px-4 py-6 text-center text-[12px] text-marinho-3 @xl:flex-row @xl:justify-between @xl:text-left">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
            <span>Pagamento processado por</span>
            <SeloAsaas altura={22} />
            <span className="flex items-center gap-1.5">
              <IconeEscudo tamanho={14} className="text-verde" />
              Ambiente PCI DSS
            </span>
          </div>
          <div className="flex flex-col gap-0.5 @xl:items-end">
            <span>{nomeLoja}. Seus dados são criptografados e nunca armazenamos o número do seu cartão.</span>
            {(emailSuporte || zap) && (
              <span>
                Dúvidas?{" "}
                {emailSuporte && (
                  <a className="text-azul hover:underline" href={`mailto:${emailSuporte}`}>
                    {emailSuporte}
                  </a>
                )}
                {emailSuporte && zap && " ou "}
                {zap && (
                  <a className="text-azul hover:underline" href={`https://wa.me/55${zap}`} target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                )}
              </span>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
