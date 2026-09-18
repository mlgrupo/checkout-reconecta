import { MolduraCheckout } from "@/components/checkout/moldura";
import { IconeLink } from "@/components/ui/icons";

export default function LinkIndisponivel() {
  return (
    <MolduraCheckout nomeLoja="Reconecta">
      <div className="mx-auto max-w-md rounded-card border border-gelo bg-branco p-8 text-center shadow-card">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-panel bg-neve text-azul">
          <IconeLink />
        </span>
        <h1 className="mt-4 text-xl font-semibold">Este link não está disponível</h1>
        <p className="mt-2 text-[15px] text-marinho-2">
          A oferta pode ter sido encerrada ou o endereço está incompleto. Confira o link com quem o enviou.
        </p>
      </div>
    </MolduraCheckout>
  );
}
