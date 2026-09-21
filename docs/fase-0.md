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
| A3 Controles | 🟡 falta só o 2FA da org | Conferido pela API em 21/09/2026: secret scanning, push protection e PVR ligados; membros não criam repositório; permissão padrão só leitura; pinagem por SHA exigida na org; token padrão do Actions só leitura e Actions sem aprovar PR; aprovação de workflow para contribuidor novo; ruleset de tags `v*` só para admin da org ([ADR-0003](adr/0003-ruleset-de-tags-de-release.md), sem prova de recusa: não há conta sem papel de admin); **ruleset da `main` (D-012)** com os seis checks amarrados ao app do GitHub Actions. **Push direto em `main` recusado** em 21/09/2026 (`GH013: Changes must be made through a pull request`), mesmo vindo do admin. Falta o 2FA obrigatório na org (a REST não grava o campo; o dono liga pela interface) |
| B1 Validador | ✅ camadas 1 e 2 | 137 testes verdes em Node 22.23.2 e 24.15.0. Um caso inválido por regra, cada um acusando **exatamente** o próprio código (os de `LINK` e `DADO-PESSOAL` são montados em tempo de teste, para nenhum CPF ou CNPJ com DV válido entrar no repositório público). `npm run validar` sobre `skills/` sai 0; sobre `invalida-NORMA` sai 1 com arquivo e linha. Vermelho demonstrado desligando `AGENCIA` (21 testes caem), `DADO-PESSOAL` (8) e `LINK` (7), só os da própria regra |
| B2 Catálogo | ✅ camadas 1 e 2 | 149 testes verdes em Node 22.23.2 e 24.15.0: geração idêntica byte a byte, um byte alterado muda só o hash daquela skill, checkout com `core.autocrlf=true` entrega LF pelo `.gitattributes` (repositório git real no teste). `--verificar` sai 1 com diff quando o arquivo está desatualizado. Vermelho demonstrado trocando a ordenação por bytes pela comparação de string. PRs A, B e C do §10 simulados localmente com a cor esperada em cada comando |
| C1 CLI mínima | ✅ camadas 1 e 2; camada 3 local | `--version`, `--help`, `list` com `util.parseArgs` e zero dependência. Tarball de `npm pack` com exatamente as 13 entradas da lista branca (teste falha se sobrar ou faltar; vermelho demonstrado vazando `dist/test/`). Instalado do tarball numa pasta vazia: `--version` imprime `0.0.1`, `list` imprime a frase de catálogo vazio. Node 20.20.2 real sai 3 com a versão mínima. Descrição de skill sanitizada antes do terminal (vermelho demonstrado). A camada 3 no npm é o C3 |
| D1 CI | ✅ camadas 1 a 3 | Primeira execução no GitHub (push de 21/09/2026) verde nos seis checks: `validar`, `catalogo`, `testes (22)`, `testes (24)`, `build`, `osv` — os nomes que o ruleset exige |
| D2 Segurança contínua | ✅ camadas 1 a 3 | CodeQL sem alerta. Scorecard publicado sobre `415f132` (21/09/2026): **10 nos cinco checks** (`Dangerous-Workflow`, `Token-Permissions`, `Pinned-Dependencies`, `Security-Policy`, `License`) depois do PR #2, que desceu a permissão do CodeQL para o job ([ADR-0005](adr/0005-token-permissions-deu-10.md) corrige a premissa do ADR-0004). Linha de base da nota geral: 6.9; `Branch-Protection` 4 (teto 8 pela D-012), e `Code-Review`, `Maintained`, `CII-Best-Practices` e `Fuzzing` abertos — dependem de histórico, de mais mantenedores ou estão fora do escopo da fase 0. Dependabot ativo: o PR #1 (subir `@types/node` para 26) foi fechado com resposta, e o `dependabot.yml` passou a ignorar major desse pacote |
| C2 Publicação inicial | ✅ camadas 2 e 3 | Feito pelo dono em 21/09/2026 com npm 11.19.1 e conta pessoal com 2FA: `npm view obraforge versions` → só `0.0.0`, depreciada ("Reserva de nome; use a versão mais recente."); `npm trust list obraforge` → `github`, `release.yml`, `obraforge/obraforge`, permissão de publish; publishing access em "Require two-factor authentication and disallow tokens"; `gh secret list` vazio. Organização `obraforge` criada no npm, dentro da conta pessoal, reservando o escopo `@obraforge` |
| C3 Release | 🟡 escrito e verificado localmente | Guardas com verde e vermelho testados (inclusive simulando as linhas `run:` do workflow num repositório git temporário); actionlint sem achados. Falta C2, a data da `0.0.1` no CHANGELOG e a tag |

**Push:** a `main` foi enviada em 21/09/2026 com autorização do dono; daqui em diante toda mudança entra por PR (D-012).

## O teste da fase 0 (§10 do plano) — 21/09/2026

