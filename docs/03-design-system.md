# 03 · Design system

Direção: **futurista e limpa**. Branco como material principal, azul elétrico como sinal, dourado como
marca da parceria e bordô reservado para o que é irreversível. Nada de fundo escuro por padrão: a plataforma
é clara, precisa e confiante.

Os tokens vivem em `src/app/globals.css` (bloco `@theme`) e viram utilitários do Tailwind automaticamente
(`bg-azul`, `text-marinho-2`, `rounded-card`, `shadow-glow`, `font-display`).

## Cores

| Token | Hex | Papel |
|-------|-----|-------|
| `branco` | `#FFFFFF` | Superfícies principais: cartões, barra lateral, painéis. |
| `neve` | `#F5F8FF` | Fundo das áreas de conteúdo (branco levemente azulado). |
| `gelo` / `gelo-2` | `#E4EAF8` / `#F0F4FC` | Bordas, divisores, hover suave. |
| `azul` | `#0B3DFF` | Ação primária, foco, item ativo. |
| `azul-escuro` / `azul-profundo` | `#0629B8` / `#041A7A` | Hover/pressionado e texto sobre azul-claro. |
| `azul-claro` / `azul-medio` | `#DFE7FF` / `#6B8CFF` | Fundos de destaque, bordas em hover, estado desabilitado. |
| `marinho` | `#0A1633` | Texto principal. Nunca usamos preto puro. |
| `marinho-2` / `marinho-3` | `#3B4A6B` / `#7B88A6` | Texto secundário e terciário/placeholder. |
| `dourado` | `#C9A227` | Marca da parceria: anel do login, cantos em colchete, selo de administrador. |
| `dourado-claro` / `dourado-escuro` | `#F5EAD0` / `#9A7A14` | Fundo e texto de selos dourados. |
| `bordo` | `#7A1E2E` | Ações destrutivas, bloqueio, erros. |
| `bordo-claro` / `bordo-escuro` | `#F7E4E8` / `#58121F` | Fundo de alerta e hover do botão de perigo. |
| `verde` / `ambar` | `#0F8A5F` / `#B26A00` | Estados auxiliares: pronto / pendente. Discretos, nunca protagonistas. |

### Regras de uso

1. **Dourado é raro.** No máximo um elemento dourado de destaque por tela (`Painel destaque`, selo de admin, anel do login).
2. **Bordô só para o irreversível.** Excluir, bloquear, erro. Nunca para decoração.
3. **Azul é ação.** Um botão primário por contexto. Links e itens ativos também são azuis.
4. **Sombras azuladas.** `shadow-card` e `shadow-glow` têm tom de azul; não usamos sombra cinza genérica.

## Tipografia

| Papel | Fonte | Onde |
|-------|-------|------|
| Display | **Sora** (variável) | Títulos (`h1`–`h4`), números de destaque, iniciais de avatar. Geométrica, dá o tom futurista. |
| Texto | **IBM Plex Sans** 400/500/600 | Corpo, formulários, tabelas. Técnica e legível em 13–15px. |
| Dados | **IBM Plex Mono** 400/500 | Somente identificadores reais (IDs, chaves), nunca rótulos. |

Escala usada: 12 / 13 / 15 (base) / 18 / 24 / 28 px. Rótulos em caixa baixa (sentence case), sem caixa alta.

## Raios e hierarquia

| Token | Valor | Uso |
|-------|-------|-----|
| `rounded-control` | 8px | Inputs, botões, itens de menu. |
| `rounded-panel` | 14px | Blocos internos, alertas, itens de lista destacados. |
| `rounded-card` | 18px | Cartões e painéis de página. |
| `rounded-chip` | 999px | Selos, avatares, interruptores. |

A hierarquia de raios encode a hierarquia de conteúdo: quanto maior o contêiner, maior o raio.

## Assinaturas visuais

