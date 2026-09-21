# Plataforma · Fundação — Plano de Implementação

> **Cópia de referência.** Documento de origem: *Plataforma · Fundação — Plano de Implementação*, no projeto Obraforge do ChatPRD (v1 de 12/09/2026 e v1.1 de 13/09/2026; copiado em 21/09/2026, sem alteração de conteúdo). Existe no repositório para sessões que não acessam o ChatPRD (§14, Handoff). Este arquivo não é editado: decisão nova entra como ADR em [`docs/adr/`](../adr/).

---

**Plano de implementação.** Não é spec de módulo. É o documento que se leva ao agente de código para construir a fase 0 do **Base Técnica · Roadmap**. Lista os itens que as specs de plataforma presumem e que ainda não existem, com dependências, entregáveis, critério de pronto por item e o teste que define a fase inteira. **v1** — 12/09/2026. Consolida D-004, D-005, D-007, D-008, **D-010** (publicação inicial manual única no npm) e **D-011** (campos próprios no `metadata` e referências em `references/normas.md`) de `ideias/obraforge/decisoes.md`.

**Navegação:** Por que este plano existe · O que já existe · Conferências na fonte · Os itens · Bloco A · Bloco B · Bloco C · Bloco D · Critério de pronto · O teste da fase 0 · Pontos resolvidos · Pendências do dono · Ajustes nas specs · Ordem de execução e calibração

---

# 1. Por que este plano existe

Tudo o que precisava ser decidido para as fases 0 e 1 está decidido, e nada existe ainda: não há repositório, pacote, workflow nem validador. As seis specs de 12/09/2026 descrevem o destino. Este plano descreve **o caminho até o marco da fase 0**:

> **Um PR com skill válida fica verde e um PR com skill inválida fica vermelho no CI**, e `npx obraforge --version` funciona a partir de uma release publicada no npm com provenance.

## Os dois princípios

> **O CI precisa recusar antes de aceitar.** Toda cerca (regra do validador, frescor do catálogo, guarda da release) nasce com um caso que a faz ficar vermelha, e esse vermelho é demonstrado antes do verde.

> **Nada é publicado por pessoa, com uma exceção datada.** A única publicação humana é a `0.0.0` de reserva de nome (D-010). Da `0.0.1` em diante, só o workflow publica.

---

# 2. O que já existe (12/09/2026)

| Camada | Estado | Como foi conferido |
| --- | --- | --- |
| Org `obraforge` no GitHub | Plano Free, 0 repositórios. **2FA obrigatório: desligado.** Membros podem criar repositório: sim. Permissão padrão: leitura | `gh api orgs/obraforge` |
| Pacote `obraforge` no npm | Nome livre (404 no registro) | `npm view obraforge` |
| Domínios | `.com` e `.com.br` livres, não comprados | D-003 |
| Documentos | 7 specs v1 no ChatPRD e este plano | Projeto Obraforge |
| Decisões | Vigentes D-003 a D-011 | `oficina.py vigentes obraforge` |
| Ambiente local do dono | Node 24.15.0, **npm 11.12.1** (abaixo do mínimo do `npm trust`, ver C2) | `node --version`, `npm --version` |

---

# 3. Conferências na fonte (12/09/2026)

| Ponto | O que a fonte diz | Efeito neste plano |
| --- | --- | --- |
| Publicação por OIDC | Suportada a partir do GitHub Actions: npm CLI 11.5.1 ou superior, Node 22.14.0 ou superior, `id-token: write`, provenance automática quando repositório e pacote são públicos, sem runner self-hosted. Fonte: docs.npmjs.com/trusted-publishers (atualizada em 03/09/2026) | Item C3 |
| Publicação inicial | "The package you're configuring must already exist on the npm registry". `npm trust` exige npm 11.15.0 ou superior e 2FA na conta. Fonte: docs.npmjs.com/cli/v11/commands/npm-trust. A issue npm/cli#8544, que pede a versão inicial por OIDC, segue aberta | D-010, item C2 |
| Frontmatter Agent Skills | `name` com 1 a 64 caracteres, só `a-z`, `0-9` e hífen, sem hífen no início, no fim ou duplicado, igual ao nome da pasta. `description` com 1 a 1024 caracteres. `metadata` é um mapa de texto para texto. `allowed-tools` é experimental. Fonte: agentskills.io/specification | D-011, item B1 |
| Pasta de skills do Claude Code | Projeto em `.claude/skills/<nome>/SKILL.md`, pessoal em `~/.claude/skills/<nome>/SKILL.md`. Segue o padrão Agent Skills. **Não lê** `.agents/skills/`**.** Fonte: code.claude.com/docs/en/skills | Fecha o "[a confirmar]" da **Plataforma · CLI — Spec** |
| Linhas do Node | 22: correções de segurança até 30/04/2027. 24: suporte ativo até 20/10/2026, segurança até 30/04/2028. 26: lançado em 05/05/2026, suporte ativo até 27/10/2027. Fonte: endoflife.date/nodejs | `engines`, matriz do CI |
| SBOM | `npm sbom --sbom-format=cyclonedx\|spdx`, com `--omit` e `--package-lock-only`. Fonte: docs.npmjs.com/cli/v11/commands/npm-sbom | Item C3 |

