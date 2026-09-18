"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { MarcaParceria } from "@/components/brand/lockup";
import { Avatar } from "@/components/ui/avatar";
import { Selo } from "@/components/ui/badge";
import {
  IconeCaixa,
  IconeCheckout,
  IconeConta,
  IconeEngrenagem,
  IconeFechar,
  IconeLink,
  IconeMenu,
  IconePainel,
  IconePincel,
  IconeSair,
  IconeUsuarios,
} from "@/components/ui/icons";
import { PAPEL_INFO } from "@/lib/auth/roles";
import type { UsuarioSessao } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

type Item = {
  href: string;
  rotulo: string;
  icone: ReactNode;
  somenteAdmin?: boolean;
  emBreve?: boolean;
};

const itens: Item[] = [
  { href: "/painel", rotulo: "Painel", icone: <IconePainel /> },
  { href: "/pedidos", rotulo: "Pedidos", icone: <IconeCheckout /> },
  { href: "/produtos", rotulo: "Produtos", icone: <IconeCaixa /> },
  { href: "/links", rotulo: "Links de checkout", icone: <IconeLink /> },
  { href: "/aparencia", rotulo: "Aparência", icone: <IconePincel />, somenteAdmin: true },
  { href: "/usuarios", rotulo: "Acessos", icone: <IconeUsuarios />, somenteAdmin: true },
  { href: "/configuracoes", rotulo: "Configurações", icone: <IconeEngrenagem />, somenteAdmin: true },
  { href: "/conta", rotulo: "Minha conta", icone: <IconeConta /> },
];

const titulos: Record<string, string> = {
  "/painel": "Painel",
  "/pedidos": "Pedidos",
  "/produtos": "Produtos",
  "/links": "Links de checkout",
  "/aparencia": "Aparência do checkout",
  "/usuarios": "Acessos",
  "/configuracoes": "Configurações",
  "/conta": "Minha conta",
};

export function Shell({ usuario, children }: { usuario: UsuarioSessao; children: ReactNode }) {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);
  const ehAdmin = usuario.roles.includes("admin");
  const fecharMenu = () => setMenuAberto(false);

  const titulo = Object.entries(titulos).find(([p]) => pathname.startsWith(p))?.[1] ?? "Checkout Reconecta";
  const visiveis = itens.filter((i) => !i.somenteAdmin || ehAdmin);

  const navegacao = (
    <nav aria-label="Principal" className="flex flex-1 flex-col gap-0.5 px-3">
      {visiveis.map((item) => {
        const ativo = pathname.startsWith(item.href);
        if (item.emBreve) {
          return (
            <span
              key={item.href}
              aria-disabled
              className="flex h-10 items-center gap-3 rounded-control px-3 text-sm text-marinho-3"
            >
              {item.icone}
              <span className="flex-1">{item.rotulo}</span>
              <Selo tom="dourado">em breve</Selo>
            </span>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={fecharMenu}
            aria-current={ativo ? "page" : undefined}
            className={cn(
              "relative flex h-10 items-center gap-3 rounded-control px-3 text-sm font-medium transition-colors",
              ativo ? "bg-azul-claro/60 text-azul-profundo" : "text-marinho-2 hover:bg-gelo-2 hover:text-marinho",
            )}
          >
            {ativo && <span aria-hidden className="absolute left-0 top-2 h-6 w-[3px] rounded-r bg-azul" />}
            {item.icone}
            {item.rotulo}
          </Link>
        );
      })}
    </nav>
  );

  const rodape = (
    <div className="border-t border-gelo p-3">
      <Link
        href="/conta"
        onClick={fecharMenu}
        className="flex items-center gap-3 rounded-control px-2 py-2 transition-colors hover:bg-gelo-2"
      >
        <Avatar nome={usuario.name} email={usuario.email} src={usuario.picture} tamanho="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-marinho">{usuario.name || usuario.email}</span>
          <span className="block truncate text-[12px] text-marinho-3">
            {usuario.roles.length ? usuario.roles.map((r) => PAPEL_INFO[r].rotulo).join(", ") : "Sem papel definido"}
          </span>
        </span>
      </Link>
      <a
        href="/sair"
        className="mt-1 flex h-9 items-center gap-3 rounded-control px-3 text-sm text-marinho-2 transition-colors hover:bg-bordo-claro hover:text-bordo"
      >
        <IconeSair />
        Sair
      </a>
    </div>
  );

  return (
    <div className="flex min-h-dvh">
      {/* Barra lateral (desktop) */}
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-gelo bg-branco lg:flex">
        <div className="px-5 py-5">
          <MarcaParceria altura={24} />
        </div>
        {navegacao}
        {rodape}
      </aside>

      {/* Barra lateral (mobile) */}
      {menuAberto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setMenuAberto(false)}
            className="absolute inset-0 animate-fade bg-marinho/30"
          />
          <aside className="relative flex h-full w-[280px] animate-slide-in-left flex-col bg-branco shadow-drawer">
            <div className="flex items-center justify-between px-5 py-5">
              <MarcaParceria variante="simples" altura={24} />
              <button
                type="button"
                onClick={() => setMenuAberto(false)}
                aria-label="Fechar"
                className="rounded-control p-1.5 text-marinho-3 hover:bg-gelo-2"
              >
                <IconeFechar />
              </button>
            </div>
            {navegacao}
            {rodape}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-gelo bg-branco/85 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setMenuAberto(true)}
            aria-label="Abrir menu"
            className="rounded-control p-1.5 text-marinho-2 hover:bg-gelo-2 lg:hidden"
          >
            <IconeMenu />
          </button>
          <span className="lg:hidden">
            <MarcaParceria variante="simples" altura={22} />
          </span>
          <h1 className="hidden text-[15px] font-semibold lg:block">{titulo}</h1>
          <span className="ml-auto hidden text-[12px] text-marinho-3 sm:block">Ambiente de operação</span>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1120px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
