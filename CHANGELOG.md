# Changelog

Este arquivo lista as mudanças de cada release do obraforge. Cada versão tem até quatro seções — **Adicionadas**, **Alteradas**, **Depreciadas** e **Retiradas** — cada uma só aparece quando há algo a registrar nela.

## [Não lançado]

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
