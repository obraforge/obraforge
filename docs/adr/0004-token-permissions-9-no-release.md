# ADR-0004 — Token-Permissions em 9 por causa do job de release

- **Estado:** aceito
- **Data:** 21/09/2026
- **Decisor:** dono do projeto
- **Revoga em parte:** o critério de pronto do D2 no plano da fase 0 (`docs/planos/fase-0-fundacao.md`
  §8), só no ponto "10 nos cinco checks": `Token-Permissions` passa a valer com 9, pelo motivo abaixo.
  Os outros quatro (`Dangerous-Workflow`, `Pinned-Dependencies`, `Security-Policy`, `License`)
  continuam exigindo 10.

## Contexto

O primeiro Scorecard publicado (21/09/2026) deu 10 em quatro dos cinco checks e 9 em
`Token-Permissions`, por duas permissões de escrita:

1. `codeql.yml` com `security-events: write` no topo — corrigido no mesmo PR deste ADR, descendo a
   permissão para o job.
2. `release.yml`, job `release`, com `contents: write` no nível do job. A doc do Scorecard só não
   desconta essa permissão quando o job "utiliza uma ação ou comando de empacotamento reconhecido".

O `release.yml` tem três jobs de propósito (ver o commit do C3): `verificar` (só leitura), `publicar`
(só `id-token: write`, roda `npm publish`) e `release` (só `contents: write`, cria a release no
GitHub com o changelog e o SBOM). O token OIDC do npm nunca fica no mesmo job que escreve no
repositório, e o job que escreve no repositório não roda código de dependência.

## Decisão

Manter os três jobs e aceitar `Token-Permissions` em 9.

**Gatilho de revisão:** o Scorecard passar a reconhecer a criação de release como empacotamento, ou o
GitHub oferecer criar release sem `contents: write`.

## Consequências

- Boas: a separação de privilégios do release continua mais estrita do que a heurística do Scorecard
  enxerga; nenhuma publicação passa a depender de passo humano.
- Ruins: o selo do Scorecard mostra 9 nesse check, e quem olha só o número vê um desconto que não
  corresponde a uma permissão excessiva.

## Alternativas rejeitadas

- **Criar a release no job `publicar`:** junta o token OIDC e a escrita no repositório no job que roda
  `npm ci` e o build. O ganho no Scorecard não está nem confirmado.
- **Release manual pelo dono, com o SBOM como artefato do workflow:** dá 10, mas acrescenta um passo
  humano em toda release e contraria "nada é publicado por pessoa" do plano.
