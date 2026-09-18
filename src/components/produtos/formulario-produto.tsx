"use client";

import { useRef, useState } from "react";
import type { ProdutoLista } from "@/components/produtos/tipos";
import { Button } from "@/components/ui/button";
import { Gaveta } from "@/components/ui/drawer";
import { EntradaDinheiro } from "@/components/ui/entrada-dinheiro";
import { Campo, Entrada, Interruptor } from "@/components/ui/field";
import { IconeCaixa, IconeLixeira, IconeUpload } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { chamarApi, ErroHttp } from "@/lib/http-cliente";

type Props = {
  aberta: boolean;
  produto: ProdutoLista | null;
  podeExcluir: boolean;
  onFechar: () => void;
  onSalvo: () => void;
};

export function FormularioProduto({ aberta, produto, podeExcluir, onFechar, onSalvo }: Props) {
  const { notificar } = useToast();
  const editando = Boolean(produto);
  const arquivoRef = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState(produto?.nome ?? "");
  const [descricao, setDescricao] = useState(produto?.descricao ?? "");
  const [preco, setPreco] = useState<number | null>(produto?.precoCentavos ?? null);
  const [imagemUrl, setImagemUrl] = useState(produto?.imagemUrl ?? "");
  const [imagemId, setImagemId] = useState<string | null>(produto?.imagemId ?? null);
  const [previa, setPrevia] = useState<string | null>(produto?.imagem ?? null);
  const [ativo, setAtivo] = useState(produto?.ativo ?? true);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  async function enviarImagem(arquivo: File) {
    setEnviandoImagem(true);
    setErros((e) => ({ ...e, imagem: "" }));
    try {
      const form = new FormData();
      form.append("arquivo", arquivo);
      const r = await chamarApi<{ imagem: { id: string; url: string } }>("/api/admin/imagens", { method: "POST", body: form });
      setImagemId(r.imagem.id);
      setImagemUrl("");
      setPrevia(r.imagem.url);
    } catch (e) {
      setErros((atual) => ({ ...atual, imagem: (e as Error).message }));
    } finally {
      setEnviandoImagem(false);
    }
  }

  async function salvar() {
    setSalvando(true);
    setErros({});
    try {
      const corpo = {
        nome,
        descricao: descricao || null,
        precoCentavos: preco ?? 0,
        imagemUrl: imagemUrl || null,
        imagemId,
        ativo,
      };
      if (editando && produto) {
        await chamarApi(`/api/admin/produtos/${produto.id}`, { method: "PATCH", body: JSON.stringify(corpo) });
        notificar({ tom: "sucesso", titulo: "Produto salvo", descricao: `${nome} foi atualizado.` });
      } else {
        await chamarApi("/api/admin/produtos", { method: "POST", body: JSON.stringify(corpo) });
        notificar({ tom: "sucesso", titulo: "Produto criado", descricao: "Agora crie um link de checkout para vendê-lo." });
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
    if (!produto) return;
    setSalvando(true);
    try {
      await chamarApi(`/api/admin/produtos/${produto.id}`, { method: "DELETE" });
      notificar({ tom: "info", titulo: "Produto excluído" });
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
      titulo={editando ? "Editar produto" : "Novo produto"}
      descricao={editando ? produto?.slug : "Nome, valor e imagem que aparecem no checkout."}
      rodape={
        <>
          <Button variante="fantasma" onClick={onFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} carregando={salvando}>
            {editando ? "Salvar alterações" : "Criar produto"}
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
        <Campo rotulo="Nome do produto" htmlFor="p-nome" erro={erros.nome}>
          <Entrada id="p-nome" value={nome} onChange={(e) => setNome(e.target.value)} aria-invalid={Boolean(erros.nome)} placeholder="Ex.: Mentoria Reconecta" />
        </Campo>

        <Campo rotulo="Valor" htmlFor="p-preco" erro={erros.precoCentavos} dica="Valor cheio cobrado no checkout. Mínimo R$ 5,00.">
          <EntradaDinheiro id="p-preco" centavos={preco} onCentavos={setPreco} aria-invalid={Boolean(erros.precoCentavos)} />
        </Campo>

        <Campo rotulo="Descrição" htmlFor="p-desc" opcional erro={erros.descricao} dica="Uma ou duas frases que aparecem abaixo do nome no checkout.">
          <textarea
            id="p-desc"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={3}
            className="w-full rounded-control border border-gelo bg-branco px-3 py-2 text-sm text-marinho placeholder:text-marinho-3 hover:border-azul-medio focus:border-azul focus:shadow-glow focus:outline-none"
          />
        </Campo>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-[13px] font-medium text-marinho">Imagem</legend>
          <div className="flex items-start gap-4">
            <span className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-panel border border-gelo bg-neve">
              {previa ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previa} alt="" className="h-full w-full object-cover" />
              ) : (
                <IconeCaixa className="text-marinho-3" />
              )}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <input
                ref={arquivoRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void enviarImagem(f);
                  e.target.value = "";
                }}
              />
              <Button variante="secundario" tamanho="sm" icone={<IconeUpload tamanho={15} />} carregando={enviandoImagem} onClick={() => arquivoRef.current?.click()}>
                Enviar imagem
              </Button>
              <p className="text-[12px] text-marinho-3">PNG, JPG ou WebP até 2 MB. Quadrada fica melhor.</p>
              {previa && (
                <button
                  type="button"
                  className="self-start text-[12px] text-bordo hover:underline"
                  onClick={() => {
                    setPrevia(null);
                    setImagemId(null);
                    setImagemUrl("");
                  }}
                >
                  Remover imagem
                </button>
              )}
            </div>
          </div>
          <Campo rotulo="Ou informe a URL de uma imagem" htmlFor="p-url" opcional erro={erros.imagemUrl || erros.imagem}>
            <Entrada
              id="p-url"
              type="url"
              value={imagemUrl}
              placeholder="https://..."
              onChange={(e) => {
                setImagemUrl(e.target.value);
                setImagemId(null);
                setPrevia(e.target.value || null);
              }}
            />
          </Campo>
        </fieldset>

        <Interruptor ativo={ativo} onChange={setAtivo} rotulo="Produto ativo" descricao="Inativo: os links de checkout deste produto param de aceitar pedidos." />

        {editando && podeExcluir && (
          <div className="rounded-panel border border-bordo/25 bg-bordo-claro/50 p-4">
            <p className="text-sm font-medium text-bordo">Excluir produto</p>
            <p className="mt-0.5 text-[13px] text-marinho-2">Só é possível se nenhum link de checkout usar este produto. Caso contrário, desative-o.</p>
            {confirmandoExclusao ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variante="perigo" tamanho="sm" icone={<IconeLixeira tamanho={15} />} carregando={salvando} onClick={excluir}>
                  Confirmar exclusão
                </Button>
                <Button variante="fantasma" tamanho="sm" onClick={() => setConfirmandoExclusao(false)}>
                  Manter produto
                </Button>
              </div>
            ) : (
              <Button variante="secundario" tamanho="sm" className="mt-3 text-bordo hover:border-bordo hover:text-bordo" onClick={() => setConfirmandoExclusao(true)}>
                Excluir este produto
              </Button>
            )}
          </div>
        )}
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Gaveta>
  );
}