---

# 4. Os itens

| # | Item | Onde | Natureza | Bloco |
| --- | --- | --- | --- | --- |
| A1 | **Repositório e esqueleto do monorepo** | `obraforge/obraforge` | Execução da D-004 | A |
| A2 | **Arquivos de comunidade** | raiz, `.github/` | Execução da D-007 e da D-008 | A |
| A3 | **Controles da org e do repositório** | configuração do GitHub | Execução da D-007 (pipeline) | A |
| B1 | **Validador de skill** | `tools/` | Execução do **Catálogo · Skills — Spec** §9 com a D-011 | B |
| B2 | **Gerador do** `catalog.json` | `tools/` | Execução do **Publicação e Plugin — Spec** §3 | B |
| C1 | **CLI mínima** | `cli/` | Execução do **CLI — Spec** (itens da fase 0) | C |
| C2 | **Publicação inicial e publicador confiável** | npm, feita pelo dono | Execução da D-010 | C |
| C3 | **Workflow de release** | `.github/workflows/release.yml` | Execução do **Publicação e Plugin — Spec** §5 e §8 | C |
| D1 | **Workflow de CI** | `.github/workflows/ci.yml` | Execução do **Publicação e Plugin — Spec** §8 | D |
| D2 | **Segurança contínua** (CodeQL, Scorecard, OSV, Dependabot) | `.github/` | Execução do **Segurança — Spec** §4, §5 e §8 | D |

**Fica de fora da fase 0:** skills reais, `add`, `search`, dashboard, plugin, domínio e INPI.

---

# 5. Bloco A — Repositório e governança

## A1 — Repositório e esqueleto do monorepo

### Desenho

| Elemento | Regra |
| --- | --- |
| **Repositório** | `obraforge/obraforge`, **público**. Criado pelo dono, porque a regra global só permite repositório público com pedido explícito. A provenance automática do npm exige repositório público |
| **Workspaces** | `cli/` (pacote `obraforge`, publicado) e `tools/` (`@obraforge/tools`, `"private": true`, nunca publicado). `dashboard/` nasce na fase 1 junto com o Astro |
| **Pastas** | `skills/` (vazia, com `README.md` explicando o formato), `docs/`, `.github/` |
| **TypeScript** | Modo `strict`. Build com `tsc`, sem bundler |
| **Testes** | `node:test`, o executor nativo do Node, sem dependência de teste |
| **Node** | `engines: ">=22"` (a linha mais antiga ainda com correções de segurança). CI em 22 e 24; release em 24. Revisar quando o 26 entrar em LTS e quando o 22 sair de suporte (30/04/2027) |
| **Determinismo** | `.gitattributes` com `* text=auto eol=lf`, para o hash da skill ser igual em Windows, macOS e Linux |
| **Dependências** | Lockfile commitado; sempre `npm ci`. `typescript` como devDependency. Um parser de YAML no `tools/` para o frontmatter. A CLI da fase 0 tem **zero dependências de runtime**. Cada dependência entra com versão estável, suporte, OSV e licença conferidos no registro oficial na adoção, registrados na descrição do PR |

### Entregáveis

`package.json` raiz com workspaces; `tsconfig` base; `cli/` e `tools/` com build e teste; `.gitattributes`; `.nvmrc`; `.gitignore`; `skills/README.md`.

### Pronto quando

* Num clone limpo, `npm ci && npm run build && npm test` fica verde em Node 22 e em Node 24
* `npm ls --omit=dev --workspace cli` não lista dependência nenhuma
* Nenhum arquivo versionado contém segredo (secret scanning sem alerta)

## A2 — Arquivos de comunidade

| Arquivo | Conteúdo |
| --- | --- |
| `LICENSE` | MIT. Titular: **pendência P2** |
| `README.md` | **Em português**, com um resumo curto em inglês no topo. Explica o que é, a fronteira (D-006), a instalação (a partir da fase 1), como contribuir, o selo do Scorecard e o aviso de que nenhuma skill substitui o responsável técnico |
| `CONTRIBUTING.md` | O fluxo da §6 do **Catálogo · Skills — Spec**: issue de proposta, template, PR, validador, revisão de mantenedor e de domínio |
| `CODE_OF_CONDUCT.md` | Contributor Covenant, na versão conferida na fonte na adoção |
| `SECURITY.md` | Canal único: GitHub Private Vulnerability Reporting. Prazo: confirmação em até 7 dias e avaliação em até 30 dias. Escopo: skills, CLI, pipeline e pacote |
| `AGENTS.md` | Contrato para agentes de código que trabalham no repositório: regras do catálogo, "nunca pode acontecer", comandos de verificação |
| `CHANGELOG.md` | Formato por release: adicionadas, alteradas, depreciadas, retiradas |
| `.github/PULL_REQUEST_TEMPLATE.md` | Checklist de segurança do **Segurança — Spec** §3 e checklist de dependência nova (versão, OSV, licença) |
| `.github/CODEOWNERS` | `.github/**` e `tools/**` com o owner; `skills/**/scripts/` com dois revisores (regra dormente até a fase 3) |

