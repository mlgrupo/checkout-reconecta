"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Entrada } from "@/components/ui/field";
import { dinheiro } from "@/lib/formato";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  centavos: number | null;
  onCentavos: (valor: number | null) => void;
};

/** Campo de valor em reais que guarda centavos. Digita-se só números: 19700 → R$ 197,00. */
export function EntradaDinheiro({ centavos, onCentavos, ...props }: Props) {
  const [texto, setTexto] = useState(centavos === null ? "" : dinheiro(centavos));

  return (
    <Entrada
      {...props}
      inputMode="numeric"
      value={texto}
      onChange={(e) => {
        const digitos = e.target.value.replace(/\D/g, "").slice(0, 10);
        if (!digitos) {
          setTexto("");
          onCentavos(null);
          return;
        }
        const valor = Number(digitos);
        setTexto(dinheiro(valor));
        onCentavos(valor);
      }}
      placeholder="R$ 0,00"
    />
  );
}
