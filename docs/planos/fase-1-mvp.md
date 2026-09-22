# Plataforma · MVP — Plano de Implementação

**Plano de implementação da fase 1.** Não é spec de módulo. É o documento que se leva ao agente de
código para construir a fase 1 do *Base Técnica · Roadmap*, no mesmo formato do
[plano da fase 0](fase-0-fundacao.md): itens, dependências, critério de pronto por item e o teste
que define a fase. **v1 — 21/09/2026.** Escrito direto no repositório, que é a fonte da verdade
desde a D-014. Depois de aceito não é editado: mudança de curso entra como seção datada no fim
deste arquivo ou como ADR em [`docs/adr/`](../adr/).

**Fontes:** as specs *Catálogo · Skills*, *Plataforma · CLI*, *Plataforma · Dashboard*,
*Plataforma · Publicação e Plugin*, *Base Técnica · Segurança* e *Base Técnica · Visão e Decisões*
(ChatPRD, v1 de 12/09/2026 e v1.1 de 13/09/2026, lidas em 21/09/2026), o
[`docs/fase-0.md`](../fase-0.md) e os ADRs 0001 a 0006.

---

# 1. Por que este plano existe

A fase 0 terminou com o repositório recusando skill inválida e publicando com provenance, mas sem
nenhuma skill. Este plano descreve **o caminho até o marco da fase 1**:

> **Cada uma das três skills é exercitada com a própria fixture em Claude Code, Codex e Gemini CLI,
> com o resultado registrado no repositório**, e `npx obraforge add` de uma skill funciona numa
> pasta limpa.

## Os princípios

> **O CI precisa recusar antes de aceitar.** Continua valendo da fase 0: toda cerca nova (estado da
> skill, fixture textual, conferência de hash no `add`, frescor do manifesto do plugin, cabeçalhos
> do site) nasce com o caso vermelho demonstrado antes do verde.

> **Instalação só de release, pelos dois caminhos.** A CLI instala do pacote npm publicado, com o
> hash conferido. O plugin do Claude Code aponta para a tag da release, nunca para a `main`.

> **Skill sem exercício registrado não conta.** O marco é o resultado nos três agentes, escrito no
> repositório. Compilar, validar e publicar não substituem o exercício.

---

# 2. O que já existe (21/09/2026)

| Camada | Estado | Como foi conferido |
| --- | --- | --- |
| Fase 0 | Fechada em 21/09/2026: validador, gerador do `catalog.json`, CLI `0.0.1` com `--version`, `--help` e `list`, CI com seis checks, release por OIDC | [`docs/fase-0.md`](../fase-0.md) |
| Catálogo | Nenhuma skill. `skills/retiradas.txt` já é lido pelo validador (regra `NOME`) | `catalog.json`, `tools/src/validate.ts` |
| `catalog.json` | Por skill: `name`, `area`, `phase`, `version`, `description`, `references`, `path`, `sha256`. **Sem estado da skill** | `tools/src/catalog.ts` |
| CLI | Lê só `name`, `area` e `description`. Código de saída 2 reservado, sem uso | `cli/src/catalog.ts`, `cli/src/exit-codes.ts` |
| Ambiente do dono | Claude Code 2.1.258. **Codex CLI 0.147.0**, abaixo da estável 0.155.1 e sem funcionar com o modelo configurado. **Gemini CLI não instalado** (estável: 0.60.0). Vercel CLI 54.11.1 instalado | `--version` de cada um e `npm view` |

---

# 3. Conferências na fonte (21/09/2026)

