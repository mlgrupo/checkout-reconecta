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

## A prévia

A prévia renderiza o **componente real** do checkout, não uma imitação. Para isso, o layout do checkout usa
container queries em vez de quebras por janela: ele responde à largura do bloco onde está. A prévia então desenha
o checkout na largura de verdade (1180 px no modo computador, 390 px no celular) e reduz visualmente para caber
na coluna. O que você vê é o que o cliente vê.

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
