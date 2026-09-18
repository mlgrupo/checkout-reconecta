"use client";

import { useState } from "react";
import { Escolha } from "@/components/ui/escolha";

/** Demonstração do dropdown na galeria de componentes. Só existe em desenvolvimento. */
export function DemoEscolha() {
  const [papel, setPapel] = useState("operador");
  return (
    <Escolha
      id="g-papel"
      valor={papel}
      onChange={setPapel}
      opcoes={[
        { valor: "admin", rotulo: "Administrador", descricao: "Acesso total, inclusive a usuários." },
        { valor: "operador", rotulo: "Operador", descricao: "Cria produtos, links e acompanha pedidos." },
        { valor: "leitura", rotulo: "Somente leitura", descricao: "Vê painéis e relatórios." },
        { valor: "suspenso", rotulo: "Suspenso", descricao: "Exemplo de opção desabilitada.", desabilitada: true },
      ]}
    />
  );
}
