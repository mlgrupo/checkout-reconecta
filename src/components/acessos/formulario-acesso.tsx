"use client";

import { useState } from "react";
import type { Acesso } from "@/components/acessos/tipos";
import { Button } from "@/components/ui/button";
import { Gaveta } from "@/components/ui/drawer";
import { Escolha } from "@/components/ui/escolha";
import { Campo, Entrada, Interruptor } from "@/components/ui/field";
import { IconeChave, IconeLixeira } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { PAPEIS, PAPEL_INFO, type Papel } from "@/lib/auth/roles";
import { chamarApi, ErroHttp } from "@/lib/http-cliente";

type Props = {
  aberta: boolean;
  acesso: Acesso | null;
  onFechar: () => void;
  onSalvo: () => void;
};

/** Gera uma senha fácil de ditar e difícil de adivinhar. */
function senhaSugerida() {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(15));
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length])
    .join("")
    .replace(/(.{5})(?=.)/g, "$1-");
}

export function FormularioAcesso({ aberta, acesso, onFechar, onSalvo }: Props) {
  const { notificar } = useToast();
  const editando = Boolean(acesso);

  const [nome, setNome] = useState(acesso?.nome ?? "");
  const [email, setEmail] = useState(acesso?.email ?? "");
  const [senha, setSenha] = useState(() => (acesso ? "" : senhaSugerida()));
  const [papel, setPapel] = useState<Papel>(acesso?.papel ?? "operador");
  const [ativo, setAtivo] = useState(acesso?.ativo ?? true);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  async function salvar() {
    setSalvando(true);
    setErros({});
    try {
      if (editando && acesso) {
        await chamarApi(`/api/admin/acessos/${acesso.id}`, {
          method: "PATCH",
          body: JSON.stringify({ nome, papel, ativo, senha: senha || undefined }),
        });
        notificar({
          tom: "sucesso",
          titulo: "Acesso salvo",
          descricao: senha ? "A senha foi trocada. Combine a nova com a pessoa." : `${nome} foi atualizado.`,
        });
      } else {
        await chamarApi("/api/admin/acessos", { method: "POST", body: JSON.stringify({ nome, email, senha, papel }) });
        notificar({
          tom: "sucesso",
          titulo: "Acesso criado",
          descricao: "Combine a senha com a pessoa por um canal seguro. Ela pode trocar depois com você.",
        });
      }
      onSalvo();
    } catch (e) {
      const erro = e as ErroHttp;
      if (erro.campos) setErros(erro.campos);
      notificar({ tom: "erro", titulo: "Não foi possível salvar", descricao: erro.message });
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!acesso) return;
    setSalvando(true);
    try {
      await chamarApi(`/api/admin/acessos/${acesso.id}`, { method: "DELETE" });
      notificar({ tom: "info", titulo: "Acesso excluído", descricao: `${acesso.email} não entra mais no painel.` });
      onSalvo();
    } catch (e) {
      notificar({ tom: "erro", titulo: "Não foi possível excluir", descricao: (e as Error).message });
    } finally {
      setSalvando(false);
      setConfirmandoExclusao(false);
    }
  }

  return (
    <Gaveta
      aberta={aberta}
      onFechar={onFechar}
      titulo={editando ? "Editar acesso" : "Novo acesso"}
      descricao={editando ? acesso?.email : "A pessoa entra com o e-mail e a senha definidos aqui."}
      rodape={
        <>
          <Button variante="fantasma" onClick={onFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} carregando={salvando}>
            {editando ? "Salvar alterações" : "Criar acesso"}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          void salvar();
        }}
      >
        <Campo rotulo="Nome completo" htmlFor="a-nome" erro={erros.nome}>
          <Entrada id="a-nome" value={nome} onChange={(e) => setNome(e.target.value)} aria-invalid={Boolean(erros.nome)} />
        </Campo>

        <Campo
          rotulo="E-mail"
          htmlFor="a-email"
          erro={erros.email}
          dica={editando ? "O e-mail identifica o acesso e não muda aqui." : "Será o login desta pessoa."}
        >
          <Entrada
            id="a-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={editando}
            autoComplete="off"
            aria-invalid={Boolean(erros.email)}
          />
        </Campo>

        <Campo rotulo="Papel" htmlFor="a-papel" erro={erros.papel}>
          <Escolha
            id="a-papel"
            valor={papel}
            onChange={setPapel}
            opcoes={PAPEIS.map((p) => ({ valor: p, rotulo: PAPEL_INFO[p].rotulo, descricao: PAPEL_INFO[p].descricao }))}
          />
        </Campo>

        <Campo
          rotulo={editando ? "Nova senha" : "Senha"}
          htmlFor="a-senha"
          opcional={editando}
          erro={erros.senha}
          dica={editando ? "Em branco, a senha atual continua valendo." : "Mínimo de 10 caracteres. Combine por um canal seguro."}
        >
          <div className="flex gap-2">
            <Entrada
              id="a-senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="new-password"
              className="font-mono"
              aria-invalid={Boolean(erros.senha)}
            />
            <Button variante="secundario" icone={<IconeChave tamanho={16} />} onClick={() => setSenha(senhaSugerida())}>
              Gerar
            </Button>
          </div>
        </Campo>

        {editando && (
          <Interruptor
            tom="bordo"
            ativo={!ativo}
            onChange={(v) => setAtivo(!v)}
            rotulo="Desativar acesso"
            descricao="A pessoa continua na lista, mas não consegue entrar."
          />
        )}

        {editando && (
          <div className="rounded-panel border border-bordo/25 bg-bordo-claro/50 p-4">
            <p className="text-sm font-medium text-bordo">Excluir acesso</p>
            <p className="mt-0.5 text-[13px] text-marinho-2">
              Remove a pessoa de vez. Para suspender por um tempo, use o desativar acima.
            </p>
            {confirmandoExclusao ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variante="perigo" tamanho="sm" icone={<IconeLixeira tamanho={15} />} carregando={salvando} onClick={excluir}>
                  Confirmar exclusão
                </Button>
                <Button variante="fantasma" tamanho="sm" onClick={() => setConfirmandoExclusao(false)}>
                  Manter acesso
                </Button>
              </div>
            ) : (
              <Button
                variante="secundario"
                tamanho="sm"
                className="mt-3 text-bordo hover:border-bordo hover:text-bordo"
                onClick={() => setConfirmandoExclusao(true)}
              >
                Excluir este acesso
              </Button>
            )}
          </div>
        )}
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Gaveta>
  );
}