| Ponto | O que a fonte diz | Efeito neste plano |
| --- | --- | --- |
| Skills no Claude Code | Projeto em `.claude/skills/<nome>/SKILL.md`, pessoal em `~/.claude/skills/`. Não lê `.agents/skills/`. Invocação automática pela `description` ou com `/nome`. Mudança em skill é vista na sessão aberta, exceto quando a pasta de skills de nível superior não existia no início da sessão. Fonte: code.claude.com/docs/en/skills | C1: destino e texto final do `add` |
| Skills no Codex | Projeto em `.agents/skills/` (procura também nas pastas acima, até a raiz do repositório), global em `$HOME/.agents/skills`. Invocação com `$nome` ou automática. "Codex detects skill changes automatically. If an update doesn't appear, restart Codex." Fonte: documentação oficial do Codex (developers.openai.com/codex/skills) | C1 |
| Skills no Gemini CLI | Projeto em `.gemini/skills/` ou no alias `.agents/skills/`, que tem precedência no mesmo nível. Ativação automática pela ferramenta `activate_skill`. `/skills reload` recarrega. Se a versão estável ainda exige habilitar skills por configuração: **não confirmado**. Fonte: geminicli.com/docs/cli/skills (30/04/2026) | C1; V1 confere na prática |
| Plugin do Claude Code | `.claude-plugin/plugin.json` só exige `name`. `.claude-plugin/marketplace.json` exige `name`, `owner.name` e `plugins[]` com `name` e `source`. Fontes `github`, `git-subdir` e `url` aceitam `ref` (branch ou tag) e `sha` (40 caracteres). Com `"strict": false`, a entrada do marketplace é a definição inteira do plugin, sem `plugin.json`, e pode declarar `skills`. O plugin é copiado para um cache na instalação. Validador oficial: `claude plugin validate --strict`. Fontes: code.claude.com/docs/en/plugins, /plugin-marketplaces, /plugins-reference | P1 |
| Agent Skills | `SKILL.md` recomendado com menos de 500 linhas; `assets/` para modelos e dados, sem regra de tamanho. Fonte: agentskills.io/specification | S1 a S3 |
| Astro | Estável 7.3.3, licença MIT, `engines.node >=22.12.0`. Site estático é o padrão e não precisa de adapter na Vercel. OSV sem vulnerabilidade para 7.3.3. Fontes: registro npm, api.osv.dev, docs.astro.build | W1 |
| Vercel, plano Hobby | "Hobby teams are restricted to non-commercial personal use only… Commercial usage is defined as any Deployment that is used for the purpose of financial gain of anyone involved in any part of the production of the project, including a paid employee or consultant writing the code." "Asking for Donations does not fall under commercial usage." Fonte: vercel.com/docs/limits/fair-use-guidelines (14/09/2026) | Decisão D3 |
| Vercel, deploy | Pela integração com o Git, o app da Vercel no GitHub pede permissões amplas no repositório (Administration, Checks, Contents, Deployments, Pull Requests, Issues, Webhooks, Commit Statuses, a maioria com escrita); dá preview por PR. A alternativa é GitHub Actions com a CLI da Vercel e `VERCEL_TOKEN`. O Hobby só bloqueia repositório **privado** de organização. Cabeçalhos pelo `headers` do `vercel.json`. Fontes: vercel.com/docs/git/vercel-for-github (17/09/2026), vercel.com/docs/project-configuration/vercel-json | Decisão D3; W2 |
| Node | 22: segurança até 30/04/2027. 24: suporte ativo até 20/10/2026, segurança até 30/04/2028. Fonte: endoflife.date/nodejs | Sem mudança no `engines` |

---

# 4. Decisões de abertura (do dono)

As duas primeiras estão pendentes desde a fase 0 e bloqueiam o primeiro `add`. A terceira nasce
deste plano. Cada uma vira ADR no item A1.

**Decididas pelo dono em 21/09/2026: as recomendações das três foram adotadas**, inclusive, na D3,
o Hobby e a integração com o Git.

## D1 — Onde vive o estado depreciada ou retirada (ADR-0007)

A spec *Catálogo · Skills* define os estados e as transições, mas não onde ficam gravados. A CLI
precisa deles (retirada: recusa; depreciada: avisa o motivo e pede confirmação), e o site também.

**Recomendação:**

- **Publicada** é o padrão: pasta em `skills/<area>/<nome>/`, sem campo de estado.
- **Depreciada** fica no próprio `SKILL.md`: `metadata.obraforge-estado: "depreciada"` e
  `metadata.obraforge-motivo: "<motivo>"`, obrigatório junto com o estado. Depreciar é mudança na
  skill: sobe a versão (patch) e entra no changelog. Voltar a publicada é tirar os dois campos e subir
  a versão de novo.
- **Retirada** é a pasta removida e o nome acrescentado ao `skills/retiradas.txt`, que já é
  *append-only*. O motivo vai no changelog.
- O `catalog.json` passa a trazer, por skill, `state` (`"publicada"` ou `"depreciada"`) e
  `deprecationReason` quando depreciada, e no topo `retired` com os nomes do `retiradas.txt`.
- Amplia a lista branca do `metadata` do ADR-0006 com as duas chaves.

**Por quê:** o estado viaja com a cópia instalada (o `doctor` da fase 2 lê a skill local), mudar o
estado é mudança visível com versão nova (a regra "nunca editada em silêncio"), e a retirada reusa
uma cerca que já existe. **Alternativas:** arquivo central `skills/estados.json` (duas fontes para
manter em sincronia, e a cópia instalada não sabe que foi depreciada) ou estado só no `catalog.json`
(ele é gerado e nunca editado à mão).

## D2 — Conteúdo de fixture binária (ADR-0008)

