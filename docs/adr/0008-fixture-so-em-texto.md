# ADR-0008 — Fixture só em texto

- **Estado:** aceito
- **Data:** 21/09/2026
- **Decisor:** dono do projeto (D2 do [plano da fase 1](../planos/fase-1-mvp.md))
- **Resolve:** a limitação do [ADR-0006](0006-endurecimento-do-validador.md) sobre conteúdo de
  binário, no que toca a `fixtures/`. Para as demais pastas, a limitação continua aceita.

## Contexto

O validador não varre conteúdo de arquivo binário da lista branca (planilha, PDF, desenho); só
confere o tamanho (ADR-0006). A regra `DADO-PESSOAL` funciona em texto. A fixture é justamente onde
um dado real de cliente, obra ou pessoa entraria (risco LLM02 da *Segurança — Spec*), e a primeira
skill da fase 1 é de planilha.

## Decisão

Dentro de `fixtures/` só entra texto UTF-8 (CSV, Markdown, texto, JSON e as demais extensões de
texto). Um arquivo com extensão da lista branca de binários dentro de `fixtures/`, em qualquer
subpasta e em qualquer caixa, falha com `ESTRUTURA`. Arquivo sem extensão binária já precisava ser
UTF-8, e continua precisando. Fora de `fixtures/` (ex.: `assets/`), a lista branca de binários
continua aceita, com a limitação do ADR-0006.

A planilha da `validar-planilha-orcamentaria` é um CSV; o edital e a lista de documentos das outras
duas skills da fase 1 são Markdown.

## Consequências

- Boas: toda fixture é varrida por `DADO-PESSOAL` e `AGENCIA`. O que a skill ensina a conferir não
  depende do formato do arquivo, e o agente do usuário lê o `.xlsx` real com as próprias
  ferramentas.
- Ruins: o exercício da skill não prova que o agente lê bem o formato binário real. Uma skill que
  precise de fixture que não cabe em texto (ex.: BIM, desenho) fica bloqueada até um ADR novo.

## Alternativas rejeitadas

- **Extrair o texto do `.xlsx` no validador** (ZIP de XML): código novo dentro da cerca, e o PDF
  continuaria sem varredura.
- **Aceitar binário só com revisão humana:** a cerca existe porque a revisão às vezes falha.

## Quando revisitar

Na primeira skill que precisar de fixture binária, com ADR novo que avalie a extração do texto
(dependência, licença, OSV) antes de abrir a exceção.
