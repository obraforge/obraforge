# Guia de marca do obraforge — direção "Prancha"

Escolhida pelo dono em 21/09/2026, entre três direções (Prancha, Caderno de obra, Norma técnica).
O doc explica; os tokens em [`dashboard/src/styles/tokens.css`](../../dashboard/src/styles/tokens.css)
obrigam. Nenhuma cor, fonte ou espaçamento fora deles.

## Racional

O site lê como uma folha de projeto. O engenheiro reconhece a prancha e o **carimbo** (o selo do
canto, com os dados da folha) sem precisar de explicação. A página de cada skill tem um carimbo com
área, fase, versão, estado e o hash: é o elemento memorável, e é também a prova de confiança
(mostra o que a CLI confere). O resto da página é leitura limpa.

## Paleta (papéis semânticos)

| Papel | Claro | Escuro ("cópia heliográfica") | Uso |
| --- | --- | --- | --- |
| `paper` | `#ffffff` | `#0f2a4a` | Fundo |
| `ink` | `#1c2127` | `#e6eef8` | Texto principal |
| `ink-2` | `#4a5360` | `#b3c3d6` | Texto secundário, rótulos |
| `line` | `#d5dae1` | `#2c4a70` | Bordas, divisórias |
| `grid` | `#edf1f6` | `#173558` | Grade fina do carimbo |
| `accent` | `#1d4f91` | `#9cc7ff` | Link, foco, aba ativa |
| `notice-bg` / `notice-ink` | `#fff4d6` / `#5c4200` | `#3a2e10` / `#ffe2a0` | Aviso de responsabilidade técnica, estado depreciada |

Todos os pares de texto passam de 4,5:1 (AA). O escuro segue `prefers-color-scheme`, sem botão.

## Tipografia

Fontes do sistema, nenhuma baixada: `system-ui` para texto e `ui-monospace` para dado técnico
(comando, hash, versão, rótulos do carimbo). Escala: 0,875 · 1 · 1,125 · 1,5 · 2,25 rem. Títulos
em peso 650, corpo em 400. Rótulo do carimbo em monoespaçada caixa-alta 0,75 rem.

## Espaçamento e forma

Escala de 4 px (Tailwind). Bordas de 1 px na cor `line`, cantos retos (0) no carimbo e nos blocos
de comando, 4 px nos botões. Sem sombra.

## Componentes-chave

- **Carimbo:** tabela de duas colunas com borda, grade fina ao fundo, no topo direito da página da
  skill (abaixo do título no celular).
- **Comando:** bloco monoespaçado com o comando inteiro e o botão `Copiar`. Abas por ferramenta
  com JavaScript; sem ele, os quatro comandos empilhados.
- **Aviso:** faixa com barra lateral, cores `notice`.
- **Lista de skills:** linhas, não cards: nome em monoespaçada, área e fase à direita, descrição
  abaixo.

## Voz e tom

Direto, de engenheiro para engenheiro. Verbo de ação em botão (`Copiar`, `Ver no GitHub`). Nunca
"solução completa" nem superlativo. O que a skill faz dito com o verbo dela: confere, estrutura,
explica.

## Navegação

Topo com três destinos (Skills, Sobre, GitHub) e o nome levando à home. Toda skill a no máximo dois
cliques da home. Rodapé com licença, versão do catálogo, código, `SECURITY.md` e privacidade.

## Acessibilidade

Contraste AA; foco visível com contorno `accent` de 2 px; alvo de toque de pelo menos 44 px nos
botões e abas; labels em todo campo; `lang="pt-BR"`; semântica de lista e tabela.

## Proibições

Imagem decorativa, ilustração, gradiente de fundo, emoji como ícone, contagem de estrela ou de
instalação, card-grid uniforme, fonte externa, script de terceiro.
