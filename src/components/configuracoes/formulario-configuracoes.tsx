"use client";

import { useEffect, useState } from "react";
import { Selo } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Painel } from "@/components/ui/card";
import { Campo, Entrada } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { ChaveConfig } from "@/lib/configuracoes";
import { chamarApi, ErroHttp } from "@/lib/http-cliente";

type Config = Record<ChaveConfig, string>;

type Ambiente = {
  asaas: "simulacao" | "sandbox" | "production";
  asaasChave: boolean;
  webhookToken: boolean;
  webhookUrl: string;
  pagadorSandbox: boolean;
  banco: "postgres" | "pglite";
  baseUrl: string;
  gtmEnv: string;
};

type Webhook = { url: string; ambiente: string; tokenConfigurado: boolean; webhook: { id: string; enabled: boolean; interrupted: boolean; events: string[] } | null };

const AMBIENTE_ROTULO = { simulacao: "Simulação (sem Asaas)", sandbox: "Sandbox do Asaas", production: "Produção" };

export function FormularioConfiguracoes({ inicial, ambiente }: { inicial: Config; ambiente: Ambiente }) {
  const { notificar } = useToast();
  const [valores, setValores] = useState<Config>(inicial);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [webhook, setWebhook] = useState<Webhook | null | "erro">(null);
  const [registrando, setRegistrando] = useState(false);

  useEffect(() => {
    let ativo = true;
    chamarApi<Webhook>("/api/admin/asaas/webhook")
      .then((w) => ativo && setWebhook(w))
      .catch(() => ativo && setWebhook("erro"));
    return () => {
      ativo = false;
    };
  }, []);

  const definir = (chave: ChaveConfig) => (e: React.ChangeEvent<HTMLInputElement>) => setValores((v) => ({ ...v, [chave]: e.target.value }));

  async function salvar() {
    setSalvando(true);
    setErros({});
    try {
      const r = await chamarApi<{ configuracoes: Config }>("/api/admin/configuracoes", { method: "PUT", body: JSON.stringify(valores) });
      setValores(r.configuracoes);
      notificar({ tom: "sucesso", titulo: "Configurações salvas" });
    } catch (e) {
      const erro = e as ErroHttp;
      if (erro.campos) setErros(erro.campos);
      notificar({ tom: "erro", titulo: "Não foi possível salvar", descricao: erro.message });
    } finally {
      setSalvando(false);
    }
  }

  async function registrarWebhook() {
    setRegistrando(true);
    try {
      const r = await chamarApi<{ webhook: Webhook["webhook"]; criado: boolean }>("/api/admin/asaas/webhook", { method: "POST" });
      setWebhook((w) => (w && w !== "erro" ? { ...w, webhook: r.webhook } : w));
      notificar({ tom: "sucesso", titulo: r.criado ? "Webhook registrado no Asaas" : "Webhook já existia", descricao: "Os eventos de pagamento chegarão nesta aplicação." });
    } catch (e) {
      notificar({ tom: "erro", titulo: "Não foi possível registrar", descricao: (e as Error).message });
    } finally {
      setRegistrando(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_1fr]">
      <div className="flex flex-col gap-5">
        <Painel
          titulo="Google Tag Manager"
          descricao="Instalado em todas as páginas de checkout. Os eventos enviados estão documentados em docs/09-gtm-e-eventos.md."
          acoes={
            <Button tamanho="sm" onClick={salvar} carregando={salvando}>
              Salvar
            </Button>
          }
        >
          <div className="flex flex-col gap-4">
            <Campo rotulo="ID do container" htmlFor="c-gtm" erro={erros.gtm_id} dica={ambiente.gtmEnv ? `Vazio usa o valor do ambiente (${ambiente.gtmEnv}).` : "Formato GTM-XXXXXXX. Vazio desativa o rastreamento."}>
              <Entrada id="c-gtm" value={valores.gtm_id} onChange={definir("gtm_id")} placeholder="GTM-XXXXXXX" className="font-mono" aria-invalid={Boolean(erros.gtm_id)} />
            </Campo>
            <div className="rounded-panel border border-gelo bg-neve p-4 text-[13px] text-marinho-2">
              <p className="font-medium text-marinho">Eventos disparados no checkout</p>
              <p className="mt-1 font-mono text-[12px] leading-relaxed">
                view_item · begin_checkout · add_to_cart · remove_from_cart · generate_lead · checkout_dados_completos · add_payment_info · pix_gerado · boleto_gerado · cartao_enviado · aguardando_pagamento · purchase · pagamento_recusado · pagamento_expirado
              </p>
            </div>
          </div>
        </Painel>

        <Painel
          titulo="Loja e suporte"
          descricao="Aparecem no rodapé do checkout e nas mensagens ao cliente."
          acoes={
            <Button tamanho="sm" onClick={salvar} carregando={salvando}>
              Salvar
            </Button>
          }
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo rotulo="Nome da loja" htmlFor="c-loja" erro={erros.nome_loja}>
              <Entrada id="c-loja" value={valores.nome_loja} onChange={definir("nome_loja")} />
            </Campo>
            <Campo rotulo="E-mail de suporte" htmlFor="c-email" opcional erro={erros.email_suporte}>
              <Entrada id="c-email" type="email" value={valores.email_suporte} onChange={definir("email_suporte")} />
            </Campo>
            <Campo rotulo="WhatsApp de suporte" htmlFor="c-zap" opcional erro={erros.whatsapp_suporte} dica="Com DDD, só números. Ex.: 11999998888">
              <Entrada id="c-zap" inputMode="numeric" value={valores.whatsapp_suporte} onChange={definir("whatsapp_suporte")} />
            </Campo>
          </div>
        </Painel>
      </div>

      <div className="flex flex-col gap-5">
        <Painel titulo="Ambiente" descricao="Definido pelas variáveis do servidor (.env).">
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-marinho-2">Asaas</dt>
              <dd>
                <Selo tom={ambiente.asaas === "production" ? "verde" : ambiente.asaas === "sandbox" ? "azul" : "ambar"} ponto>
                  {AMBIENTE_ROTULO[ambiente.asaas]}
                </Selo>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-marinho-2">Chave da API</dt>
              <dd>
                <Selo tom={ambiente.asaasChave ? "verde" : "neutro"}>{ambiente.asaasChave ? "Configurada" : ambiente.asaas === "simulacao" ? "Não necessária" : "Faltando"}</Selo>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-marinho-2">Banco de dados</dt>
              <dd>
                <Selo tom={ambiente.banco === "postgres" ? "verde" : "ambar"}>{ambiente.banco === "postgres" ? "PostgreSQL" : "PGlite local"}</Selo>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-marinho-2">URL base</dt>
              <dd className="truncate font-mono text-[12px] text-marinho-2">{ambiente.baseUrl}</dd>
            </div>
          </dl>
        </Painel>

        <Painel titulo="Webhook do Asaas" descricao="Como o Asaas avisa que um pagamento entrou. Sem ele, o status é conferido por consulta periódica.">
          <div className="flex flex-col gap-3 text-sm">
            <div className="rounded-panel border border-gelo bg-neve px-3 py-2 font-mono text-[12px] text-marinho-2 break-all">
              {webhook && webhook !== "erro" ? webhook.url : ambiente.webhookUrl}
            </div>
            {ambiente.asaas === "sandbox" && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-marinho-2">Conta pagadora (Pix de teste)</span>
                <Selo tom={ambiente.pagadorSandbox ? "verde" : "neutro"}>{ambiente.pagadorSandbox ? "Configurada" : "Opcional"}</Selo>
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <span className="text-marinho-2">Token de verificação</span>
              <Selo tom={ambiente.webhookToken ? "verde" : "bordo"}>{ambiente.webhookToken ? "Configurado" : "Defina ASAAS_WEBHOOK_TOKEN"}</Selo>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-marinho-2">Registro no Asaas</span>
              {webhook === null ? (
                <Selo tom="neutro">Consultando</Selo>
              ) : webhook === "erro" ? (
                <Selo tom="neutro">Indisponível</Selo>
              ) : webhook.webhook ? (
                <Selo tom={webhook.webhook.enabled && !webhook.webhook.interrupted ? "verde" : "bordo"} ponto>
                  {webhook.webhook.interrupted ? "Interrompido" : webhook.webhook.enabled ? "Ativo" : "Desativado"}
                </Selo>
              ) : (
                <Selo tom="ambar" ponto>
                  Não registrado
                </Selo>
              )}
            </div>
            <Button variante="secundario" tamanho="sm" onClick={registrarWebhook} carregando={registrando} disabled={!ambiente.webhookToken || webhook === "erro"}>
              Registrar webhook no Asaas
            </Button>
            <p className="text-[12px] text-marinho-3">Em desenvolvimento local o Asaas não alcança localhost; use um túnel (ngrok, cloudflared) ou o deploy.</p>
          </div>
        </Painel>
      </div>
    </div>
  );
}