### Pronto quando

* `gh api repos/obraforge/obraforge/community/profile` mostra README, CODE_OF_CONDUCT, CONTRIBUTING, LICENSE, SECURITY e o template de PR presentes
* O Private Vulnerability Reporting está ativo e aceita um relato de teste do próprio dono

## A3 — Controles da org e do repositório

| Onde | Controle | Origem |
| --- | --- | --- |
| Org | **2FA obrigatório** (hoje desligado) | CICD-SEC-2 |
| Org | Membros não criam repositório; permissão padrão só leitura | CICD-SEC-2 |
| Org | Segundo owner: **pendência P3** | Segurança §10 |
| Repositório | **Ruleset em** `main`: PR obrigatório, status checks obrigatórios (os jobs do D1), sem force push, sem exclusão da branch. Aprovação: **pendência P1** | CICD-SEC-1 |
| Repositório | Secret scanning e push protection ligados | Segurança §8 |
| Repositório | Private Vulnerability Reporting ligado | Segurança §8 |
| Actions | `GITHUB_TOKEN` padrão só leitura; Actions não criam nem aprovam PR; aprovação obrigatória para workflow de PR de fork de contribuidor novo | CICD-SEC-4, CICD-SEC-5 |

**Depende de:** A1 e D1. O ruleset referencia os checks pelo nome, então é criado depois da primeira execução do CI.

### Pronto quando

* `gh api orgs/obraforge` retorna `two_factor_requirement_enabled: true` e `members_can_create_repositories: false`
* Um `git push` direto em `main` é recusado, e a recusa fica registrada em `docs/fase-0.md`
* `gh api repos/obraforge/obraforge/rulesets` lista o ruleset com os checks exigidos
* A configuração do repositório mostra secret scanning, push protection e PVR ativos

---

# 6. Bloco B — Validador e catálogo

## B1 — Validador de skill (`tools/`, `npm run validar`)

### Formato que o validador impõe (D-011)

```
skills/<area>/<nome>/
├── SKILL.md              # frontmatter: name, description, metadata
├── fixtures/
│   ├── entrada.*
│   └── esperado.md
└── references/
    └── normas.md         # uma entrada por norma citada
```

```yaml
---
name: validar-planilha-orcamentaria
description: Confere a estrutura de uma planilha orçamentária de obra...
metadata:
  obraforge-area: "orcamento"
  obraforge-fase: "1"
  obraforge-versao: "1.0.0"
---
```

`references/normas.md`, uma entrada por norma:

```markdown
## Lei 14.133/2021
- Título: Lei de Licitações e Contratos Administrativos
- Ano: 2021
- Fonte: https://www.planalto.gov.br/...
```

Para norma paga, a `Fonte` indica onde adquirir (ex.: "ABNT, norma paga — abntcatalogo.com.br"), sem transcrever texto.

### Regras

Cada regra tem um código estável, que aparece na saída junto com arquivo e linha.

| Código | Falha quando |
| --- | --- |
| `ESTRUTURA` | Falta `SKILL.md`, `fixtures/entrada.*`, `fixtures/esperado.md` ou `references/normas.md` |
| `NOME` | `name` fora da regra do padrão (1 a 64, `a-z0-9-`, sem hífen na borda nem duplicado), diferente do nome da pasta, ou presente em `skills/retiradas.txt` (lista append-only) |
| `DESCRICAO` | `description` vazia ou com mais de 1024 caracteres |
| `METADATA` | Falta `obraforge-area`, `obraforge-fase` ou `obraforge-versao`; área fora das 23 mais `contexto`; área diferente da pasta pai; fase fora de `1` a `4`; versão fora do semver |
| `SCRIPTS` | Pasta `scripts/` presente enquanto o projeto estiver antes da fase 3 (constante em `tools/`) |
| `NORMA` | Citação no `SKILL.md` que casa com o padrão de norma (`NR-nn`, `NBR nnnn`, `Lei n.nnn/aaaa`, `Resolução ... nº`, `Decreto n.nnn/aaaa`) sem entrada correspondente em `normas.md`, ou entrada sem Título, Ano ou Fonte |
| `AVISO` | Falta, no `SKILL.md`, o aviso-padrão de que a skill não substitui o responsável técnico (texto exato definido no template) |
| `AGENCIA` | Frontmatter com `allowed-tools`; corpo com referência a hook, `settings.json`, permissão do agente, ou comando de rede (`curl`, `wget`, `Invoke-WebRequest`, `fetch(`). Lista inicial versionada em `tools/`, e toda ampliação entra por PR |
| `LINK` | Arquivo simbólico ou executável dentro da pasta da skill (um symlink poderia apontar para fora dela) |
| `DADO-PESSOAL` | CPF ou CNPJ com dígito verificador válido; e-mail fora de `example.com`, `example.org` ou `example.net`; telefone fora do formato fictício `(00) 00000-0000` |

