import type { Metadata } from "next";
import Link from "next/link";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { STATUS_UI, METODO_ROTULO } from "@/components/pedidos/tipos";
import { CabecalhoPagina } from "@/components/shell/cabecalho-pagina";
import { Selo } from "@/components/ui/badge";
import { Painel } from "@/components/ui/card";
import { IconeSeta } from "@/components/ui/icons";
import { PAPEL_INFO } from "@/lib/auth/roles";
import { exigirUsuario } from "@/lib/auth/session";
import { env, prontidao } from "@/lib/env";
import { dinheiro } from "@/lib/formato";
import { resumoPainel, ultimosPedidos } from "@/lib/pedidos/consultas";
import { tempoRelativo } from "@/lib/utils";

export const metadata: Metadata = { title: "Painel" };
export const dynamic = "force-dynamic";

async function logoOficial() {
  try {
    const svg = await readFile(path.join(process.cwd(), "public", "brand", "reconecta.svg"), "utf8");
    return !svg.includes("data-placeholder");
  } catch {
    return false;
  }
}

function saudacao() {
  const h = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date()));
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function PaginaPainel() {
  const usuario = await exigirUsuario();
  const [logo, resumo, recentes] = await Promise.all([logoOficial(), resumoPainel(), ultimosPedidos(8)]);
  const primeiroNome = (usuario.name || usuario.nickname || usuario.email || "").split(/[\s@]/)[0];

  const integracoes = [
    { nome: "Autenticação (Auth0)", detalhe: prontidao.auth0 ? "Login e sessão funcionando." : "Preencha as variáveis AUTH0_* no .env.", pronto: prontidao.auth0 },
    { nome: "Gestão de usuários", detalhe: prontidao.auth0Management ? "Management API conectada." : "Crie a aplicação Machine to Machine e preencha AUTH0_MGMT_*.", pronto: prontidao.auth0Management },
    {
      nome: `Asaas (${env.ASAAS_ENV === "production" ? "produção" : env.ASAAS_ENV === "sandbox" ? "sandbox" : "simulação"})`,
      detalhe: prontidao.asaasReal ? "Chave da API configurada." : env.ASAAS_ENV === "simulacao" ? "Cobranças fictícias. Troque para sandbox quando tiver a chave." : "Aguardando a chave da API do Asaas.",
      pronto: prontidao.asaasReal,
    },
    { nome: "Webhook do Asaas", detalhe: prontidao.asaasWebhook ? "Token configurado. Registre em Configurações." : "Defina ASAAS_WEBHOOK_TOKEN no .env.", pronto: prontidao.asaasWebhook },
    { nome: "Banco de dados", detalhe: prontidao.bancoExterno ? "PostgreSQL externo." : "PGlite local (só para desenvolvimento).", pronto: prontidao.bancoExterno },
    { nome: "Marca (logo oficial)", detalhe: logo ? "Logo oficial aplicada." : "Placeholder. Substitua public/brand/reconecta.svg.", pronto: logo },
  ];
  const prontas = integracoes.filter((i) => i.pronto).length;

  const tiles = [
    { rotulo: "Vendas hoje", valor: dinheiro(resumo.hoje.receita), detalhe: `${resumo.hoje.pagos} pago${resumo.hoje.pagos === 1 ? "" : "s"} de ${resumo.hoje.pedidos} pedido${resumo.hoje.pedidos === 1 ? "" : "s"}` },
    { rotulo: "Últimos 30 dias", valor: dinheiro(resumo.ultimos30.receita), detalhe: `${resumo.ultimos30.pagos} pagos · ${resumo.ultimos30.bumps} com order bump` },
    {
      rotulo: "Conversão (30 dias)",
      valor: resumo.ultimos30.pedidos ? `${Math.round((resumo.ultimos30.pagos / resumo.ultimos30.pedidos) * 100)}%` : "—",
      detalhe: "pedidos que viraram pagamento",
    },
    { rotulo: "Aguardando pagamento", valor: String(resumo.aguardando), detalhe: "Pix e boletos em aberto" },
  ];

  return (
    <>
      <CabecalhoPagina titulo={`${saudacao()}, ${primeiroNome}`} descricao="Resumo das vendas e do que ainda falta configurar." />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t, i) => (
          <div key={t.rotulo} className={i === 0 ? "colchetes rounded-card border border-gelo bg-branco p-4 shadow-card" : "rounded-card border border-gelo bg-branco p-4 shadow-card"}>
            <p className="text-[12px] text-marinho-3">{t.rotulo}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-marinho">{t.valor}</p>
            <p className="mt-0.5 text-[12px] text-marinho-2">{t.detalhe}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Painel
          titulo="Últimos pedidos"
          semPreenchimento
          acoes={
            <Link href="/pedidos" className="inline-flex items-center gap-1 text-sm font-medium text-azul hover:underline">
              Ver todos
              <IconeSeta tamanho={16} />
            </Link>
          }
        >
          {recentes.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-marinho-2">
              Nenhum pedido ainda. Crie um <Link href="/produtos" className="text-azul hover:underline">produto</Link> e um <Link href="/links" className="text-azul hover:underline">link de checkout</Link> para começar.
            </p>
          ) : (
            <ul className="divide-y divide-gelo">
              {recentes.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <span className="w-12 font-mono text-[12px] text-marinho-3">#{p.numero}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-marinho">{p.clienteNome}</span>
                    <span className="block truncate text-[12px] text-marinho-2">
                      {METODO_ROTULO[p.metodo]} · {tempoRelativo(p.criadoEm.toISOString())}
                    </span>
                  </span>
                  <span className="font-display font-semibold text-marinho">{dinheiro(p.valorTotalCentavos)}</span>
                  <Selo tom={STATUS_UI[p.status].tom} ponto>
                    {STATUS_UI[p.status].rotulo}
                  </Selo>
                </li>
              ))}
            </ul>
          )}
        </Painel>

        <div className="flex flex-col gap-5">
          <Painel titulo="Prontidão da plataforma" descricao={`${prontas} de ${integracoes.length} itens prontos`} semPreenchimento>
            <ul className="divide-y divide-gelo">
              {integracoes.map((i) => (
                <li key={i.nome} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-marinho">{i.nome}</p>
                    <p className="text-[12px] text-marinho-2">{i.detalhe}</p>
                  </div>
                  <Selo tom={i.pronto ? "verde" : "ambar"} ponto>
                    {i.pronto ? "Pronto" : "Pendente"}
                  </Selo>
                </li>
              ))}
            </ul>
          </Painel>

          <Painel titulo="Seu acesso">
            <div className="flex flex-wrap gap-2">
              {usuario.roles.length ? (
                usuario.roles.map((r) => (
                  <Selo key={r} tom={r === "admin" ? "dourado" : "azul"}>
                    {PAPEL_INFO[r].rotulo}
                  </Selo>
                ))
              ) : (
                <Selo tom="ambar">Sem papel definido</Selo>
              )}
            </div>
            <p className="mt-3 text-[13px] text-marinho-2">
              {usuario.roles.length ? usuario.roles.map((r) => PAPEL_INFO[r].descricao).join(" ") : "Um administrador precisa atribuir um papel para liberar as funções da plataforma."}
            </p>
          </Painel>
        </div>
      </div>
    </>
  );
}
