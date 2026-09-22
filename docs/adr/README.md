# Decisões de arquitetura (ADR)

Cada decisão estrutural do obraforge é um arquivo `NNNN-titulo.md` nesta pasta, com contexto,
decisão, consequências (inclusive as ruins) e alternativas rejeitadas.

**ADR aceito não se edita.** Mudar uma decisão é escrever um ADR novo que diz, logo no início,
`Revoga:` ou `Revoga em parte:` e aponta o anterior.

## Histórico anterior a esta pasta

As decisões **D-001 a D-014** foram tomadas antes de o repositório existir e estão em
`ideias/obraforge/decisoes.md`, no repositório privado `brainstorming`, congelado desde a
graduação da ideia (D-014, 13/09/2026). Estão vigentes as decisões D-003 a D-014, menos os
trechos revogados por ADR daqui. A síntese delas está no documento *Base Técnica · Visão e
Decisões* (ChatPRD, v1.1 de 13/09/2026). Onde um ADR divergir de uma decisão D-, vale o ADR.

## Índice

| ADR | Título | Estado |
| --- | --- | --- |
| [0001](0001-execucao-em-github-issues-e-projects.md) | Execução em GitHub Issues e Projects | Aceito |
| [0002](0002-esm-e-build-com-tsc-sem-bundler.md) | ESM e build com `tsc`, sem bundler | Aceito; revoga em parte a D-004 |
| [0003](0003-ruleset-de-tags-de-release.md) | Ruleset de tags de release | Aceito; complementa a D-012 |
| [0004](0004-token-permissions-9-no-release.md) | Token-Permissions em 9 por causa do job de release | Aceito; revogado em parte pelo 0005 |
| [0005](0005-token-permissions-deu-10.md) | Token-Permissions deu 10: o critério do D2 volta a valer inteiro | Aceito; revoga em parte o 0004 |
| [0006](0006-endurecimento-do-validador.md) | Endurecimento do validador depois do gate da fase 0 | Aceito |
| [0007](0007-estado-da-skill.md) | Onde vive o estado depreciada ou retirada de uma skill | Aceito; revoga em parte o 0006 (lista branca do `metadata`) |
| [0008](0008-fixture-so-em-texto.md) | Fixture só em texto | Aceito; resolve a limitação do 0006 em `fixtures/` |
| [0009](0009-vercel-hobby-e-integracao-com-o-git.md) | Site na Vercel: plano Hobby e deploy pela integração com o Git | Aceito; revogado em parte pelo 0010 (forma de deploy) |
| [0010](0010-site-publicado-pelo-github-actions.md) | Site publicado pelo GitHub Actions, sem o app da Vercel | Aceito; revoga em parte o 0009 |