O validador não varre conteúdo de binário (ADR-0006, limitação aceita), e a regra `DADO-PESSOAL` só
funciona em texto. A primeira skill da fase é de planilha.

**Recomendação:** **fixture só em texto.** Dentro de `fixtures/` o validador aceita apenas arquivo
UTF-8 (CSV, Markdown, texto, JSON). Arquivo da lista branca de binários dentro de `fixtures/` falha
com `ESTRUTURA`. A planilha da primeira skill é um CSV; o edital e a lista de documentos são
Markdown. Binário continua aceito em `assets/`, com a limitação do ADR-0006.

**Por quê:** o risco com evidência exigida é dado real em fixture (LLM02), e só texto é varrido;
nenhuma das três skills precisa de binário, porque o que a skill ensina a conferir não depende do
formato do arquivo. **Alternativas:** extrair o texto do `.xlsx` no validador (é um ZIP de XML:
código novo dentro da cerca, e o PDF continuaria aberto), ou aceitar binário só com revisão humana
(a cerca existe porque a revisão às vezes falha). **Revisitar** com ADR novo quando uma skill
precisar de fixture que não cabe em texto (ex.: BIM).

## D3 — Vercel: plano e forma de deploy (ADR-0009)

**Plano.** O Hobby é "non-commercial personal use only". O obraforge é MIT, sem receita, e a
doação não conta como uso comercial. **Recomendação:** Hobby nas fases 1 e 2; antes de qualquer
receita ou patrocínio (fase 4), ou se o site passar a servir de vitrine para produto pago (Turnaq),
migrar para o Open Source Program da Vercel (candidatura já prevista na fase 3) ou para o Pro. É
leitura de termo de uso: se houver dúvida, parecer da skill `advogado` antes do W2.

**Deploy.** Duas formas:

| | Integração com o Git (app da Vercel) | GitHub Actions + CLI da Vercel |
| --- | --- | --- |
| Segredo no repositório | Nenhum | `VERCEL_TOKEN` num environment restrito à `main` |
| Preview por PR | Sim, automático (a spec *Publicação* §8 pede) | Só para PR do próprio repositório; PR de fork não recebe o segredo |
| Terceiro com escrita no repositório | Sim: permissões amplas do app | Não |
| Código novo | Nenhum | Um workflow e a CLI da Vercel fixada |

**Recomendação:** integração com o Git, com o app instalado **só** em `obraforge/obraforge`, sem
entrar como exceção de nenhum ruleset (o push na `main` e a criação de tag continuam só pelo
caminho de hoje). A lista de permissões pedida é registrada na tela de instalação. **Condição:** se
a instalação pedir escrita em `Administration`, que permite mexer em configuração do repositório,
a recomendação passa a ser o GitHub Actions.

---

# 5. Pontos "[a confirmar]" resolvidos neste plano

Recomendações aprovadas junto com o plano. As que mudam spec entram na §13.

| Ponto | Onde estava | Resolução | Motivo |
| --- | --- | --- | --- |
| Nome do registro local | CLI §3 | `obraforge.lock.json` na raiz do projeto: por skill, versão, hash e destino; nada do usuário, ordem determinística | O nome da spec serve |
| Flag de sobrescrita | CLI §5 | `--force`; no terminal ainda pede confirmação, sem terminal exige `--force` | Padrão conhecido |
| Valores de `--for` | CLI §3 | `claude`, `codex`, `gemini`, `agents` | Os quatro destinos conferidos |
| Versão diferente já instalada | CLI §5 | Sem `update` na fase 1, o `add` recusa e orienta `--force` | O `update` é da fase 2 |
| `--json` | CLI §8 | Fora da fase 1 | Ninguém pediu ainda |
| Mecanismo de teste da skill contra agentes | Catálogo §10 | Manual e registrado (protocolo no V1). Automatizar fica para quando houver skill suficiente para pagar o custo | A spec já prevê manual na fase 1 |
| Formato do registro do exercício | Catálogo §11, critério 12 | `docs/exercicios/fase-1/<skill>.md`, fora da pasta da skill (não entra no hash nem no pacote) | Ver V1 |
| Formato do marketplace | Publicação §9 | Um plugin por skill: fonte `git-subdir` apontando para `skills/<area>/<nome>` com `ref` na tag da release (`v` + versão do catálogo), `"strict": false`; gerado do `catalog.json` | Instalação só de release; cópia igual à da CLI |
| Frescor do manifesto do plugin | Publicação §8 | Dentro do job `catalogo`, que já é check obrigatório | Nenhum nome novo no ruleset |
| Badge "na próxima versão" | Dashboard §3 | Sem badge: o PR que acrescenta skill sobe a versão, e a tag sai logo depois do merge. Na janela entre os dois, o comando mostrado ainda não funciona; aceito | O site não faz chamada de rede no build |
| Skill planejada no site | Dashboard §11, critério 7 | Adiada para a fase 2, quando existirem issues de proposta | Hoje não há fonte de dado para isso |
| Rotas | Dashboard §4 | As da spec: `/`, `/skills`, `/skills/<nome>`, `/areas/<tag>`, `/sobre` | Já estavam escritas |
| Fontes do site | Segurança §7 | Fontes do sistema, nenhuma fonte baixada | Zero requisição externa e zero licença de fonte |
| Teste de cabeçalho | Segurança §7 | Teste estático do `vercel.json` no CI e `curl -I` contra a produção registrado em `docs/fase-1.md` | O preview da Vercel pode exigir login |
| Design do site | Dashboard §8 | Skill `site` para estrutura e texto, depois skill `design` para o visual, dentro do W1 | Regra da casa |

