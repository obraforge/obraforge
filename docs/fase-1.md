# Fase 1 — MVP: estado e evidências

Registro vivo da fase 1. O caminho está em [`planos/fase-1-mvp.md`](planos/fase-1-mvp.md).
Evidência que não está aqui não conta (regra 6 do Roadmap). As camadas são as do plano:
**1** código com testes verdes · **2** cerca demonstrada (a recusa foi vista recusando) ·
**3** artefato real (o que o usuário ou o GitHub enxergam).

## Tempo por bloco: estimado e real

Estimativa da calibração aceita em 21/09/2026. O real vai do início do bloco até o estado estável
(fatia verificada e mergeada), no relógio de parede, com as esperas pelo dono incluídas e
anotadas.

| Bloco | Itens | Estimado | Início | Fim | Real | Observação |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | A1, S1 | 2–3,5 h | 21/09/2026 22:48 | | | |
| 2 | S2, S3 | 2–4 h | | | | |
| 3 | C1, C2 | 2,5–4 h | | | | |
| 4 | C3, V1 | 1,5–3 h | | | | |
| 5 | W1, W2 | 3–5 h | | | | |
| 6 | P1, G1 | 2–4 h | | | | |

## Estado por item

| Item | Estado | Evidência |
| --- | --- | --- |
| A1 Abertura | 🟡 em PR | ADRs [0007](adr/0007-estado-da-skill.md), [0008](adr/0008-fixture-so-em-texto.md) e [0009](adr/0009-vercel-hobby-e-integracao-com-o-git.md). Validador: `obraforge-estado` e `obraforge-motivo` na lista branca do `metadata`, com as regras de par; binário em `fixtures/` falha com `ESTRUTURA`. Catálogo: `state`, `deprecationReason` e `retired`. Vermelho visto antes do conserto: 13 testes caíram pelo motivo certo, mais 4 de mensagem que acusavam a chave fora da lista em vez da regra nova. 857 testes no `tools` e 26 na `cli` |
| S1 | ⬜ | |
| S2 | ⬜ | |
| S3 | ⬜ | |
| C1 | ⬜ | |
| C2 | ⬜ | |
| C3 | ⬜ | |
| V1 | ⬜ | |
| W1 | ⬜ | |
| W2 | ⬜ | |
| P1 | ⬜ | |
| G1 | ⬜ | |

## Autorizações do dono para a execução (21/09/2026)

- O agente mergeia os PRs da fase com `gh pr merge --squash --admin`, só com os seis checks verdes.
- A revisão de domínio das três skills acontece antes da release: nada vai ao npm sem ela.
- Depois da revisão de domínio, o agente cria a tag `v0.1.0`.
- O agente instala o Gemini CLI e atualiza o Codex CLI nas versões estáveis; o login é do dono.