### Entregáveis

* O validador, com saída legível e código de saída diferente de zero em qualquer falha
* `tools/test/casos/valida/` com uma skill-exemplo que passa em todas as regras
* `tools/test/casos/invalida-<codigo>/`, **um caso por regra**, e cada um **falha por um motivo só**: o teste confere que a única regra acusada é a esperada
* Template de skill em `docs/template-skill/`

### Pronto quando

* A skill-exemplo válida passa
* Cada caso inválido falha **exatamente** com o próprio código, e o teste falha se aparecer um código a mais ou a menos
* Rodado sobre `skills/` vazia, passa

## B2 — Gerador do `catalog.json` (`tools/`, `npm run catalogo`)

### Desenho

| Elemento | Regra |
| --- | --- |
| **Commitado** | Sim, para o diff do PR mostrar o que muda no catálogo. O CI regenera e compara |
| **Sem data de geração** | O arquivo não leva timestamp, que quebraria a comparação byte a byte. A data da release fica na tag e no changelog |
| **Topo** | `version` (igual à de `cli/package.json`) e `areas` (a lista fechada) |
| **Por skill** | `name`, `area`, `phase`, `version`, `description`, `references` (números das normas), `path`, `sha256` |
| **Hash** | Lista dos arquivos da pasta em caminho relativo POSIX, ordenada. Para cada arquivo, a linha `caminho + "\0" + sha256(bytes) + "\n"`. O `sha256` final é o da concatenação |
| **Ordem** | Skills por área e depois por nome. JSON com indentação de 2 espaços e quebra de linha no fim |

O **estado** da skill (publicada, depreciada, retirada) entra no catálogo na fase 1. Ver §11, "O que este plano não resolve".

### Pronto quando

* Gerar duas vezes seguidas produz arquivos **idênticos byte a byte**
* Alterar um byte em qualquer arquivo de uma skill muda o `sha256` **só daquela skill**
* O mesmo conteúdo com fim de linha CRLF no disco (checkout em Windows) produz o mesmo hash, garantido pelo `.gitattributes`
* O modo `--verificar` falha com o diff quando o `catalog.json` commitado está desatualizado

---

# 7. Bloco C — CLI e publicação

## C1 — CLI mínima (`cli/`)

| Elemento | Regra |
| --- | --- |
| **Comandos** | `obraforge --version` (lê a versão do próprio `package.json`), `--help`, `list` (lê o `catalog.json` embutido; sem skills, imprime "Nenhuma skill publicada nesta versão." e sai com 0) |
| **Argumentos** | `util.parseArgs` do Node, sem dependência |
| **Códigos de saída** | 0 sucesso; 1 erro de uso; 2 recusa de segurança (hash, skill retirada); 3 erro de ambiente (Node abaixo do mínimo, sem permissão de escrita) |
| **Conteúdo do pacote** | Campo `files` com lista branca: `dist/`, `catalog.json`, `skills/`, `README.md`, `LICENSE`. Nada mais entra no tarball |
| **Rede e telemetria** | Nenhuma chamada |

### Pronto quando

* `npx obraforge --version` de um `npm pack` local instalado numa pasta vazia imprime a versão do `package.json`
* Um teste confere que `npm pack --dry-run --json` lista exatamente os arquivos da lista branca
* Rodar com Node abaixo de 22 sai com código 3 e mensagem com a versão mínima

## C2 — Publicação inicial e publicador confiável (D-010)

**Quem executa: só o dono.** O agente de código guia os passos, mas nunca vê, pede ou manuseia credencial do npm.

1. Atualizar o npm local para 11.15.0 ou superior (hoje está em 11.12.1).
2. Conferir 2FA ativo na conta npm.
3. Numa **pasta temporária fora do repositório**, criar um `package.json` com `name: obraforge`, `version: 0.0.0` e descrição "Reserva de nome. A primeira versão funcional é publicada pelo workflow do repositório obraforge/obraforge.", mais `README.md` e `LICENSE`. Sem `bin` e sem código.
4. `npm publish --access public`.
5. `npm deprecate obraforge@0.0.0 "Reserva de nome; use a versão mais recente."`
6. `npm trust github obraforge --file release.yml --repo obraforge/obraforge --allow-publish`.
7. Na página do pacote, restringir a publicação para exigir 2FA e não aceitar token [conferir o nome exato da opção na página de configuração do npm no momento].
8. Criar a organização `obraforge` no npm para proteger o escopo `@obraforge` contra confusão de nome [conferir na doc do npm que organização com pacotes só públicos é gratuita].

### Pronto quando

* `npm view obraforge versions` retorna só `0.0.0`, marcada como depreciada
* A página do pacote mostra o publicador confiável `obraforge/obraforge` com o workflow `release.yml`
* `gh secret list --repo obraforge/obraforge` retorna vazio

## C3 — Workflow de release (`.github/workflows/release.yml`)