## O que este plano não resolve

- Marco da versão 1.0 do pacote (Publicação §3): fica para a fase 3.
- `npm unpublish` dentro da política do npm: não é caminho previsto; retirada é por release nova.
- Skill em duas áreas e skill regional (Catálogo §10): nenhuma das três precisa.
- Acessibilidade e performance medidas: fase 2 (Dashboard §11).

---

# 6. Os itens

| # | Item | Onde | Bloco |
| --- | --- | --- | --- |
| A1 | **Abertura:** ADRs 0007 a 0009; estado da skill e fixture textual no validador e no catálogo | `docs/adr/`, `tools/` | A |
| S1 | **`validar-planilha-orcamentaria`** | `skills/orcamento/` | S |
| S2 | **`checklist-edital`** | `skills/licitacao/` | S |
| S3 | **`revisar-conformidade-documental`** | `skills/sst/` | S |
| C1 | **`add --for`**, com hash, detecção e registro local | `cli/` | C |
| C2 | **`list` com filtros, `search` e modo interativo** | `cli/` | C |
| C3 | **Release `0.1.0`** | tag, npm | C |
| V1 | **Exercício das três skills nos três agentes** | `docs/exercicios/fase-1/` | V |
| W1 | **Dashboard** (Astro, estático) | `dashboard/` | W |
| W2 | **Publicação do site na Vercel** | Vercel, `vercel.json` | W |
| P1 | **Marketplace do plugin** | `.claude-plugin/`, `tools/` | P |
| G1 | **Gate da fase 1** | `docs/fase-1.md` | G |

**Fica de fora da fase 1:** `update`, `remove`, `doctor`, `--global`, `--json`, perfis, MCPs,
extensão Gemini, domínio próprio, acessibilidade e performance medidas.

---

# 7. Bloco A — Abertura

## A1 — Decisões registradas e as duas cercas novas

### Entregáveis

- ADR-0007 (D1), ADR-0008 (D2) e ADR-0009 (D3), com a escolha do dono.
- Validador: `obraforge-estado` e `obraforge-motivo` na lista branca do `metadata`; estado só
  aceita `"depreciada"`; motivo obrigatório com o estado e proibido sem ele (`METADATA`). Binário
  dentro de `fixtures/` falha com `ESTRUTURA`.
- Gerador do catálogo: `state`, `deprecationReason` e `retired`. O `catalog.json` commitado é
  regenerado.
- `CONTRIBUTING.md` e o template de skill atualizados com as duas regras.

### Pronto quando

- Um caso inválido por regra nova, cada um acusando só o próprio código: estado com valor fora da
  lista, motivo sem estado, estado sem motivo, `.xlsx` em `fixtures/`.
- Teste do gerador com skill depreciada e com nome no `retiradas.txt`.
- Vermelho demonstrado desligando cada regra nova.
- Suíte completa verde, `validar` e `catalogo -- --verificar` verdes.

---

# 8. Bloco S — Skills

Toda skill deste bloco segue o formato do `CONTRIBUTING.md` e do template, cumpre as quatro regras
do `AGENTS.md` e passa pela skill `seguranca` (classificação de superfície) antes do PR. **Toda
citação normativa é conferida na fonte oficial no momento da escrita** (Planalto, gov.br do
Ministério do Trabalho, ABNT para o que for pago), com a data da consulta no `normas.md`. Norma paga
é citada por número, título e ano, descrita com palavras próprias e nunca transcrita.

O **revisor de domínio** de cada PR é o dono (Catálogo §8: o conteúdo técnico é aprovado pelo
revisor de domínio da área).

Cada skill é exercitada durante a escrita num agente, para ajustar o texto. O exercício que conta
para o marco é o do V1, com o pacote publicado.

