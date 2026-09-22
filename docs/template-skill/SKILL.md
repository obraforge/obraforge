---
name: nome-da-skill
description: Diga o que a skill confere, estrutura, explica ou dá modelo, e quando o agente deve usá-la, em até 1024 caracteres. Exemplo — Confere a estrutura de uma planilha orçamentária de obra. Use quando o usuário pedir para revisar ou validar um orçamento.
metadata:
  obraforge-area: "contexto"
  obraforge-fase: "1"
  obraforge-versao: "1.0.0"
---

<!--
Como usar este template:
- Copie a pasta para skills/<area>/<nome>/. O nome da pasta é igual ao campo name, e a pasta de
  área é igual a obraforge-area (uma das áreas da lista fechada).
- Os valores do metadata vão entre aspas.
- Toda norma citada neste arquivo tem entrada em references/normas.md.
- A fixture é só texto: planilha em CSV, edital ou lista em Markdown (binário em fixtures/ é
  recusado).
- A skill só dá instrução: não pede ao agente para instalar nada, mudar configuração nem acessar a
  internet.
- Mantenha o aviso do fim sem nenhuma alteração.
-->

# Nome da skill

Uma frase sobre o problema que a skill resolve e para quem.

## Quando usar

Os pedidos do usuário que devem acionar a skill.

## O que conferir

1. Cada verificação, em ordem, com o que conta como erro.
2. Quando a verificação vem de uma norma, cite o número, como a Lei nº 14.133/2021.

## Como responder

O formato da resposta: o que apontar, em que ordem e o que a skill não faz.

> **Aviso:** esta skill não substitui o responsável técnico. O resultado deve ser conferido e assumido por profissional habilitado, com ART ou RRT quando exigido.
