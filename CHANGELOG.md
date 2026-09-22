# Changelog

Este arquivo lista as mudanças de cada release do obraforge. Cada versão tem até quatro seções — **Adicionadas**, **Alteradas**, **Depreciadas** e **Retiradas** — cada uma só aparece quando há algo a registrar nela.

## [Não lançado]

### Adicionadas

- Skill `validar-planilha-orcamentaria` (área `orcamento`, versão 1.0.0): confere hierarquia da EAP, unidade e quantidade de cada item, unidade coerente com o serviço, totais e subtotais, e presença de BDI e de encargos sociais.

### Alteradas

- `catalog.json` ganha, por skill, `state` (`publicada` ou `depreciada`) e `deprecationReason` quando depreciada, e no topo `retired`, com os nomes de `skills/retiradas.txt` ([ADR-0007](docs/adr/0007-estado-da-skill.md)).
- No repositório, fora do pacote: o validador aceita `obraforge-estado` e `obraforge-motivo` no `metadata` (só para skill depreciada) e recusa arquivo binário em `fixtures/` ([ADR-0008](docs/adr/0008-fixture-so-em-texto.md)).

## [0.0.1] — 2026-09-21

Primeira release funcional, publicada pelo workflow de release do repositório, com provenance. O catálogo ainda não tem nenhuma skill.

### Adicionadas

- CLI `obraforge`, sem dependência de runtime, com `--version`, `--help` e `list`. Sem skills no catálogo, `list` imprime "Nenhuma skill publicada nesta versão." e sai com 0.
- Códigos de saída da CLI: 0 sucesso, 1 erro de uso, 3 erro de ambiente (Node abaixo de 22, catálogo ilegível). O 2 fica reservado para recusa de segurança, ainda sem uso.
- `catalog.json` embutido no pacote, ainda sem skills.
- No repositório, fora do pacote: validador de skill (`npm run validar`) e gerador do `catalog.json` (`npm run catalogo`, com `--verificar`).