## S1 — `validar-planilha-orcamentaria` (área `orcamento`)

- **Confere** (Catálogo §5): hierarquia da EAP, item sem unidade ou quantidade, unidade incoerente
  com o serviço, total que não fecha, ausência de BDI e encargos.
- **Fixture:** `entrada.csv` com uma casa térrea fictícia e os seis erros do exemplo da spec (§12):
  item sem unidade, concreto medido em m², subtotal que não fecha, item fora da hierarquia, sem linha
  de BDI, quantidade zero em item com custo. Separador e decimal no padrão brasileiro, declarados
  no cabeçalho do `esperado.md`.
- **`esperado.md`:** os seis apontamentos, o que conta como acerto, e o que **não** é erro
  (arredondamento de centavos, §12).
- **Normas:** a spec não cita nenhuma para esta skill. Se o texto mencionar referência de BDI para
  obra pública, a citação entra com fonte conferida. Sem citação, o `normas.md` existe e diz que a
  skill não cita norma.

## S2 — `checklist-edital` (área `licitacao`)

- **Confere e estrutura** (Catálogo §5): extrai de um edital de obra os itens obrigatórios de
  habilitação (jurídica, fiscal, técnica, econômico-financeira, nos termos da spec; as categorias
  exatas saem da lei conferida na fonte) e de proposta, conforme a Lei nº 14.133/2021, e devolve o
  checklist com a cláusula de origem.
- **Fixture:** `entrada.md` com um edital sintético, exigências espalhadas pelo texto e uma exigência
  atípica, com órgão, CNPJ e endereço fictícios.
- **`esperado.md`:** cada exigência com a cláusula do edital, a atípica sinalizada, e a regra de
  não inventar exigência que o edital não traz.
- **Normas:** Lei nº 14.133/2021, com os artigos de habilitação conferidos no Planalto.

## S3 — `revisar-conformidade-documental` (área `sst`)

- **Confere** (Catálogo §5): a lista de documentos de uma obra contra um checklist genérico (PGR,
  PCMSO, ART ou RRT, alvará, memorial, projeto aprovado), com NR e ABNT citadas, e aponta faltantes e
  vencidos.
- **Fixture:** `entrada.md` com a lista de uma obra fictícia e uma **data de referência fixa**, para
  "vencido" não depender do dia em que o exercício roda.
- **`esperado.md`:** os faltantes e os vencidos plantados, e o limite: a skill não diz se um
  documento é tecnicamente adequado, só se existe e está no prazo.
- **Normas:** as NRs e leis que o checklist citar (candidatas: NR-1, NR-7, NR-18, Lei nº 6.496/1977
  da ART e Lei nº 12.378/2010 do RRT), cada uma conferida na fonte.

### Pronto quando (S1 a S3)

- `npm run validar` verde; `catalog.json` regenerado; `CHANGELOG.md` com a skill em *Adicionadas*.
- Exercício de escrita num agente apontou tudo do `esperado.md`.
- PR aprovado pelo dono como revisor de domínio.

---

# 9. Bloco C — CLI e release

## C1 — `add <skill...> [--for <ferramenta>] [--yes] [--force]`

### Desenho

1. **Uma implementação do hash.** O cálculo do SHA-256 da pasta sai do `tools/src/catalog.ts` e vai
   para a `cli/` (a parte publicada); o gerador do catálogo passa a importá-lo da `cli`. Assim o
   hash que o `add` confere é o mesmo código que gerou o catálogo.
2. **Nome.** Só nome exato do catálogo vira caminho, e ainda assim o padrão do `name` é conferido
   de novo. Nome desconhecido: erro 1 com sugestão por proximidade, sem instalar a sugestão.
3. **Estado.** Retirada (`retired`): recusa com 2. Depreciada: mostra o motivo; no terminal pede
   confirmação, sem terminal exige `--yes`.
4. **Destino.** `--for claude` → `.claude/skills/<nome>/`; `codex`, `gemini` e `agents` →
   `.agents/skills/<nome>/`. Sem `--for`, detecção pela pasta atual (`.claude/`, `.agents/`,
   `.gemini/`). Mais de um sinal: pergunta no terminal, erro 1 sem terminal. Nenhum sinal:
   `.agents/skills/`, com o aviso de que o Claude Code não lê essa pasta e a sugestão de
   `--for claude`.
5. **Conferência antes de gravar.** Recalcula o hash da pasta embutida no pacote; diverge → recusa
   com 2, não grava nada e aponta o `SECURITY.md`.
6. **Destino já existe.** Hash igual ao do catálogo: nada a fazer. Diferente (modificado ou outra
   versão): recusa com 1 e orienta `--force`.
