import type { ReactNode } from "react";
import { SeloAsaas } from "@/components/brand/selo-asaas";
import { IconeCadeado } from "@/components/ui/icons";

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
    <div className="flex min-h-dvh flex-col bg-neve">
      <header className="border-b border-gelo bg-branco">
        <div className="mx-auto flex h-16 w-full max-w-[1080px] items-center justify-between gap-4 px-4 sm:px-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/reconecta.svg" alt={nomeLoja} className="h-8 w-auto" />
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-marinho-2">
            <IconeCadeado tamanho={15} className="text-azul" />
            Pagamento seguro
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1080px] flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>

      <footer className="border-t border-gelo bg-branco">
        <div className="mx-auto flex w-full max-w-[1080px] flex-col items-center gap-4 px-4 py-6 text-center text-[12px] text-marinho-3 sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-3">
            <span>Pagamento processado por</span>
            <SeloAsaas altura={22} />
          </div>
          <div className="flex flex-col gap-0.5 sm:items-end">
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
