# 07 · Marca e logos

## Reconecta

A marca é **dourada**: o emblema (rosto entre ramos de louro) e a palavra "Reconecta" em `#C99B26`, o mesmo
dourado dos destaques do design system.

Os arquivos oficiais vieram em vermelho `#D3111A`, que era a versão anterior da marca. Foram recoloridos para
dourado preservando a diferença de claro e escuro entre os tons do emblema, para ele não virar uma mancha chapada.
O script usado está em `docs/marca/` como referência: converte cada vermelho para HSL, troca o matiz pelo dourado
e remapeia a luminosidade.

| Arquivo | Uso |
|---------|-----|
| `public/brand/reconecta.svg` | Marca horizontal (emblema + palavra). Cabeçalho do checkout e do painel. |
| `public/brand/reconecta-simbolo.svg` | Só o emblema. Favicon e espaços estreitos. |
| `src/app/icon.svg` | Favicon, cópia do emblema. |

Se a marca mudar de cor de novo, troque os arquivos e confira o contraste sobre branco: dourado sobre branco tem
contraste baixo, aceitável para logo mas não para texto.

### Instruções originais de instalação

1. Salve o arquivo como `public/brand/reconecta.svg` (SVG é o ideal; se só houver PNG, salve como
   `public/brand/reconecta.png` e troque a extensão em `src/components/brand/lockup.tsx` e
   `src/components/checkout/moldura.tsx`).
2. Se a arte for só o símbolo, monte a versão horizontal: símbolo + palavra "Reconecta" em Sora 600, cor `marinho`
   (`#0A1633`). A altura de referência é 32 px no checkout e 24 px na barra lateral.
3. O painel detecta o placeholder (atributo `data-placeholder`) e mostra "Marca: pendente" até a troca.
4. Arquivos-fonte (AI, PDF, PNG em alta) ficam em `docs/marca/`.

Cuidados com o emblema dourado: sobre branco o contraste é baixo. Use-o sempre acompanhado da palavra "Reconecta" em
marinho, com espaço livre de pelo menos metade da altura ao redor, e nunca sobre fundos dourados ou amarelos.

O favicon (`src/app/icon.svg`) é provisório; substitua pelo símbolo oficial quando houver versão simplificada.

## Asaas

O Asaas pede que o selo seja usado **sempre por link**, nunca como arquivo copiado:

```
https://baas.asaas.com/selos/Servicos_financeiros_Asaas-Reduzida-Negativo-Branco.svg?id=b5178165-2587-492e-9a38-6d6479117ded
```

É a versão **negativa (branca)**, então ele só existe sobre fundo escuro. O componente `SeloAsaas`
(`src/components/brand/selo-asaas.tsx`) o coloca dentro de uma pílula `marinho`, e é o único jeito de exibi-lo na plataforma.

Onde aparece:

- **Topo do checkout**: ao lado de "Pagamento seguro", com um divisor entre os dois. No celular o texto sai e ficam o cadeado e o selo.
- **Rodapé do checkout**: "Pagamento processado por" + selo + "Ambiente PCI DSS".
- **Tela de entrada e barra lateral**: lockup Reconecta | selo.
- Nunca recolorimos, esticamos ou recortamos o selo.

## Lockup de parceria

```
[ Reconecta ]  |  [ selo Asaas sobre marinho ]
```

A Reconecta é sempre a primeira e a maior; o selo tem 70% da altura da logo. Componente: `MarcaParceria`
(`variante="simples"` mostra só a Reconecta, para telas estreitas).

## Universal Login (Auth0)

Em **Branding → Universal Login**: logo = URL pública de `reconecta.svg` hospedada na plataforma; cor primária
`#0B3DFF`; fundo `#F5F8FF`.