7. **Caminho seguro.** Se qualquer parte do caminho de destino já existir como link simbólico (ex.:
   `.claude` apontando para outro lugar), recusa com 2. Copia exatamente o conjunto de arquivos que
   entra no hash, só arquivo regular, sem bit de execução.
8. **Gravação atômica.** Copia para uma pasta temporária irmã do destino, confere o hash da cópia e
   renomeia. Falha no meio não deixa pasta parcial.
9. **Registro local.** Atualiza o `obraforge.lock.json`.
10. **Saída.** Destino, versão e como o agente encontra a skill (§3). O texto de cada ferramenta é
    provisório até o V1.
11. **Várias skills:** uma a uma; falha de uma não desfaz as outras; resumo e código de saída pior
    ao final.

### Pronto quando

- Teste para cada recusa, cada uma isolada: hash divergente (1 byte alterado), retirada, depreciada
  sem `--yes` fora do terminal, modificada sem `--force`, link simbólico no caminho, ambiguidade de
  detecção fora do terminal, nome com `../`. Cada uma confere o código de saída **e** que nada foi
  gravado.
- Teste de "sem rede": falha se `cli/src` importar `node:http`, `node:https`, `node:net`,
  `node:tls`, `node:dgram` ou chamar `fetch(`.
- A CLI continua com zero dependência de runtime; a lista branca do tarball é a mesma.
- Job novo no CI com os testes da CLI em Windows (Node 24). O dono decide se ele entra no ruleset
  como sétimo check.
- A CLI passa pela skill `seguranca`, e o C1 tem revisão adversarial própria (lente de segurança),
  porque grava no disco do usuário.

## C2 — `list [--area <tag>] [--fase <n>]`, `search <termo>` e modo interativo

- `list` com os dois filtros, mostrando área, fase, versão e estado.
- `search` em nome, descrição e área, sem diferença de caixa nem de acento.
- `obraforge` sem argumento, num terminal, abre o modo interativo com `node:readline/promises`:
  área, skill, ferramenta e confirmação, e cai no mesmo caminho do `add`. Sem terminal, imprime a
  ajuda e sai com 1.
- `--help` atualizado. Saída sem cor quando `NO_COLOR` está definido ou fora de terminal.

**Pronto quando:** testes de cada comando e do modo interativo com entrada simulada; o modo
interativo nunca pergunta fora de terminal.

## C3 — Release `0.1.0`

- PR com `cli/package.json` em `0.1.0`, `catalog.json` regenerado e `CHANGELOG.md` com as três
  skills e os comandos novos. Tag `v0.1.0` criada pelo dono, ou pelo agente com autorização
  explícita (o ruleset de tags só aceita admin).

**Pronto quando:** workflow de release verde nos três jobs; provenance da `0.1.0` no npm; numa pasta
vazia, `npx -y obraforge@0.1.0 list` mostra as três skills e
`npx -y obraforge@0.1.0 add validar-planilha-orcamentaria --for claude` grava a skill e o
`obraforge.lock.json`; o mesmo com `--for codex` e `--for gemini`.

---

# 10. Bloco V — Exercício nos três agentes

## V1 — Protocolo e registro

Para cada skill e cada agente (Claude Code, Codex, Gemini CLI), nas versões estáveis do dia:

1. Pasta vazia; `npx -y obraforge@0.1.x add <skill> --for <agente>`.
2. Copiar a `fixtures/entrada.*` instalada para a raiz da pasta.
3. Rodar o agente sem interação (`claude -p`, `codex exec`, `gemini -p`) com um pedido fixo em
   linguagem natural, **sem citar o nome da skill**, para provar que a `description` aciona. Se não
   acionar, isso é registrado, e a segunda rodada invoca a skill explicitamente.
4. Guardar a saída bruta.
5. Conferir item a item contra o `esperado.md`: apontou ou não, falso positivo, violação de limite
   (produziu entregável, deixou de dar o aviso).

**Registro:** `docs/exercicios/fase-1/<skill>.md`, com agente, versão, modelo, data, pedido, a saída
bruta, a tabela de conferência e o veredito. Falso positivo ou item perdido vira ajuste na skill
(versão nova, release de correção) e nova rodada nos três agentes.

**Pronto quando:** as três skills com todos os itens do `esperado.md` apontados nos três agentes, e
os nove registros no repositório. As rodadas no Codex e no Gemini CLI dependem da pendência P1 e
rodam nas contas do dono.

---

# 11. Bloco W — Dashboard

## W1 — Site estático (`dashboard/`)