| Passo | Regra |
| --- | --- |
| Gatilho | Push de tag `v*` |
| Permissões | `contents: read` no nível do workflow; o job de publicação recebe `contents: write` e `id-token: write`, e nada mais |
| Guarda 1 | O commit da tag está em `main` (`git merge-base --is-ancestor`), senão falha **antes** de qualquer publicação |
| Guarda 2 | A versão da tag é igual à de `cli/package.json`, senão falha |
| Guarda 3 | `npm --version` é 11.5.1 ou superior, senão falha com mensagem |
| Build | `npm ci` → `validar` → `catalogo --verificar` → `test` → `build` |
| Publicação | `npm publish --provenance --access public` no workspace `cli`, por OIDC, **sem** `NPM_TOKEN` |
| SBOM | `npm sbom --sbom-format=cyclonedx --omit=dev` do workspace `cli`, anexado à release |
| Release | `gh release create` com a seção da versão do `CHANGELOG.md` e o SBOM |
| Actions | Todas as de terceiros fixadas por SHA completo, com a tag num comentário |

**Depende de:** A3 (ruleset ativo antes do primeiro workflow com permissão de escrita), B2, C1, C2 e D1.

### Pronto quando

* A tag `v0.0.1` publica `obraforge@0.0.1` com selo de provenance na página do npm
* `npx obraforge@0.0.1 --version` numa pasta vazia imprime `0.0.1`
* A release `v0.0.1` no GitHub tem changelog e SBOM anexado
* Uma tag cuja versão difere do `package.json` falha na guarda 2, e `npm view obraforge versions` continua sem a versão nova

---

# 8. Bloco D — Evidência contínua

## D1 — Workflow de CI (`.github/workflows/ci.yml`)

| Elemento | Regra |
| --- | --- |
| Gatilhos | `pull_request` e push em `main`. **Nunca** `pull_request_target` |
| Permissões | `contents: read` |
| Jobs (nomes estáveis, exigidos pelo ruleset) | `validar` (validador sobre `skills/`), `catalogo` (`--verificar`), `testes` (matriz Node 22 e 24), `build` (inclui a conferência do `npm pack`), `osv` (OSV-Scanner sobre o lockfile) |
| Segredos | Nenhum |

### Pronto quando

* Os três PRs de demonstração do §10 ficam com a cor esperada
* O ruleset (A3) exige os cinco jobs

## D2 — Segurança contínua

| Arquivo | O que faz | Permissões |
| --- | --- | --- |
| `codeql.yml` | Análise de JavaScript/TypeScript em PR, em push em `main` e semanal | `security-events: write`, `contents: read` |
| `scorecard.yml` | OpenSSF Scorecard semanal e em push em `main`, com resultado publicado e selo no README | As exigidas pela documentação do Scorecard, conferidas na adoção |
| `dependabot.yml` | Atualizações semanais de `npm` e `github-actions` (o que também mantém os SHAs das actions) | — |

### Pronto quando

* Todo `uses:` em `.github/workflows/` aponta para um SHA de 40 caracteres hexadecimais (conferido por um teste no `tools/`)
* O Scorecard publicado mostra **10 nos checks que só dependem do repositório**: `Dangerous-Workflow`, `Token-Permissions`, `Pinned-Dependencies`, `Security-Policy` e `License`. A nota geral e os checks que dependem de histórico ou de mais mantenedores (`Code-Review`, `Maintained`, `Contributors`) ficam só registrados como linha de base em `docs/fase-0.md`
* A primeira análise do CodeQL termina sem alerta alto

---

# 9. Critério de pronto — as três camadas

| Camada | O que significa | Como se verifica |
| --- | --- | --- |
| **1. Código** | Implementado, com testes verdes | `npm test` local e no CI, em Node 22 e 24 |
| **2. Cerca demonstrada** | Toda recusa foi vista recusando | Caso vermelho registrado: teste, PR de demonstração ou execução de workflow com falha na guarda |
| **3. Artefato real** | O que o usuário ou o GitHub enxergam | Pacote no npm, página de provenance, release, configuração consultada pela API |

As evidências das camadas 2 e 3 ficam em `docs/fase-0.md` no repositório, com links para os PRs, as execuções e as páginas. Evidência que não está lá não conta (regra 6 do Roadmap).

---

# 10. O teste que define a fase 0

> **Num repositório** `obraforge/obraforge` **público, com 2FA obrigatório na org e ruleset ativo em** `main`**:**
>
> 1. Um clone limpo roda `npm ci && npm run build && npm test` verde em Node 22 e 24
> 2. **PR de demonstração A** adiciona `skills/contexto/exemplo-fase-0/`, válida e com o `catalog.json` regenerado → **CI verde**
> 3. **PR de demonstração B** é igual ao A, sem `fixtures/` → **CI vermelho, só no job** `validar`**, com o código** `ESTRUTURA`
> 4. **PR de demonstração C** é igual ao A, sem regenerar o `catalog.json` → **CI vermelho, só no job** `catalogo`**, com o diff**
> 5. Os três PRs são **fechados sem merge**, e os links ficam em `docs/fase-0.md`
> 6. Um push direto em `main` é recusado
> 7. A tag `v0.0.1` publica pelo workflow; `npx obraforge@0.0.1 --version` numa pasta vazia imprime `0.0.1`; a página do npm mostra a provenance; a release tem SBOM
> 8. Uma tag de versão divergente é recusada antes de publicar
> 9. `gh secret list` do repositório está vazio, e o Scorecard publicado mostra 10 nos cinco checks do D2
>
> **Sem nenhuma skill real no catálogo.**

