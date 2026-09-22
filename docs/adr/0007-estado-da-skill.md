# ADR-0007 — Onde vive o estado depreciada ou retirada de uma skill

- **Estado:** aceito
- **Data:** 21/09/2026
- **Decisor:** dono do projeto (D1 do [plano da fase 1](../planos/fase-1-mvp.md))
- **Revoga em parte:** a lista branca do `metadata` do [ADR-0006](0006-endurecimento-do-validador.md),
  que passa a aceitar mais duas chaves. O resto do ADR-0006 continua valendo.

## Contexto

O *Catálogo · Skills — Spec* (§3) define os estados de uma skill (proposta, em revisão, publicada,
depreciada, retirada) e as transições, mas deixou em aberto onde o estado fica gravado: "decisão
antes do primeiro `add`, na fase 1". A CLI precisa dele (retirada: recusa; depreciada: avisa o
motivo e pede confirmação), e o site também (skill retirada não mostra comando de instalação).
Proposta e em revisão vivem na issue e no PR, e não precisam de campo.

## Decisão

1. **Publicada** é o padrão: a pasta está em `skills/<area>/<nome>/` e o `SKILL.md` não tem campo de
   estado.
2. **Depreciada** fica no próprio `SKILL.md`, com duas chaves no `metadata`:
   `obraforge-estado: "depreciada"` e `obraforge-motivo: "<motivo>"`. As duas andam juntas: estado
   sem motivo, motivo sem estado, motivo vazio, motivo com mais de 500 caracteres ou estado com
   outro valor falham no validador com `METADATA`. Depreciar é mudança na skill: sobe a versão
   (patch) e entra no changelog. Voltar a publicada é tirar as duas chaves e subir a versão de novo.
3. **Retirada** é a pasta removida de `skills/` e o nome acrescentado ao `skills/retiradas.txt`, que
   já é *append-only* e já impede reaproveitar o nome (regra `NOME`). O motivo vai no changelog.
4. O `catalog.json` passa a trazer, por skill, `state` (`"publicada"` ou `"depreciada"`) e
   `deprecationReason` só quando depreciada; e no topo `retired`, com os nomes do `retiradas.txt`
   em ordem de bytes. Estado desconhecido faz o gerador falhar: nunca vira "publicada" calado.

## Consequências

- Boas: o estado viaja com a cópia instalada, e o `doctor` da fase 2 pode ler a skill local. Mudar
  o estado é mudança visível, com versão nova, como a regra "nunca editada em silêncio" pede. A
  retirada reusa uma cerca que já existia.
- Ruins: depreciar muda o hash da skill, então quem tem a versão anterior instalada vê versão
  diferente, e não só estado diferente. O motivo aparece no terminal e no site, e por isso passa
  pelas mesmas varreduras do resto do `SKILL.md`.

## Alternativas rejeitadas

- **Arquivo central `skills/estados.json`:** duas fontes para manter em sincronia, e a cópia
  instalada não sabe que foi depreciada.
- **Estado só no `catalog.json`:** o catálogo é gerado e nunca editado à mão.