- Workspace privado `dashboard/` (nunca publicado), Astro 7.3.3 estático e Tailwind (D-004), com
  versão, licença e OSV do Tailwind conferidos na fatia. A licença da árvore de dependências inteira
  é conferida: nenhuma AGPL, nenhuma "não comercial".
- Lê o `catalog.json` e os arquivos das skills da mesma revisão, no build. Nada sobre skill é
  digitado à mão.
- Páginas da fase 1 (§5). A página da skill mostra descrição, área, fase, versão, estado, normas com
  fonte, o que a skill não faz, o resumo da fixture e o comando em abas (Claude Code, Codex, Gemini
  CLI, genérico).
- `SKILL.md` renderizado sem HTML cru e sem script; link externo com `rel="noopener noreferrer"`.
  O renderizador de Markdown é escolhido na fatia, com licença e OSV conferidos.
- Busca e filtros num script próprio, sem terceiro; sem JavaScript, a lista inteira continua
  visível.
- Sem cookie, sem analytics, sem fonte externa, sem script externo, CSS e JS em arquivo (não inline),
  para a CSP restritiva funcionar.
- Estrutura e texto pela skill `site`; visual pela skill `design`.

**Pronto quando:** `npm run build` inclui o site; testes sobre o HTML gerado: nenhuma referência a
host externo, nenhum `<script>` inline, uma skill de teste com `<script>` e HTML cru no `SKILL.md`
não gera HTML cru (a skill de teste vive no teste, não em `skills/`), e o comando mostrado em cada
aba, rodado contra a CLI construída numa pasta temporária, instala a skill. O site funciona em
largura de celular.

## W2 — Publicação na Vercel

- Pela forma decidida na D3. Produção só a partir da `main`.
- `vercel.json` com CSP (`default-src 'self'`, sem `unsafe-inline`, `frame-ancestors 'none'`,
  `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`), HSTS, `nosniff`, `Referrer-Policy`
  e `Permissions-Policy`.

**Pronto quando:** teste no CI que falha se um desses cabeçalhos sair do `vercel.json`; `curl -I`
na produção mostra todos, registrado em `docs/fase-1.md`; o site de produção lista as três skills;
deploy com falha mantém a versão anterior.

---

# 12. Bloco P — Plugin

## P1 — Marketplace gerado do catálogo

- `tools/` gera `.claude-plugin/marketplace.json` do `catalog.json`: `name`, `owner` e um plugin por
  skill, com fonte `git-subdir` em `skills/<area>/<nome>`, `ref` `v<versão do catálogo>`,
  `"strict": false` e a skill na raiz do plugin. Skill depreciada entra com o motivo na descrição;
  retirada não entra.
- `npm run catalogo` regenera os dois arquivos; `-- --verificar` confere os dois no job `catalogo`.
- O formato é conferido com `claude plugin validate --strict` antes do PR. Se a skill na raiz do
  plugin não funcionar com `strict: false`, o desenho muda para o campo `skills` apontando para a
  pasta, e a mudança é registrada no PR.

**Pronto quando:** teste do gerador (skill publicada, depreciada, retirada); vermelho do `catalogo`
com o manifesto desatualizado; `claude plugin validate --strict` verde; numa sessão limpa,
`/plugin marketplace add obraforge/obraforge` e a instalação de uma skill gravam no cache uma cópia
com o mesmo hash da instalada pela CLI, vinda da tag.

---

# 13. Critério de pronto, teste da fase e gate

## As três camadas

As mesmas da fase 0: **1** código com testes verdes, **2** cerca demonstrada, **3** artefato real.
As evidências das camadas 2 e 3 ficam em `docs/fase-1.md`, criado no A1.

## O teste que define a fase 1

> 1. Um clone limpo roda `npm ci && npm run build && npm test` verde em Node 22 e 24, com o site no
>    build, e `validar` e `catalogo -- --verificar` verdes
> 2. Numa pasta vazia, `npx -y obraforge@0.1.x list` mostra as três skills
> 3. Numa pasta vazia, `npx -y obraforge@0.1.x add <skill> --for claude` grava em `.claude/skills/`
>    e `--for codex` e `--for gemini` gravam em `.agents/skills/`, cada cópia com o hash do
>    catálogo, e o `obraforge.lock.json` registra cada uma
> 4. As recusas do C1 demonstradas por teste, cada uma com o código de saída e nada gravado
> 5. As três skills exercitadas com a fixture nos três agentes, a partir do pacote publicado, com
>    tudo do `esperado.md` apontado e os nove registros em `docs/exercicios/fase-1/`
> 6. O site em produção, publicado da `main`, lista as três skills, mostra o comando que a CLI aceita
>    e responde com CSP, HSTS, `nosniff` e `Referrer-Policy`
> 7. O marketplace passa no `claude plugin validate --strict`, e uma skill instalada pelo plugin é
>    idêntica, pelo hash, à instalada pela CLI
> 8. O Scorecard mantém 10 nos cinco checks do D2 da fase 0, e o OSV fica verde com o site na árvore
> 9. O gate G1 concluído, com cada achado corrigido ou aceito em ADR