Se isso roda, a fase 0 está entregue e a fase 1 pode começar.

---

# 11. Pontos "[a confirmar]" resolvidos neste plano

Recomendações aprovadas pelo dono junto com a estrutura deste plano em 12/09/2026. As duas estruturais viraram decisão registrada.

| Ponto | Onde estava | Resolução | Motivo |
| --- | --- | --- | --- |
| Suporte a OIDC no npm | Publicação §8, Segurança §4 | Suportado, com publicação inicial manual única | **D-010**; doc do npm |
| Campos próprios da skill | Catálogo §3 | `metadata` com `obraforge-*` e `references/normas.md` | **D-011**; agentskills.io |
| Destino do Claude Code | CLI §3 | `.claude/skills/<nome>/`, que não lê `.agents/skills/` | Doc oficial do Claude Code |
| Node mínimo | CLI §10 | `engines >=22`; CI em 22 e 24 | endoflife.date |
| `catalog.json` commitado ou só no build | Publicação §3 | Commitado, sem data de geração | Diff visível e comparação determinística |
| `tools/` pasta ou workspace | Publicação §4 | Workspace privado `@obraforge/tools` | Build e teste próprios, nunca publicado |
| Idioma do README | Publicação §4 | Português, com resumo em inglês | O público é o engenheiro brasileiro; os programas só precisam entender o projeto |
| Escopo `@obraforge` | Segurança §6 | Organização `obraforge` no npm, criada no C2 | OSS-RISK-3 |
| Prazo do `SECURITY.md` | Segurança §8 | Confirmação em até 7 dias, avaliação em até 30 | Viável com um mantenedor |
| Códigos de saída da CLI | CLI §8 | 0, 1, 2 e 3 (ver C1) | Distingue recusa de segurança de erro de ambiente |
| Lista de padrões de agência | Segurança §3, Catálogo §9 | Lista inicial da regra `AGENCIA`, versionada em `tools/` | Começa pequena e só cresce por PR |
| Heurística de citação normativa | Catálogo §9 | Padrão de norma no `SKILL.md` precisa ter entrada no `normas.md` | Checável sem interpretar texto livre |
| `dashboard/` no esqueleto | Roadmap, fase 0, item 1 | Nasce na fase 1 | Workspace vazio seria código especulativo |
| Versão da primeira release funcional | — | `0.0.1`; a `0.1.0` fica para a primeira skill | Coerente com o exemplo do **Catálogo · Skills — Spec** |

## O que este plano não resolve

* **Onde vive o estado depreciada ou retirada de uma skill.** A D-011 não o cobre, e a CLI só precisa dele na fase 1. Decisão antes do primeiro `add`.
* **Nome do registro local da CLI** (`obraforge.lock.json`): fase 1.
* **Formato do manifesto** `.claude-plugin/`: fase 1, na doc oficial.
* **Mecanismo automatizado de teste de fixture contra agentes**: fase 1. Até lá, a verificação é manual e registrada.

---

# 12. Pendências do dono

| # | Pendência | Bloqueia | Recomendação |
| --- | --- | --- | --- |
| **P1** | **Aprovação de PR com um mantenedor só.** O GitHub não deixa o autor aprovar o próprio PR. Exigir uma aprovação em `main` trava todo merge do dono, e a D-007 pede "review obrigatório em `main`" | A3 | Ruleset com PR obrigatório, checks obrigatórios e uma aprovação, e o dono como exceção **só pelo caminho do PR** (nunca push direto) [conferir na doc de rulesets do GitHub o modo de bypass restrito a PR]. PR de terceiro continua exigindo a aprovação do dono. Revisar quando entrar o segundo mantenedor. **Ajusta um controle da D-007: exige decisão registrada** |
| **P2** | Titular do copyright no `LICENSE` (pessoa física, empresa ou "contribuidores do obraforge") | A2 | Decisão do dono; parecer da skill `advogado` se houver dúvida |
| **P3** | Segundo owner da org | Não bloqueia o marco; bloqueia o fechamento da fase 2 | Indicar antes da validação fechada |
| **P4** | Criar o repositório público `obraforge/obraforge` | A1 | O dono cria no início da primeira sessão de código |

---

# 13. Ajustes nas specs que este plano provoca

A regra 5 do Roadmap vale: nenhuma spec é editada em silêncio. Cada ajuste entra como seção datada "v1.1 — ajustes de 12/09/2026" no fim do documento, sem apagar o texto da v1.

