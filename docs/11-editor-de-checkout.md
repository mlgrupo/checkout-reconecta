# 11 · Editor de checkout

Personalização da aparência do checkout, com prévia ao vivo. Duas camadas:

| Camada | Onde | Quem edita |
|--------|------|------------|
| **Padrão da loja** | Painel → **Aparência** | Administrador |
| **Ajuste do link** | Painel → Links de checkout → **Aparência** | Operador e administrador |

O link herda tudo da loja e sobrescreve só o que você mexer. Se depois você mudar o padrão da loja, os campos
não personalizados do link acompanham sozinhos.

## O que dá para mudar

| Item | Efeito no checkout |
|------|--------------------|
| Modelo | **Clássico** (duas colunas, resumo fixo ao lado), **Compacto** (uma coluna, resumo no topo) ou **Focado** (coluna estreita centralizada). |
| Lado do resumo | Só no clássico: resumo à direita ou à esquerda do formulário. |
| Fundo | Claro ou escuro. O escuro inverte as superfícies e a tinta, mantendo a cor principal. |
| Ordem dos blocos | Seus dados, pagamento, order bump, garantia e depoimentos em qualquer ordem. A numeração das etapas e a navegação por teclado seguem a ordem escolhida. |
| Cor principal | Botões, passos numerados, método selecionado, links e foco. As variações de hover e fundo saem dela. |
| Banner | Imagem larga acima de tudo. |
| Título e subtítulo | Chamada antes do formulário. Em branco, o checkout começa direto nos campos. |
| Texto do botão | Substitui o texto automático ("Pagar R$ 544,00 com Pix"). |
| Cronômetro | Faixa de contagem regressiva no topo, com minutos e texto próprios. |
| Garantia | Selo abaixo do botão, com prazo em dias e texto. |
| Depoimentos | Até seis, com nome, texto e nota de 1 a 5 estrelas. |

O selo do Asaas, o rodapé de segurança e o destaque dourado do order bump não são editáveis: fazem parte da
identidade da parceria e da hierarquia visual do design system.

## Como a cor é aplicada

O editor não gera CSS novo. Ele sobrescreve os tokens do design system dentro do contêiner do checkout
(`TemaCheckout`), então todo `bg-azul`, `text-azul` e afins passam a usar a cor escolhida. As variações de hover,
fundo suave e cor de texto legível são calculadas em HSL a partir da cor principal, em `src/lib/cores.ts`.

Quando a cor escolhida é clara demais para texto branco, o botão principal passa a usar o navy do sistema,
mantendo o contraste mínimo de 4,5 para 1.

No fundo escuro os papéis se invertem: o tom "claro" da cor vira um tingimento escuro e o tom "profundo",
usado como texto sobre esse tingimento, fica claro. É o que mantém legível o método de pagamento selecionado.

Duas regras ficam fora das camadas do Tailwind de propósito, em `globals.css`: a cor do texto sobre a cor
principal e o fundo da pílula do selo Asaas. Regras sem camada vencem as utilitárias, que é o necessário para
sobrescrever `text-branco` e `bg-marinho` quando o tema inverte os tokens.

## Bandeiras de cartão

As nove bandeiras aceitas ficam logo abaixo do campo do número, todas em cinza. Assim que os primeiros dígitos
revelam a bandeira, só ela ganha cor e as outras se apagam. A detecção usa as faixas de BIN em
`src/lib/bandeiras.ts`, com Elo e Hipercard testados antes de Visa, Mastercard e Discover, porque suas faixas se
sobrepõem. A bandeira também define quantos dígitos o número deve ter e se o CVV tem 3 ou 4 casas.

Os arquivos ficam em `public/brand/bandeiras/icon-{id}.svg`. Para acrescentar uma bandeira, coloque o arquivo com
esse nome, adicione a faixa em `BANDEIRAS` e o id em `BANDEIRAS_EXIBIDAS`.

## A prévia

A prévia renderiza o **componente real** do checkout, não uma imitação. Para isso, **todo** o checkout usa
container queries em vez de quebras por janela: ele responde à largura do bloco onde está, não à da janela do
navegador. A prévia então desenha o checkout na largura de verdade (1180 px no modo computador, 390 px no
celular) e reduz visualmente para caber na coluna. O que você vê é o que o cliente vê.

Isso vale para os campos também. Antes, só a grade principal respondia ao contêiner, e a prévia de celular
mostrava os campos do cartão lado a lado, espremidos, porque as classes `sm:` ainda olhavam para a janela.

No modo prévia nada é enviado: sem pedido, sem chamada ao Asaas e sem evento no GTM.

## Onde fica guardado

- Padrão da loja: tabela `configuracoes`, chave `aparencia`, em JSON.
- Ajuste do link: coluna `aparencia` (jsonb) em `links_checkout`, contendo **só os campos diferentes do padrão**.

A resolução acontece em `mesclarAparencia` (`src/lib/aparencia.ts`), que aplica o padrão e depois o ajuste do link.
Ao salvar um link, `diferencaDoPadrao` calcula o que realmente difere, para a herança continuar valendo.

## API

```
GET    /api/admin/aparencia              padrão da loja, já resolvido
PUT    /api/admin/aparencia              define o padrão da loja (admin)
GET    /api/admin/links/:id/aparencia    efetiva do link + padrão + campos personalizados
PUT    /api/admin/links/:id/aparencia    salva o ajuste do link (guarda só a diferença)
DELETE /api/admin/links/:id/aparencia    link volta a herdar tudo
```

## Limites conhecidos

- Não há upload de favicon nem troca da logo por link: a logo vem de `public/brand/` (docs/07).
- A página de pagamento (Pix, boleto, confirmação) herda a cor, mas não o banner nem os blocos.
- Sem agendamento: a mudança vale assim que você salva.
