"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Gaveta } from "@/components/ui/drawer";
import { Campo, Entrada, Interruptor } from "@/components/ui/field";
import { IconeChave, IconeLixeira } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { chamarApi, type UsuarioLista } from "@/components/users/tipos";
import { PAPEIS, PAPEL_INFO, type Papel } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

type Props = {
  aberta: boolean;
  usuario: UsuarioLista | null;
  usuarioAtualId: string;
  onFechar: () => void;
  onSalvo: () => void;
};

type Campos = Record<string, string>;

export function FormularioUsuario({ aberta, usuario, usuarioAtualId, onFechar, onSalvo }: Props) {
  const { notificar } = useToast();
  const editando = Boolean(usuario);
  const ehVoce = usuario?.user_id === usuarioAtualId;

  // O componente é remontado (via key) a cada abertura, então o estado inicial vem direto das props.
  const [nome, setNome] = useState(usuario?.name ?? "");
  const [email, setEmail] = useState(usuario?.email ?? "");
  const [senha, setSenha] = useState("");
  const [convidar, setConvidar] = useState(true);
  const [papeis, setPapeis] = useState<Papel[]>(usuario?.papeis ?? ["operador"]);
  const [bloqueado, setBloqueado] = useState(Boolean(usuario?.blocked));
  const [erros, setErros] = useState<Campos>({});
  const [salvando, setSalvando] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [enviandoSenha, setEnviandoSenha] = useState(false);

  function alternarPapel(p: Papel) {
    setPapeis((atual) => (atual.includes(p) ? atual.filter((x) => x !== p) : [...atual, p]));
  }

  async function salvar() {
    setSalvando(true);
    setErros({});
    try {
      if (editando && usuario) {
        await chamarApi(`/api/admin/users/${encodeURIComponent(usuario.user_id)}`, {
          method: "PATCH",
          body: JSON.stringify({ nome, bloqueado, papeis }),
        });
        notificar({ tom: "sucesso", titulo: "Alterações salvas", descricao: `${nome || email} foi atualizado.` });
      } else {
        await chamarApi("/api/admin/users", {
          method: "POST",
          body: JSON.stringify({ nome, email, senha: convidar ? "" : senha, papeis, convidar }),
        });
        notificar({
          tom: "sucesso",
          titulo: "Usuário criado",
          descricao: convidar ? `Um e-mail para definir a senha foi enviado para ${email}.` : `${email} já pode entrar.`,
        });
      }
      onSalvo();
    } catch (e) {
      const erro = e as Error & { campos?: Campos };
      if (erro.campos) setErros(erro.campos);
      notificar({ tom: "erro", titulo: "Não foi possível salvar", descricao: erro.message });
    } finally {
      setSalvando(false);
    }
  }

  async function enviarRedefinicao() {
    if (!usuario) return;
    setEnviandoSenha(true);
    try {
      await chamarApi(`/api/admin/users/${encodeURIComponent(usuario.user_id)}/redefinir-senha`, { method: "POST" });
      notificar({ tom: "sucesso", titulo: "E-mail enviado", descricao: `${usuario.email} recebeu o link para redefinir a senha.` });
    } catch (e) {
      notificar({ tom: "erro", titulo: "Falha ao enviar", descricao: (e as Error).message });
    } finally {
      setEnviandoSenha(false);
    }
  }

  async function excluir() {
    if (!usuario) return;
    setExcluindo(true);
    try {
      await chamarApi(`/api/admin/users/${encodeURIComponent(usuario.user_id)}`, { method: "DELETE" });
      notificar({ tom: "info", titulo: "Usuário excluído", descricao: `${usuario.email} não tem mais acesso.` });
      onSalvo();
    } catch (e) {
      notificar({ tom: "erro", titulo: "Não foi possível excluir", descricao: (e as Error).message });
    } finally {
      setExcluindo(false);
      setConfirmandoExclusao(false);
    }
  }

  return (
    <Gaveta
      aberta={aberta}
      onFechar={onFechar}
      titulo={editando ? "Editar usuário" : "Novo usuário"}
      descricao={editando ? usuario?.email : "A conta é criada no Auth0 e o acesso vale imediatamente."}
      rodape={
        <>
          <Button variante="fantasma" onClick={onFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} carregando={salvando}>
            {editando ? "Salvar alterações" : convidar ? "Criar e enviar convite" : "Criar usuário"}
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
        <Campo rotulo="Nome completo" htmlFor="nome" erro={erros.nome}>
          <Entrada id="nome" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="off" aria-invalid={Boolean(erros.nome)} />
        </Campo>

        <Campo
          rotulo="E-mail"
          htmlFor="email"
          erro={erros.email}
          dica={editando ? "O e-mail é a identidade da conta e não pode ser alterado aqui." : "Será o login do usuário."}
        >
          <Entrada
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={editando}
            autoComplete="off"
            aria-invalid={Boolean(erros.email)}
          />
        </Campo>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-[13px] font-medium text-marinho">Papéis</legend>
          {PAPEIS.map((p) => {
            const marcado = papeis.includes(p);
            const travado = ehVoce && p === "admin";
            return (
              <label
                key={p}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-panel border px-4 py-3 transition-colors",
                  marcado ? "border-azul/40 bg-azul-claro/40" : "border-gelo hover:border-azul-medio",
                  travado && "cursor-not-allowed opacity-70",
                )}
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-azul"
                  checked={marcado}
                  disabled={travado}
                  onChange={() => alternarPapel(p)}
                />
                <span>
                  <span className="block text-sm font-medium text-marinho">{PAPEL_INFO[p].rotulo}</span>
                  <span className="block text-[13px] text-marinho-2">{PAPEL_INFO[p].descricao}</span>
                  {travado && <span className="block text-[12px] text-marinho-3">Você não pode remover seu próprio acesso de administrador.</span>}
                </span>
              </label>
            );
          })}
          {erros.papeis && <p className="text-[13px] text-bordo">{erros.papeis}</p>}
        </fieldset>

        {!editando && (
          <div className="flex flex-col gap-3">
            <Interruptor
              ativo={convidar}
              onChange={setConvidar}
              rotulo="Enviar convite por e-mail"
              descricao="O usuário recebe um link para criar a própria senha."
            />
            {!convidar && (
              <Campo rotulo="Senha inicial" htmlFor="senha" erro={erros.senha} dica="Mínimo de 12 caracteres. Compartilhe por um canal seguro.">
                <Entrada id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" aria-invalid={Boolean(erros.senha)} />
              </Campo>
            )}
          </div>
        )}

        {editando && (
          <div className="flex flex-col gap-3 border-t border-gelo pt-5">
            <Interruptor
              tom="bordo"
              ativo={bloqueado}
              onChange={setBloqueado}
              disabled={ehVoce}
              rotulo="Bloquear acesso"
              descricao={ehVoce ? "Você não pode bloquear a própria conta." : "A conta continua existindo, mas não consegue entrar."}
            />
            <Button variante="secundario" icone={<IconeChave tamanho={16} />} carregando={enviandoSenha} onClick={enviarRedefinicao}>
              Enviar e-mail de redefinição de senha
            </Button>
          </div>
        )}

        {editando && !ehVoce && (
          <div className="rounded-panel border border-bordo/25 bg-bordo-claro/50 p-4">
            <p className="text-sm font-medium text-bordo">Excluir usuário</p>
            <p className="mt-0.5 text-[13px] text-marinho-2">
              Remove a conta do Auth0 de forma definitiva. Para apenas suspender o acesso, use o bloqueio acima.
            </p>
            {confirmandoExclusao ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variante="perigo" tamanho="sm" icone={<IconeLixeira tamanho={15} />} carregando={excluindo} onClick={excluir}>
                  Confirmar exclusão
                </Button>
                <Button variante="fantasma" tamanho="sm" onClick={() => setConfirmandoExclusao(false)} disabled={excluindo}>
                  Manter usuário
                </Button>
              </div>
            ) : (
              <Button variante="secundario" tamanho="sm" className="mt-3 text-bordo hover:border-bordo hover:text-bordo" onClick={() => setConfirmandoExclusao(true)}>
                Excluir este usuário
              </Button>
            )}
          </div>
        )}

        {/* Permite Enter para enviar sem botão visível dentro do form */}
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Gaveta>
  );
}
