# ADR-0005 — Token-Permissions deu 10: o critério do D2 volta a valer inteiro

- **Estado:** aceito
- **Data:** 21/09/2026
- **Decisor:** dono do projeto (decisão do ADR-0004 mantida; só a premissa foi corrigida)
- **Revoga em parte:** [ADR-0004](0004-token-permissions-9-no-release.md), no ponto que aceitava
  `Token-Permissions` em 9 e revogava em parte o critério de pronto do D2. A decisão de manter os três
  jobs do `release.yml` continua valendo.

## Contexto

O ADR-0004 partiu do primeiro Scorecard, que listou dois alertas de `Token-Permissions`, ambos com o
texto "score is 9": o topo do `codeql.yml` e o `contents: write` do job `release`. Depois que o PR #2
desceu a permissão do CodeQL para o job, o Scorecard publicado sobre o commit `415f132` (21/09/2026)
deu **10 em `Token-Permissions`**, sem nenhum alerta aberto desse check, com o job `release` intacto.
O desconto vinha só do topo do `codeql.yml`; o texto repetido nos dois alertas era a nota do check,
não a contribuição de cada alerta.

## Decisão

O critério de pronto do D2 volta a ser o do plano: **10 nos cinco checks** (`Dangerous-Workflow`,
`Token-Permissions`, `Pinned-Dependencies`, `Security-Policy`, `License`). O `release.yml` continua
com os três jobs.

## Consequências

- Boas: nenhum afrouxamento de critério; a separação de privilégios do release e a nota máxima
  convivem.
- Ruins: nenhuma. Fica a lição: ler a nota do check na API publicada, não inferir a contribuição de
  cada alerta pelo texto dele.

## Alternativas rejeitadas

- **Manter o ADR-0004 como está:** registraria como aceito um desconto que não existe.
