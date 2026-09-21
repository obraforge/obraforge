# obraforge

> obraforge is an open catalog of Agent Skills for AEC (architecture, engineering, and construction) in Brazil, licensed under MIT. A skill packages sector-specific knowledge as a procedure that any Agent Skills–compatible code agent (Claude Code, Codex, Gemini CLI, Cursor, GitHub Copilot, and others) loads on demand. The project is currently in **Phase 0 — Foundation**: the repository exists, but no skill has been published yet.

## O que é

obraforge é o **catálogo aberto de Agent Skills para AEC** (arquitetura, engenharia e construção) no Brasil, pensado para ser instalável com um comando em qualquer agente de código compatível com o padrão aberto [Agent Skills](https://agentskills.io) — Claude Code, Codex, Gemini CLI, Cursor, GitHub Copilot e outros. Licença MIT.

Uma skill é uma pasta com um `SKILL.md`: conhecimento de setor empacotado como procedimento que o agente carrega sob demanda. O obraforge guarda, valida, cataloga e distribui essas pastas. Nada mais.

## O que obraforge não é

* **Não é runtime nem orquestrador.** Quem executa é o agente do usuário, na assinatura do usuário.
* **Não tem memória, fila, conta de usuário nem cobrança dentro do produto.** É arquivo de texto num repositório.
* **Não entrega resultado fim a fim.** A skill confere, estrutura, explica ou dá modelo; o entregável de engenharia continua sendo de quem assina.
* **Não é exclusivo de um LLM.** Ninguém precisa trocar de assistente para usar o catálogo.

## Estado atual

**Fase 0 — Fundação.** Repositório e esqueleto do monorepo em construção. **Nenhuma skill publicada ainda.**

## Instalação

A instalação de skills fica disponível **a partir da fase 1**, quando o catálogo tiver as primeiras skills. Este README vai trazer o comando de instalação a partir daí.

## Como contribuir

Veja [`CONTRIBUTING.md`](./CONTRIBUTING.md) para o fluxo de proposta, escrita e revisão de uma skill.

## Segurança

Vulnerabilidades devem ser reportadas pelo canal privado descrito em [`SECURITY.md`](./SECURITY.md), nunca por issue pública.

[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/obraforge/obraforge/badge)](https://scorecard.dev/viewer/?uri=github.com/obraforge/obraforge)

## Aviso

**Nenhuma skill do obraforge substitui o responsável técnico.** Toda skill confere, estrutura, explica ou dá modelo — o entregável de engenharia ou a apuração fiscal continuam sendo de quem assina.

## Licença

MIT. Veja [`LICENSE`](./LICENSE).
