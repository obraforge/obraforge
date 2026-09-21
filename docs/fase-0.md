# Fase 0 — Fundação: estado e evidências

Registro vivo da fase 0. O caminho está em [`planos/fase-0-fundacao.md`](planos/fase-0-fundacao.md).
Evidência que não está aqui não conta (regra 6 do Roadmap). As camadas são as do §9 do plano:
**1** código com testes verdes · **2** cerca demonstrada (a recusa foi vista recusando) ·
**3** artefato real (o que o usuário ou o GitHub enxergam).

## Estado por item — 21/09/2026

| Item | Estado | Evidência |
| --- | --- | --- |
| A1 Esqueleto | ✅ camadas 1 e 2 | Clone limpo: `npm ci && npm run build && npm test` verde em Node 22.23.2 e 24.15.0. `npm ls --omit=dev --workspace cli` sem dependência. Vermelhos demonstrados, cada um isolado: caminho errado do `package.json` (ENOENT), área repetida, área com slug inválido. Secret scanning sem alerta: confere-se depois do primeiro push |
| A2 Comunidade | 🟡 escrito, não publicado | Os dois critérios de pronto (perfil de comunidade pela API e relato de teste no PVR) dependem do push |
| A3 Controles | 🟡 parcial | Secret scanning, push protection e Private Vulnerability Reporting ligados em 21/09/2026 pela API. O resto (2FA da org, ruleset, Actions) fica para a sessão 2 |
| B1 Validador | ⬜ | Próximo: bloco 1b |
| B2 Catálogo | ⬜ | Próximo: bloco 1b |
| C1, C2, C3, D1, D2 | ⬜ | Sessão 2 |

**Push:** os commits da fase 0 ficam locais até o dono revisar e autorizar (decisão de 21/09/2026).

## Pendências do dono

1. **Código de conduta, idioma:** hoje é o Contributor Covenant 3.0 em inglês, porque a tradução
   oficial em pt-BR só existe para a 2.1. Manter, ou trocar pela 2.1 em pt-BR.
2. **Código de conduta, contato de aplicação:** o arquivo tem `[CONTATO A DEFINIR PELO DONO]`.
   Preencher antes do push.
3. **Revisão dos commits e autorização do push.**

## Decisões da sessão 1

- [ADR-0001](adr/0001-execucao-em-github-issues-e-projects.md) e
  [ADR-0002](adr/0002-esm-e-build-com-tsc-sem-bundler.md).
- `typescript` 7.0.2 e `@types/node` 22.20.4, conferidos no npm e no OSV em 21/09/2026. Sem
  linter nem formatador na fase 0. `yaml` 2.9.1 entra no B1, quando for importado.
- Autor dos commits: e-mail noreply do GitHub, configurado no clone. Num clone novo:
  `git config user.email "$(gh api user --jq .id)+lucasmpantoja@users.noreply.github.com"`.
- Commits sem trailer de co-autoria.

## Notas para as próximas fatias

- **C1:** os testes compilam para `dist/test/`, então a lista branca do campo `files` é
  `dist/src/`, não `dist/`. O teste do `npm pack --dry-run` do C1 confere.
- **B1:** a lista de áreas em `tools/src/areas.ts` veio da §5 de *Base Técnica · Visão e
  Decisões*. Conferir contra a §9 e a §13 de *Catálogo · Skills — Spec* antes de usar no validador.
- Fora de um terminal, o `node --test` imprime TAP no Node 22 (`# pass`) e o formato spec no
  Node 24 (`ℹ pass`). Quem filtrar a saída precisa considerar os dois.

## Como abrir o bloco 1b (B1 e B2)

- Sessão nova, **Opus em high**, ~1,5–3 h.
- Ler o §6 do plano (B1 e B2), este arquivo e o [`AGENTS.md`](../AGENTS.md).
- Specs no ChatPRD, projeto Obraforge: *Catálogo · Skills — Spec* (§9 e §13) e
  *Base Técnica · Segurança — Spec* (§3). Os documentos são grandes; extrair só o campo `content`.
- Decisões que abrem o B1: o texto exato do aviso-padrão (template em `docs/template-skill/`) e a
  lista inicial de padrões da regra `AGENCIA`.
- Passar pela classificação de superfície de risco antes de cada fatia.
