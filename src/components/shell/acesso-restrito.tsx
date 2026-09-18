import Link from "next/link";
import { Painel } from "@/components/ui/card";
import { IconeCadeado } from "@/components/ui/icons";

export function AcessoRestrito({ recurso }: { recurso: string }) {
  return (
    <Painel className="mx-auto max-w-lg">
      <div className="flex flex-col items-start gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-panel bg-bordo-claro text-bordo">
          <IconeCadeado />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Acesso restrito</h2>
          <p className="mt-1 text-[15px] text-marinho-2">
            {recurso} está disponível apenas para administradores. Se você precisa desse acesso, peça a
            um administrador para ajustar seu papel.
          </p>
        </div>
        <Link href="/painel" className="text-sm font-medium text-azul hover:underline">
          Voltar ao painel
        </Link>
      </div>
    </Painel>
  );
}
