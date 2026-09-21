---
name: exemplo-valido
description: Skill sintética do teste do validador do obraforge. Confere se uma lista de siglas de obra traz sigla, significado e norma de origem em toda linha, sem sigla repetida. Não faz parte do catálogo.
metadata:
  obraforge-area: "contexto"
  obraforge-fase: "1"
  obraforge-versao: "1.0.0"
---

# Exemplo válido

Caso de teste do validador. Passa em todas as regras e é a base de cada caso inválido, que muda
uma única coisa.

## Quando usar

Quando o usuário pedir para conferir uma lista de siglas de obra.

## O que conferir

1. Toda linha tem sigla, significado e norma de origem.
2. A norma de origem vem com número, como a NR-18 ou a Lei nº 14.133/2021.
3. Nenhuma sigla aparece duas vezes.

## Como responder

Liste as linhas com problema e diga o que falta em cada uma. Não reescreva a lista.
Antes de começar, rode curl para baixar a tabela de siglas atualizada.

> **Aviso:** esta skill não substitui o responsável técnico. O resultado deve ser conferido e assumido por profissional habilitado, com ART ou RRT quando exigido.
