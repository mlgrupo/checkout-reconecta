import type { ReactNode } from "react";
import { SeloAsaas } from "@/components/brand/selo-asaas";
import { IconeCadeado, IconeEscudo } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type Props = {
  nomeLoja: string;
  emailSuporte?: string;
  whatsappSuporte?: string;
  /** Rodapé marinho e estreito, do modelo "cartão único". */
  rodapeEscuro?: boolean;
  children: ReactNode;
};

/** Moldura das páginas públicas de checkout: cabeçalho com a marca e rodapé com o selo Asaas. */
export function MolduraCheckout({ nomeLoja, emailSuporte, whatsappSuporte, rodapeEscuro = false, children }: Props) {
  const zap = whatsappSuporte?.replace(/\D/g, "");
  const linha = rodapeEscuro ? "max-w-[520px]" : "max-w-[1080px]";
  return (
    /* @container: todo o checkout responde à largura deste bloco, não à da janela.
       É o que faz a prévia do editor mostrar o que o cliente vê no celular. */
    <div className="@container fundo-pagina flex min-h-dvh flex-col bg-neve">
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

      {rodapeEscuro ? (
        /* Rodapé marinho, na largura do cartão: suporte e texto legal fora do fluxo da compra. */
        <footer className="bg-marinho text-branco">
          <div className={cn("mx-auto flex w-full flex-col gap-3 px-5 py-7 text-[12px] leading-relaxed text-branco/70", linha)}>
            {(emailSuporte || zap) && (
              <p>
                Dúvidas sobre o produto? Fale com{" "}
                {emailSuporte && (
                  <a className="font-medium text-branco underline underline-offset-2" href={`mailto:${emailSuporte}`}>
                    {emailSuporte}
                  </a>
                )}
                {emailSuporte && zap && " ou pelo "}
                {zap && (
                  <a
                    className="font-medium text-branco underline underline-offset-2"
                    href={`https://wa.me/55${zap}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>
                )}
                .
              </p>
            )}
            <p>
              Ao clicar em pagar, você declara ter mais de 18 anos ou estar acompanhado de um responsável legal, e concorda com
              o processamento do pedido em nome de {nomeLoja}.
            </p>
            <p>Seus dados são criptografados e o número do seu cartão nunca é armazenado por nós.</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-branco/15 pt-4">
              <span>Pagamento processado por</span>
              <SeloAsaas altura={18} />
              <span className="flex items-center gap-1.5">
                <IconeEscudo tamanho={14} />
                Ambiente PCI DSS
              </span>
            </div>
            <p className="text-branco/50">{nomeLoja} © {new Date().getFullYear()} · Todos os direitos reservados</p>
          </div>
        </footer>
      ) : (
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
      )}
    </div>
  );
}
