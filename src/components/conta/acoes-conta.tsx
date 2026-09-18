"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { IconeChave, IconeSair } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";

export function AcoesConta() {
  const { notificar } = useToast();
  const [enviando, setEnviando] = useState(false);

  async function redefinirSenha() {
    setEnviando(true);
    try {
      const res = await fetch("/api/conta/redefinir-senha", { method: "POST" });
      const corpo = (await res.json().catch(() => ({}))) as { erro?: string };
      if (!res.ok) throw new Error(corpo.erro || "Não foi possível enviar o e-mail.");
      notificar({
        tom: "sucesso",
        titulo: "E-mail enviado",
        descricao: "Abra o link recebido para definir uma nova senha.",
      });
    } catch (e) {
      notificar({ tom: "erro", titulo: "Falha ao enviar", descricao: (e as Error).message });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variante="secundario" icone={<IconeChave tamanho={16} />} carregando={enviando} onClick={redefinirSenha}>
        Redefinir minha senha
      </Button>
      <Button variante="fantasma" icone={<IconeSair tamanho={16} />} href="/auth/logout">
        Sair da conta
      </Button>
    </div>
  );
}
