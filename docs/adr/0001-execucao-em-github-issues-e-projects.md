# ADR-0001 — Execução em GitHub Issues e Projects

- **Estado:** aceito
- **Data:** 13/09/2026 (escolha do dono), registrado em 21/09/2026
- **Decisor:** dono do projeto

## Contexto

O obraforge é código aberto e vai receber contribuição externa a partir da fase 2. O acompanhamento
do trabalho precisa ficar onde o contribuidor já está e onde a evidência de cada fase é verificável
(PRs, execuções de CI, releases). A casa usa o Linear em outros projetos.

## Decisão

A execução do obraforge — backlog, itens de fase e acompanhamento — fica em **GitHub Issues e
GitHub Projects** no repositório `obraforge/obraforge`. **O Linear não é usado no obraforge.**

## Consequências

- Boas: contribuidor externo propõe e acompanha sem conta em outra ferramenta; issue, PR e evidência
  de CI ficam ligadas no mesmo lugar; custo zero no plano Free da org.
- Ruins: o trabalho do obraforge fica fora da visão consolidada que o dono tem no Linear para os
  outros projetos; a gestão entre projetos passa a olhar dois lugares.

## Alternativas rejeitadas

- **Linear:** exige conta para acompanhar, e o que está lá fica invisível para o contribuidor externo.
- **Só `docs/` com checklists em markdown:** não tem atribuição, estado nem ligação com PR.
