# skills/

Aqui ficam as skills do catálogo, uma pasta por skill, agrupadas pela área:

```
skills/<area>/<nome>/
├── SKILL.md              # frontmatter (name, description, metadata) + instruções
├── fixtures/
│   ├── entrada.*         # caso sintético, sem dado real de cliente, obra ou pessoa
│   └── esperado.md       # o que a skill deve produzir a partir da entrada
└── references/
    └── normas.md         # uma entrada por norma citada: número, título, ano e fonte
```

O frontmatter segue o padrão aberto [Agent Skills](https://agentskills.io/specification), com os
campos próprios do obraforge no `metadata`:

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

- `name` é igual ao nome da pasta; a área é igual à pasta pai e está na lista fechada de áreas.
- Toda skill confere, estrutura, explica ou dá modelo. Nunca produz o entregável de engenharia fim a fim.
- Sem hook, sem permissão de agente, sem rede, e sem pasta `scripts/` antes da fase 3.
- Norma paga não é transcrita: `normas.md` indica onde adquirir.

O validador (`npm run validar`) recusa a skill que não segue este
formato. **Na fase 0 esta pasta não tem nenhuma skill.** Como propor uma: [CONTRIBUTING.md](../CONTRIBUTING.md).