| Spec | Ajuste | Origem | Estado |
| --- | --- | --- | --- |
| **Publicação e Plugin** | Exceção da `0.0.0` manual; `catalog.json` sem data de geração; `tools/` como workspace privado; README em português; guarda de versão do npm no workflow; primeira release funcional `0.0.1` | D-010, §11 | A fazer |
| **Segurança** | CICD-SEC-6 e OSS-RISK-2 com a exceção da D-010; regra `LINK` (symlink e executável); controle de aprovação com um mantenedor (depende de P1) | D-010, B1, P1 | A fazer |
| **Catálogo · Skills** | Frontmatter da D-011; formato do `normas.md`; regra do padrão sobre hífen duplicado; `skills/retiradas.txt`; regras `AVISO`, `LINK` e `DADO-PESSOAL` detalhadas | D-011, B1 | A fazer |
| **CLI** | Destino do Claude Code conferido; `engines >=22`; tabela de códigos de saída | §3, C1 | A fazer |
| **Roadmap** | `dashboard/` na fase 1; primeira release `0.0.1`; este documento marcado como escrito | §11 | A fazer |

---

# 14. Ordem de execução e calibração

```
A1 Repositório + esqueleto  (P4)
 ├─→ A2 Comunidade  (P2)
 ├─→ B1 Validador ─→ B2 Catálogo ─┐
 └─→ C1 CLI mínima ───────────────┤
                                  ↓
                        D1 CI ─→ A3 Controles (P1) ─→ D2 Segurança contínua
                                  │
                   C2 Publicação inicial (dono) ─→ C3 Release
                                                      ↓
                                          §10 Teste da fase 0
                                                      ↓
                                     Gate da fase + graduação da ideia
```

## Blocos de sessão

| Sessão | Itens | Estado estável ao fim |
| --- | --- | --- |
| **1** (\~2–3 h) | A1, A2, B1, B2 | Repositório com esqueleto, arquivos de comunidade, validador e gerador com todos os casos vermelhos e verdes; commitado |
| **2** (\~2–3 h) | C1, D1, A3, D2, C2, C3, §10 | Marco da fase 0 demonstrado e registrado em `docs/fase-0.md` |

## Calibração por item

| Item | Modelo | Esforço | Por quê | Tempo |
| --- | --- | --- | --- | --- |
| A1 Esqueleto | Sonnet | medium | Configuração mecânica, mas precisa conferir cada dependência na fonte | 20–40 min |
| A2 Comunidade | Sonnet | medium | Texto a partir das specs | 30–45 min |
| B1 Validador | Opus | high | É a cerca de segurança do conteúdo: `AGENCIA`, `LINK`, `DADO-PESSOAL`, e cada caso inválido isolado numa regra só | 60–120 min |
| B2 Catálogo | Sonnet | high | Hash determinístico entre sistemas operacionais | 30–60 min |
| C1 CLI mínima | Sonnet | high | Pouco código, mas com a lista branca do tarball testada | 30–45 min |
| D1 CI | Sonnet | high | Permissões e nomes de jobs que o ruleset vai exigir | 30–45 min |
| A3 Controles | Opus | high | Configuração de segurança da org, com P1 | 20–40 min |
| D2 Segurança contínua | Sonnet | medium | Configuração conhecida, com SHAs conferidos | 30–60 min |
| C2 Publicação inicial | — (dono) | — | Credencial; o agente só guia | 15–30 min |
| C3 Release | Opus | high | OIDC, guardas antes da publicação, provenance e SBOM: cadeia de suprimento | 45–90 min |
| §10 Teste e gate | Opus | high | Gate de fase com a skill `qualidade` e agentes `adversario` nas lentes de correção e segurança sobre validador e pipeline | 45–90 min |

Toda fatia passa antes pela skill `seguranca` (classificação de superfície), e toda dependência nova segue a regra 6 do CLAUDE.md global.

## Handoff

* Este plano é copiado para `docs/planos/fase-0-fundacao.md` no repositório na primeira sessão, para sessões na nuvem e outras máquinas.
* Quando o repositório nascer (A1), a ideia `obraforge` é graduada na oficina com destino `https://github.com/obraforge/obraforge`, e as decisões seguintes passam a `docs/adr/` no repositório.

---

# 15. v1.1 — Pendências resolvidas (13/09/2026)

Seção acrescentada em 13/09/2026. O texto da v1 acima fica como estava; onde houver divergência, **vale esta seção**.

## As quatro pendências