## G1 — Gate da fase 1

Com a skill `qualidade`: agentes `adversario` nas lentes de **segurança** (C1 gravando no disco,
fixação do plugin na tag, cabeçalhos e HTML cru do site), **correção** (CLI e geradores) e
**normativa** (as três skills: citações conferidas na fonte, regra dos quatro verbos, aviso). A
lente externa (Codex) entra se a pendência P1 estiver resolvida. Antes de abrir o gate, o custo
esperado (número de agentes, ordem de grandeza de tempo) e a alternativa mais barata são
apresentados ao dono.

---

# 14. Pendências do dono

| # | Pendência | Bloqueia |
| --- | --- | --- |
| D1 a D3 | ~~As três decisões da §4~~ Decididas em 21/09/2026 (recomendações adotadas) | — |
| P1 | Atualizar o Codex CLI para a estável (0.155.1 em 21/09/2026) e instalar o Gemini CLI estável (0.60.0), logados nas contas do dono | V1 e a lente externa do G1 |
| P2 | Criar o projeto na Vercel e, se a D3 escolher a integração com o Git, instalar o app só neste repositório | W2 |
| P3 | Revisão de domínio de S1, S2 e S3 | Merge de cada skill |
| P4 | Criar a tag `v0.1.0`, ou autorizar o agente a criá-la | C3 |
| P5 | Decidir se o job de Windows entra no ruleset | Nada; só o peso do check |

---

# 15. Ajustes nas specs que este plano provoca

A regra 5 do Roadmap vale: nenhuma spec é editada em silêncio. O registro vinculante é este plano
e os ADRs 0007 a 0009. No fechamento da fase, cada spec do ChatPRD pode ganhar uma seção datada
"v1.2" com os ajustes abaixo, se o dono quiser manter o espelho.

| Spec | Ajuste | Origem |
| --- | --- | --- |
| Catálogo · Skills | Onde vive o estado (depreciada e retirada); fixture só em texto; registro do exercício em `docs/exercicios/` | D1, D2, V1 |
| CLI | `obraforge.lock.json`; `--force`; valores de `--for`; recusa por link simbólico e gravação atômica; `--json` fora da fase 1; job de Windows | §5, C1 |
| Publicação e Plugin | `catalog.json` com `state`, `deprecationReason` e `retired`; formato do marketplace fixado na tag; frescor no job `catalogo` | D1, §5, P1 |
| Dashboard | Sem badge "na próxima versão"; skill planejada na fase 2; fontes do sistema | §5 |
| Segurança | Controles da CLI no disco do usuário (a spec não trata); forma de deploy da Vercel; teste de cabeçalho estático mais `curl` | C1, D3, §5 |
| Roadmap | Plano da fase 1 escrito | Este documento |

---

# 16. Ordem de execução

```
A1 Abertura (D1–D3)
 ├─→ S1 ─→ S2 ─→ S3 ─┐
 └─→ C1 add ─→ C2 ───┤
                     ↓
                C3 Release 0.1.0  (P4)
                     ↓
          V1 Exercício 3 × 3  (P1)
                     ↓
          W1 Site ─→ W2 Vercel  (P2)
                     ↓
          P1 Marketplace
                     ↓
          G1 Gate da fase 1
```

S e C são independentes depois do A1 e podem se alternar. P1 depende só do C3 (precisa da tag), e
pode vir antes do W se for conveniente.

## Blocos de sessão

O orçamento de cada bloco é o contexto (teto operacional de cerca de 250 mil tokens de histórico),
não o relógio. Cada bloco fecha em estado estável: fatia verificada, commitada e em PR.

| Bloco | Itens | Estado estável ao fim |
| --- | --- | --- |
| 1 | A1, S1 | ADRs aceitos, cercas novas com vermelho e verde, primeira skill em PR |
| 2 | S2, S3 | As três skills em PR |
| 3 | C1, C2 | CLI completa da fase 1, com a revisão adversarial do C1 |
| 4 | C3, V1 | `0.1.0` publicada e os nove registros do exercício |
| 5 | W1, W2 | Site em produção |
| 6 | P1, G1 | Marketplace e gate; fase 1 fechada em `docs/fase-1.md` |

A calibração por item (modelo, esforço e tempo) é apresentada depois do aceite deste plano.
