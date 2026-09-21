# ADR-0003 — Ruleset de tags de release

- **Estado:** aceito
- **Data:** 21/09/2026
- **Decisor:** dono do projeto
- **Complementa:** D-012 (proteção da `main`). Não revoga nada.

## Contexto

O `release.yml` publica no npm quando recebe push de uma tag `v*`. A guarda 1 do workflow confere que
o commit da tag está em `main`, mas numa tag o GitHub roda o `release.yml` **do próprio commit da
tag**: quem pode fazer push de tag pode alterar o workflow nesse commit e pular a guarda. A guarda
protege contra engano (taguear o commit errado), não contra quem tem permissão de criar tag. A D-012
protege a `main`, não as tags.

## Decisão

Ruleset no repositório `obraforge/obraforge`, alvo **tag**, padrão `refs/tags/v*`, ativo, com as
regras de **criação, atualização e exclusão** restritas. Só o papel **admin da organização** fica na
exceção. Hoje isso significa que só o dono cria, move ou apaga tag de release.

## Consequências

- Boas: publicar no npm passa a exigir a conta do dono (com 2FA); um mantenedor novo, um token de
  Actions ou um app não dispara release por engano ou por comprometimento.
- Ruins: toda release depende do dono; quando entrar o segundo mantenedor, a exceção precisa ser
  revista junto com a da D-012. A regra não foi vista recusando alguém, porque hoje não existe
  conta sem papel de admin na org; foi conferida pela API.

## Alternativas rejeitadas

- **Só a guarda 1:** não protege contra quem altera o workflow no commit da tag.
- **GitHub environment com revisor obrigatório, gravado no publicador confiável do npm:** protege
  também o job de publicação, mas com um mantenedor só o revisor seria o próprio autor da tag.
  Revisitar quando entrar o segundo mantenedor.
