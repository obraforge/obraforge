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
| B1 Validador | ✅ camadas 1 e 2 | 137 testes verdes em Node 22.23.2 e 24.15.0. Um caso inválido por regra, cada um acusando **exatamente** o próprio código (os de `LINK` e `DADO-PESSOAL` são montados em tempo de teste, para nenhum CPF ou CNPJ com DV válido entrar no repositório público). `npm run validar` sobre `skills/` sai 0; sobre `invalida-NORMA` sai 1 com arquivo e linha. Vermelho demonstrado desligando `AGENCIA` (21 testes caem), `DADO-PESSOAL` (8) e `LINK` (7), só os da própria regra |
| B2 Catálogo | ⬜ | Próximo |
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
- **B1, limitação conhecida:** arquivo binário (byte NUL nos primeiros 8 KB, como um `.xlsx`) não
  é escaneado por `AGENCIA` nem `DADO-PESSOAL`. Decidir na fase 1, antes da primeira skill com
  fixture de planilha.
- **B1, CNPJ alfanumérico:** implementado com a fonte citada no código (Receita Federal e Serpro),
  consultada pelo agente que escreveu a regra e não reconferida na revisão.
- Fora de um terminal, o `node --test` imprime TAP no Node 22 (`# pass`) e o formato spec no
  Node 24 (`ℹ pass`). Quem filtrar a saída precisa considerar os dois.

## Como abrir o B2

- Sonnet em high, ~30–60 min.
- Ler o §6 do plano (B2), este arquivo e o [`AGENTS.md`](../AGENTS.md). O B2 reaproveita a leitura
  de frontmatter e de `normas.md` do validador (`tools/src/`).
- Passar pela classificação de superfície de risco antes de cada fatia.
