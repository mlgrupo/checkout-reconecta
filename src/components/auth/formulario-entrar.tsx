"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Campo, Entrada } from "@/components/ui/field";
import { IconeAlerta } from "@/components/ui/icons";
import { chamarApi, ErroHttp } from "@/lib/http-cliente";

/** Login do administrador local, usado enquanto o Auth0 não está configurado. */
export function FormularioEntrar({ destino }: { destino: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await chamarApi("/api/auth/entrar", { method: "POST", body: JSON.stringify({ email, senha }) });
      router.replace(destino);
      router.refresh();
    } catch (err) {
      setErro((err as ErroHttp).message);
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={entrar} className="mt-6 flex flex-col gap-4" noValidate>
      <Campo rotulo="E-mail" htmlFor="email">
        <Entrada
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@reconectaoficial.com.br"
          aria-invalid={Boolean(erro)}
        />
      </Campo>
      <Campo rotulo="Senha" htmlFor="senha">
        <Entrada
          id="senha"
          type="password"
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          aria-invalid={Boolean(erro)}
        />
      </Campo>

      {erro && (
        <p role="alert" className="flex items-start gap-2 text-[13px] text-bordo">
          <IconeAlerta tamanho={15} className="mt-0.5 shrink-0" />
          {erro}
        </p>
      )}

      <Button type="submit" tamanho="lg" className="w-full" carregando={enviando}>
        Entrar
      </Button>
    </form>
  );
}