| # | Item | Estado | Evidência |
| --- | --- | --- | --- |
| 1 | Clone limpo verde em Node 22 e 24 | ✅ | Local e no job `testes` (matriz 22 e 24) |
| 2 | PR A (skill válida, catálogo regenerado) → verde | ✅ | [#4](https://github.com/obraforge/obraforge/pull/4). A primeira rodada deu vermelho no `testes`: três testes presumiam `skills/` vazio. Corrigido no [#7](https://github.com/obraforge/obraforge/pull/7); a rodada seguinte ficou verde nos seis checks |
| 3 | PR B (sem `fixtures/`) → vermelho só no `validar`, com `ESTRUTURA` | ✅ | [#5](https://github.com/obraforge/obraforge/pull/5): `ESTRUTURA contexto/exemplo-fase-0 — falta fixtures/entrada.*` |
| 4 | PR C (catálogo não regenerado) → vermelho só no `catalogo`, com o diff | ✅ | [#6](https://github.com/obraforge/obraforge/pull/6): `catalog.json desatualizado`, diff de `"skills": []` |
| 5 | Os três fechados sem merge, links aqui | ✅ | Acima |
| 6 | Push direto em `main` recusado | ✅ | `GH013: Changes must be made through a pull request`, vindo do admin |
| 7 | Tag `v0.0.1` publica; `npx obraforge@0.0.1 --version` imprime `0.0.1`; provenance; SBOM na release | ⬜ | C2 feito; data da `0.0.1` no CHANGELOG neste PR; a tag vem depois do merge |
| 8 | Tag de versão divergente recusada antes de publicar | ⬜ | Depois do C2 |
| 9 | `gh secret list` vazio; Scorecard com 10 nos cinco checks do D2 | ✅ | Segredos: nenhum. Scorecard sobre `415f132`: 10 nos cinco |

## Pendências do dono

1. **2FA obrigatório na org**, pela interface (Settings → Authentication security).

Resolvidas em 21/09/2026: o código de conduta fica no Contributor Covenant 3.0 em inglês, com
contato `obraforge+contato@gmail.com` (caixa dedicada do projeto, fora do login de GitHub e npm);
as actions de terceiros dos workflows estão autorizadas, com o `osv` rodando a action composta direto.

## Decisões da sessão 1

- [ADR-0001](adr/0001-execucao-em-github-issues-e-projects.md) e
  [ADR-0002](adr/0002-esm-e-build-com-tsc-sem-bundler.md).
- `typescript` 7.0.2 e `@types/node` 22.20.4, conferidos no npm e no OSV em 21/09/2026. Sem
  linter nem formatador na fase 0. `yaml` 2.9.1 entra no B1, quando for importado.
- Autor dos commits: e-mail noreply do GitHub, configurado no clone. Num clone novo:
  `git config user.email "$(gh api user --jq .id)+lucasmpantoja@users.noreply.github.com"`.
- Commits sem trailer de co-autoria.

## Notas para as próximas fatias

- **B1, limitação conhecida:** arquivo binário (byte NUL nos primeiros 8 KB, como um `.xlsx`) não
  é escaneado por `AGENCIA` nem `DADO-PESSOAL`. Decidir na fase 1, antes da primeira skill com
  fixture de planilha.
- **B1, CNPJ alfanumérico:** implementado com a fonte citada no código (Receita Federal e Serpro),
  consultada pelo agente que escreveu a regra e não reconferida na revisão.
- Fora de um terminal, o `node --test` imprime TAP no Node 22 (`# pass`) e o formato spec no
  Node 24 (`ℹ pass`). Quem filtrar a saída precisa considerar os dois.

## Para destravar o GitHub (checkpoint de 21/09/2026)

1. Autorização do push (o contato do código de conduta e as actions já estão resolvidos).
2. Depois do push: conferir os nomes reais dos checks e então o A3 (2FA da org com os dois
   métodos do dono conferidos antes, membros sem criar repositório, ruleset da `main` da D-012,
   Actions com token só leitura). O ruleset de tags `v*` já existe (ADR-0003).
3. C2 pelo dono; data da `0.0.1` no CHANGELOG; tag `v0.0.1`; PRs de demonstração do §10.

## Como abrir a sessão 2

- Itens C1, D1, A3, D2, C2, C3 e o teste do §10, na ordem do §14 do plano, com a calibração de
  lá (Opus em high para A3, C3 e o gate do §10).
- **Empacotamento (resolvido no C1):** `cli/scripts/prepack.mjs` copia `catalog.json`, `skills/`,
  `README.md` e `LICENSE` da raiz para `cli/` antes de `npm pack`/`npm publish`, e falha se achar
  link simbólico em `skills/`.
- O C2 é do dono: o agente guia e nunca vê credencial do npm. Exige npm 11.15.0 ou superior
  (local hoje: 11.12.1; o npm 12 já existe, conferir antes de atualizar).
- Passar pela classificação de superfície de risco antes de cada fatia.
