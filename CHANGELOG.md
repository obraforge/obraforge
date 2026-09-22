# Changelog

Este arquivo lista as mudanças de cada release do obraforge. Cada versão tem até quatro seções — **Adicionadas**, **Alteradas**, **Depreciadas** e **Retiradas** — cada uma só aparece quando há algo a registrar nela.

## [Não lançado]

## [0.1.1] — 2026-09-22

Correções do gate da fase 1 (G1), com as três lentes adversariais registradas em `docs/fase-1.md`.

### Alteradas

- Skill `checklist-edital` 1.1.0: sinaliza como atípica a exigência de profissional vinculado à licitante antes da contratação (Lei nº 14.133/2021, art. 67, I), e trata quantidade mínima de atestado sem parcela de maior relevância indicada como ponto a confirmar. O `esperado.md` deixa de justificar os 210 m² como "50% da obra".
- Skill `revisar-conformidade-documental` 1.0.1: referências da NR-7 e da NR-18 corrigidas (redação e última alteração conferidas no portal do MTE); exceção da NR-18 citada por inteiro ("profissional qualificado em segurança do trabalho"); ART e RRT sem restringir a ART à engenharia; o `esperado.md` deixa claro que o PCMSO sem data do relatório analítico é "a confirmar".
- Skill `validar-planilha-orcamentaria` 1.0.1: o subtotal é a soma dos itens listados sob o grupo, inclusive o item mal numerado, que é erro de hierarquia e não de soma.
- CLI: a pergunta de skill depreciada traz o motivo, e o modo interativo marca a skill depreciada; nome fora do padrão (caixa, underscore) também recebe sugestão; `search` com termo vazio é erro de uso; o resumo de várias skills sai por último.
- No repositório, fora do pacote: o validador recusa `obraforge-motivo` feito só de caractere invisível; o marketplace de plugins leva o começo do hash na versão do plugin, para conteúdo novo sempre chegar a quem instalou pelo plugin; o site descarta link relativo que sai da pasta da skill.

### Adicionadas

- No repositório, fora do pacote: `.claude-plugin/marketplace.json`, o marketplace de plugins do Claude Code gerado do catálogo, com um plugin por skill fixado na tag da release (`/plugin marketplace add obraforge/obraforge`).
- No repositório, fora do pacote: o site do catálogo em `dashboard/` (Astro estático), gerado do `catalog.json` e dos arquivos das skills, sem cookie, sem analytics e sem script de terceiro.

## [0.1.0] — 2026-09-21

Primeira release com skills: as três da fase 1 e a instalação por `npx obraforge add`.

### Adicionadas

- CLI `add <skill...> [--for claude|codex|gemini|agents] [--yes] [--force]`: confere o hash da skill embutida contra o catálogo e copia para `.claude/skills/` (Claude Code) ou `.agents/skills/` (Codex, Gemini CLI, genérico), com gravação atômica, recusa de link simbólico no caminho e registro em `obraforge.lock.json`. Sem `--for`, detecta o agente pela pasta atual. Códigos de saída: 2 para recusa de segurança (hash divergente, skill retirada, link simbólico).
- CLI `search <termo>`, sem diferença de caixa nem de acento, e filtros `--area` e `--fase` no `list`.
- CLI `obraforge` sem argumento, num terminal, abre o modo interativo: área, skill, ferramenta e confirmação.
- Skill `checklist-edital` (área `licitacao`, versão 1.0.0): extrai do edital de obra os itens de habilitação, as declarações e as exigências da proposta, com a cláusula de origem, conforme a Lei nº 14.133/2021, e sinaliza exigência atípica.
- Skill `revisar-conformidade-documental` (área `sst`, versão 1.0.0): confere a lista de documentos de uma obra (PGR, PCMSO, ART ou RRT de execução, alvará, memorial descritivo, projeto aprovado) e aponta o que falta e o que venceu numa data de referência, com a NR ou a lei de cada um.
- Skill `validar-planilha-orcamentaria` (área `orcamento`, versão 1.0.0): confere hierarquia da EAP, unidade e quantidade de cada item, unidade coerente com o serviço, totais e subtotais, e presença de BDI e de encargos sociais.

### Alteradas

- `list` mostra fase, versão e estado de cada skill.
- `obraforge` sem argumento e fora de um terminal sai com 1 e orienta a dizer o comando (antes imprimia a ajuda e saía com 0).
- `catalog.json` ganha, por skill, `state` (`publicada` ou `depreciada`) e `deprecationReason` quando depreciada, e no topo `retired`, com os nomes de `skills/retiradas.txt` ([ADR-0007](docs/adr/0007-estado-da-skill.md)).
- No repositório, fora do pacote: o validador aceita `obraforge-estado` e `obraforge-motivo` no `metadata` (só para skill depreciada) e recusa arquivo binário em `fixtures/` ([ADR-0008](docs/adr/0008-fixture-so-em-texto.md)).

## [0.0.1] — 2026-09-21

Primeira release funcional, publicada pelo workflow de release do repositório, com provenance. O catálogo ainda não tem nenhuma skill.

### Adicionadas

- CLI `obraforge`, sem dependência de runtime, com `--version`, `--help` e `list`. Sem skills no catálogo, `list` imprime "Nenhuma skill publicada nesta versão." e sai com 0.
- Códigos de saída da CLI: 0 sucesso, 1 erro de uso, 3 erro de ambiente (Node abaixo de 22, catálogo ilegível). O 2 fica reservado para recusa de segurança, ainda sem uso.
- `catalog.json` embutido no pacote, ainda sem skills.
- No repositório, fora do pacote: validador de skill (`npm run validar`) e gerador do `catalog.json` (`npm run catalogo`, com `--verificar`).