- **Malha de pontos** (`.malha`): fundo das telas públicas. Pontos azuis a 13% em grade de 22px.
- **Cantos em colchete** (`.colchetes`): dois cantos dourados que marcam o painel principal da tela. Um por tela.
- **Anel da parceria** (`AnelParceria`): o único movimento orquestrado da plataforma. Desenha-se uma vez ao abrir o login; depois um satélite azul orbita devagar. Respeita `prefers-reduced-motion`.

Movimento em todo o resto só responde a ações do usuário (abrir gaveta, avisos, hover).

## Componentes

| Componente | Arquivo | Variantes |
|------------|---------|-----------|
| `Button` | `ui/button.tsx` | `primario`, `secundario`, `fantasma`, `perigo`, `dourado`; tamanhos `sm`/`md`/`lg`; aceita `href` (vira `<a>`). |
| `Campo`, `Entrada`, `Selecao`, `Interruptor` | `ui/field.tsx` | Rótulo acima, dica ou erro abaixo. Interruptor com tom `azul` ou `bordo`. |
| `Selo` | `ui/badge.tsx` | Tons `azul`, `dourado`, `bordo`, `verde`, `ambar`, `neutro`; opcional `ponto`. |
| `Painel`, `EstadoVazio` | `ui/card.tsx` | `destaque` aplica os colchetes dourados. |
| `Gaveta` | `ui/drawer.tsx` | Painel lateral direito com foco preso, Esc e clique fora. |
| `Avatar` | `ui/avatar.tsx` | Foto ou iniciais em Sora sobre azul-claro. |
| `ToastProvider` / `useToast` | `ui/toast.tsx` | Avisos `sucesso`, `erro`, `info` no canto inferior direito. |
| `MarcaParceria` | `brand/lockup.tsx` | Lockup Reconecta + selo Asaas; `variante="simples"` mostra só a Reconecta. |
| `SeloAsaas` | `brand/selo-asaas.tsx` | Selo oficial por link, sempre em pílula `marinho` (é a versão branca). |
| `Shell` | `shell/shell.tsx` | Barra lateral fixa (desktop) ou gaveta (mobile), topo com título. |
| `MolduraCheckout` | `checkout/moldura.tsx` | Cabeçalho e rodapé das páginas públicas (logo, "Pagamento seguro", selo Asaas, suporte). |
| `Checkout` | `checkout/checkout.tsx` | Formulário de compra: passos numerados, seletor de meio de pagamento, order bump dourado, botão com o total. |
| `Pagamento` | `checkout/pagamento.tsx` | Estados do pedido: Pix, boleto, processando, confirmado, recusado, expirado. |
| `EntradaDinheiro` | `ui/entrada-dinheiro.tsx` | Campo de valor em reais que guarda centavos. |

### Checkout público

- Mesmo design system do painel; fundo `neve`, cartões brancos, um único destaque em colchetes (o resumo).
- O order bump é o único elemento dourado da página: borda tracejada dourada, chamada em Sora, preço original riscado.
  Ao ser aceito, vira uma linha verde discreta e entra no resumo.
- Os passos "1 Seus dados" e "2 Pagamento" são numerados porque são, de fato, uma sequência.
- Botão primário diz exatamente o que acontece e quanto custa: "Pagar R$ 544,00 com Pix".
- Estados de espera usam `ambar` com spinner; sucesso usa o check em dourado sobre `dourado-claro`.

## Escrita na interface

- Sentence case sempre. Sem caixa alta em rótulos.
- Botões dizem o que acontece: "Criar e enviar convite", "Salvar alterações", "Confirmar exclusão".
- Erros explicam o que aconteceu e como resolver, sem pedir desculpas.
- Telas vazias convidam à ação ("Crie o primeiro usuário da equipe para começar").
- Tratamento por "você"; tom direto e cordial.

## Acessibilidade

- Foco visível em tudo (`:focus-visible` azul).
- Contraste mínimo AA: `marinho-2` sobre branco passa; `marinho-3` só para texto auxiliar.
- Gaveta e menu mobile fecham com Esc; foco volta ao elemento de origem.
- Animações desligadas com `prefers-reduced-motion`.