| # | Resolução | Registro | Efeito no plano |
| --- | --- | --- | --- |
| **P1** | Ruleset em `main` com PR obrigatório, checks obrigatórios, **uma aprovação**, sem force push e sem exclusão da branch. O dono é o único ator na exceção, no modo **"For pull requests only"**: não faz push direto e faz merge do próprio PR com os checks verdes. PR de terceiro exige a aprovação do dono. Removida quando entrar o segundo mantenedor | **D-012** | A3 aplica exatamente isso. O "[conferir]" da §12 está resolvido: rulesets existem em repositório público de org no plano Free, e o modo "For pull requests only" bloqueia push direto (documentação do GitHub, 13/09/2026). O passo 6 do §10 continua valendo. Custo aceito: o Scorecard `Branch-Protection` fica no máximo em 8, e esse check não está entre os cinco do D2 |
| **P2** | Titular do copyright do `LICENSE` MIT: **Lucas Miranda Pantoja, pessoa física** | **D-013** | A2 usa esse titular. Se o obraforge virar negócio numa empresa, a titularidade passa por contrato de cessão |
| **P3** | Segundo owner **adiado para antes do fechamento da fase 2**. Mitigação desde já: conta do dono com **dois métodos de 2FA** (passkey e app autenticador) e **códigos de recuperação guardados fora do computador**. Uma segunda conta do próprio dono não serve: os Termos do GitHub permitem uma conta gratuita por pessoa, e conta de máquina só roda automação | Este plano | A3 inclui a conferência de que o dono tem os dois métodos de 2FA antes de ligar o 2FA obrigatório na org, registrada em `docs/fase-0.md` sem expor nenhum código. A fase 2 ganha o item "segundo owner de confiança na org" |
| **P4** | Repositório `obraforge/obraforge` **criado público e vazio em 13/09/2026**, pelo agente de código, com autorização explícita do dono. A ideia foi **graduada** na oficina no mesmo dia | **D-014** | A1 começa num repositório existente e vazio, e a nota "Criado pelo dono" do A1 fica substituída por esta. As decisões novas são ADRs em `docs/adr/`; o A1 inclui `docs/adr/README.md` apontando para `ideias/obraforge/decisoes.md` (repositório `brainstorming`) como histórico anterior à graduação, de D-001 a D-014. A última linha do diagrama do §14 ("graduação da ideia") já está cumprida |

## Estado do §2 em 13/09/2026

| Camada | Estado |
| --- | --- |
| Repositório `obraforge/obraforge` | ✅ Público e vazio, sem branch padrão |
| Decisões | Vigentes D-003 a D-014 na oficina; congeladas após a graduação |
| Pendências do dono | Nenhuma bloqueando o início da sessão 1 |

## Ajustes do §13 atualizados

A linha **Segurança** passa a incluir o controle de aprovação da D-012 (a dependência de P1 acabou) e o segundo owner adiado para a fase 2 com a mitigação acima. A linha **Roadmap** passa a incluir o repositório criado. Os cinco ajustes seguem **a fazer**, antes da sessão 1.

---

# 16. v1.1 — Ajustes nas specs aplicados (13/09/2026)

Seção acrescentada em 13/09/2026. O texto anterior permanece como estava.

## Ajustes da §13, aplicados e conferidos

Cada spec ganhou uma seção v1.1 datada no fim, sem apagar o texto da v1. Em cada uma foi conferido, direto no ChatPRD, que os títulos da v1 continuam na ordem, que a seção nova está completa e que a página exibida mostra o documento inteiro.

| Spec | Seção acrescentada | Estado |
| --- | --- | --- |
| **Base Técnica · Visão e Decisões** | §13: decisões D-010 a D-014, graduação, onde ficam as coisas, correções à v1 e pontos em aberto. Não constava da §13 deste plano; foi incluída em 13/09/2026 porque consolidava só D-001 a D-009 | ✅ 13/09/2026 |
| **Plataforma · Publicação e Plugin — Spec** | §13 | ✅ 13/09/2026 |
| **Base Técnica · Segurança — Spec** | §13, mais uma correção de exibição: na §7, o nome da tag de script, escrito como marcador HTML, cortava a página exibida a partir dali e escondia as seções 8 a 13; passou a ser escrito por extenso, com nota datada no fim do documento | ✅ 13/09/2026 |
| **Catálogo · Skills — Spec** | §13 | ✅ 13/09/2026 |
| **Plataforma · CLI — Spec** | §13 | ✅ 13/09/2026 |
| **Base Técnica · Roadmap** | §8 | ✅ 13/09/2026 |
| **Plataforma · Dashboard — Spec** | Nenhuma: nenhuma decisão nova a afeta | — |

## O que abre a sessão 1, no repositório `obraforge/obraforge`

1. **Formato de módulos (ESM ou CommonJS) e empacotamento da CLI.** A D-004 diz "compilada para um arquivo" e o item A1 diz "build com `tsc`, sem bundler". A decisão vira ADR antes do primeiro arquivo de código.
2. **ADR-0001:** execução do obraforge em GitHub Issues e Projects; o Linear não é usado (escolha do dono em 13/09/2026).
3. **Decisões pequenas de scaffolding**, cada dependência com versão, OSV e licença conferidas: lint e formatação, parser de YAML, configuração do TypeScript, layout de `src/` e `dist/`, e o texto exato do aviso-padrão no template de skill.
4. **Cópia deste plano** para `docs/planos/fase-0-fundacao.md`.
5. **GitHub Project "Fase 0 · Fundação"** com uma issue por item (A1 a D2), criado depois de ligar secret scanning e PVR e de commitar o README.

## Fora do alcance do agente

* **Descrição do projeto no ChatPRD:** ainda aponta o repositório `brainstorming` como fonte viva das decisões. A ferramenta de integração não edita descrição de projeto; o dono atualiza pela interface, apontando para `docs/adr/` no repositório `obraforge/obraforge` e para o histórico D-001 a D-014 no `brainstorming`.
