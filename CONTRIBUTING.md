# Contribuindo com o obraforge

Obrigado por considerar contribuir. Este documento descreve o fluxo completo, da ideia à skill publicada, e as regras que o validador automático aplica em todo PR.

## Fluxo de contribuição

1. **Proponha.** Abra uma issue no repositório com o nome sugerido da skill, a área do catálogo e o problema que ela resolve. Se o nome já existir no catálogo ou em `skills/retiradas.txt`, a proposta é recusada.
2. **Confirmação.** Um mantenedor confirma nome, área e fase da skill, ou recusa com motivo (fora da fronteira do projeto, duplicada, área inexistente).
3. **Escreva.** Copie o template de skill (`docs/template-skill/`), escreva o `SKILL.md`, a fixture e as referências normativas, e abra um Pull Request.
4. **Validador.** O CI roda o validador automaticamente sobre `skills/`. PR com validador vermelho volta para o contribuidor com o código de erro, o arquivo e a linha.
5. **Revisão.** Com o validador verde, o PR entra em revisão: um mantenedor revisa formato e segurança; um revisor de domínio da área revisa o conteúdo técnico e as normas citadas.
6. **Merge.** Aprovado por ambos, o mantenedor faz o merge. O `catalog.json` é regenerado no CI.
7. **Publicação.** Na próxima tag de release, a skill passa ao estado **publicada**.

Correção de skill já publicada segue o mesmo fluxo de revisão, com a versão da skill subindo e a mudança registrada no changelog. Skill cuja norma foi revogada é depreciada por PR, com o motivo registrado, antes de ser corrigida ou retirada. Vulnerabilidade em skill publicada é relatada pelo canal privado do [`SECURITY.md`](./SECURITY.md) e leva à retirada imediata na próxima release de correção.

## Estrutura obrigatória de uma skill

```
skills/<area>/<nome>/
├── SKILL.md              # frontmatter: name, description, metadata
├── fixtures/
│   ├── entrada.*          # caso sintético
│   └── esperado.md        # o que a skill deve apontar
├── references/
│   └── normas.md          # obrigatório: uma entrada por norma citada
├── assets/                 # opcional: modelos (EAP, checklist, RDO)
└── scripts/                 # proibido antes da fase 3; depois, com revisão dupla
```

O nome da pasta é igual ao campo `name` do frontmatter: kebab-case, 1 a 64 caracteres, apenas `a-z`, `0-9` e hífen, sem hífen no início, no fim ou duplicado. Nome de skill retirada nunca é reaproveitado (`skills/retiradas.txt` é lista *append-only*).

O `metadata` do `SKILL.md` traz os campos próprios do obraforge, como texto:

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

## Regras que o validador impõe

Cada regra tem um código estável, exibido na saída junto com o arquivo e a linha:

| Código | Falha quando |
| --- | --- |
| `ESTRUTURA` | Falta `SKILL.md`, `fixtures/entrada.*`, `fixtures/esperado.md` ou `references/normas.md` |
| `NOME` | `name` fora da regra do padrão, diferente do nome da pasta, ou presente em `skills/retiradas.txt` |
| `DESCRICAO` | `description` vazia ou com mais de 1024 caracteres |
| `METADATA` | Falta `obraforge-area`, `obraforge-fase` ou `obraforge-versao`; área fora das 23 áreas mais `contexto`; área diferente da pasta pai; fase fora de `1` a `4`; versão fora do semver |
| `SCRIPTS` | Pasta `scripts/` presente enquanto o projeto estiver antes da fase 3 |
| `NORMA` | Citação no `SKILL.md` que casa com o padrão de norma (`NR-nn`, `NBR nnnn`, `Lei n.nnn/aaaa`, `Resolução ... nº`, `Decreto n.nnn/aaaa`) sem entrada correspondente em `references/normas.md`, ou entrada sem título, ano ou fonte |
| `AVISO` | Falta, no `SKILL.md`, o aviso-padrão de que a skill não substitui o responsável técnico (texto exato no template em `docs/template-skill/`) |
| `AGENCIA` | Frontmatter com `allowed-tools`; corpo com referência a hook, `settings.json`, permissão do agente, ou comando de rede (`curl`, `wget`, `Invoke-WebRequest`, `fetch(`). Lista inicial versionada em `tools/`; toda ampliação entra por PR |
| `LINK` | Arquivo simbólico ou executável dentro da pasta da skill |
| `DADO-PESSOAL` | CPF ou CNPJ com dígito verificador válido; e-mail fora de `example.com`, `example.org` ou `example.net`; telefone fora do formato fictício `(00) 00000-0000` |

## Fixture: só dado sintético

A fixture (`fixtures/entrada.*` e `fixtures/esperado.md`) é sempre um caso **inventado**: planilha, edital, lista de documentos ou memorial sintético, com erros ou lacunas plantados. **Nenhum dado real de cliente, obra ou pessoa entra numa fixture.** O `esperado.md` lista o que a skill precisa apontar.

## Referência normativa

Toda citação de lei, norma regulamentadora, ABNT, resolução ou decreto tem **número, título, ano e fonte** em `references/normas.md`. Para norma paga (como as NBR), a `Fonte` indica onde adquirir — nunca transcreve o texto da norma. Toda skill contém o aviso-padrão de que não substitui o responsável técnico.

## Sem hook, sem permissão, sem rede

Uma skill nunca referencia hook, `settings.json`, permissão do agente (`allowed-tools`) ou comando de rede. Isso vale desde a fase 0 e é aplicado pela regra `AGENCIA` do validador.

## `scripts/` fica fora até a fase 3

Nenhuma skill tem pasta `scripts/` antes da fase 3. A partir da fase 3, `scripts/` exige duas aprovações de mantenedor além da revisão de domínio (ver [`.github/CODEOWNERS`](./.github/CODEOWNERS)) — regra hoje dormente.

## Dependência nova

Toda dependência nova (do `cli/`, do `tools/` ou de workflow) entra com **versão estável, OSV.dev e licença conferidos no registro oficial** no momento da adoção, e esses três pontos ficam registrados na descrição do PR. Licença que restrinja uso comercial não é adotada sem autorização explícita do dono do repositório.

## Comandos de verificação

Antes de abrir o PR, rode localmente:

```
npm ci && npm run build && npm test
```

O validador aplica as regras acima sobre `skills/`:

```
npm run validar
```

A conferência do catálogo **está em construção na fase 0** e passa a valer quando o item B2 do plano de fundação for entregue:

```
npm run catalogo -- --verificar
```

## Revisão

Toda thread de revisão se resolve com resposta — corrigido, recusado ou adiado — nunca em silêncio. Achado de revisão automática é conferido no código ou na doc antes de aceito ou recusado.
