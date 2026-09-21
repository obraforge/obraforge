# AGENTS.md

Contrato para qualquer agente de código (Codex, Gemini, Claude Code e outros) que trabalhe neste repositório.

## O que é este repositório

`obraforge/obraforge` é o **catálogo aberto de Agent Skills para AEC** (arquitetura, engenharia e construção) no Brasil. Licença MIT. Uma skill é uma pasta com `SKILL.md`: conhecimento de setor empacotado como procedimento que qualquer agente compatível com o padrão aberto Agent Skills carrega sob demanda. Este repositório guarda, valida, cataloga e distribui essas pastas — nada mais.

### Fronteira (nunca fazer o repositório virar isto)

* **Não é runtime nem orquestrador.** Quem executa é o agente do usuário, na assinatura do usuário.
* **Não tem memória, fila, conta de usuário nem cobrança dentro do produto.**
* **Não entrega resultado fim a fim.** Uma skill confere, estrutura, explica ou dá modelo — nunca produz o entregável de engenharia ou a apuração fiscal completa.
* **Não é exclusivo de um LLM.**

## Estrutura do monorepo

| Pasta | O que é |
| --- | --- |
| `cli/` | Pacote npm `obraforge`, **publicado**. Zero dependências de runtime na fase 0. |
| `tools/` | Workspace privado `@obraforge/tools` (`"private": true`), **nunca publicado**. Validador, gerador de catálogo e testes internos. |
| `skills/` | As skills do catálogo, uma pasta por skill em `skills/<area>/<nome>/`. |
| `docs/adr/` | Decisões arquiteturais (ADRs). Fonte de verdade das decisões a partir da graduação do projeto. |
| `docs/planos/` | Planos de implementação por fase. |

`dashboard/` nasce na fase 1; `mcps/` nasce na fase 4. Não crie essas pastas antes da fase correspondente.

## Regras do catálogo

### As quatro regras de toda skill

1. **Confere, estrutura, explica ou dá modelo.** Nunca produz o entregável de engenharia ou a apuração fiscal fim a fim.
2. **Toda citação normativa tem número, título, ano e fonte.** A skill contém o aviso-padrão de que não substitui o responsável técnico.
3. **Fixture sintética obrigatória.** Sem dado real de cliente, obra ou pessoa. O teste exercita a skill contra a fixture.
4. **Sem hook, sem permissão, sem rede.** Skill que referencie hook, setting ou permissão do agente é rejeitada pelo validador.

### Estrutura obrigatória

```
skills/<area>/<nome>/
├── SKILL.md              # frontmatter: name, description, metadata (obraforge-area, obraforge-fase, obraforge-versao)
├── fixtures/
│   ├── entrada.*          # caso sintético
│   └── esperado.md        # o que a skill deve apontar
├── references/
│   └── normas.md          # obrigatório: uma entrada por norma citada
├── assets/                 # opcional
└── scripts/                 # proibido antes da fase 3; depois, com duas revisões de mantenedor
```

Detalhe completo das regras do validador em [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## Nunca pode acontecer

* Dependência de runtime na CLI (`cli/`) adicionada sem ADR.
* Workflow usando `pull_request_target`.
* Action de terceiro em `.github/workflows/` sem SHA completo (40 caracteres) fixado.
* Segredo no repositório ou impresso em log de workflow.
* Skill referenciando hook, `settings.json`, permissão do agente ou comando de rede.
* Dado pessoal real (CPF, CNPJ, e-mail, telefone reais) em fixture.
* Edição de um ADR já aceito — decisão nova é ADR novo que revoga o anterior, nunca edição em silêncio.
* Publicação no pacote npm `obraforge` fora do workflow de release (a única exceção histórica é a `0.0.0` de reserva de nome, publicada manualmente uma única vez).

## Comandos de verificação

```
npm ci && npm run build && npm test
```

Os comandos abaixo dependem dos itens B1 (validador) e B2 (gerador de catálogo) do plano da fase 0 e **ainda não estão implementados**:

```
npm run validar
npm run catalogo -- --verificar
```

Antes de declarar uma fatia pronta, rode o recorte afetado; a suíte completa (`npm run build && npm test`, mais `validar` e `catalogo -- --verificar` quando existirem) roda ao fechar cada fatia commitável.

## Convenção de idioma

* **Português do Brasil** em texto de negócio e documentação, inclusive nos nomes dos arquivos de documentação (`docs/`).
* **Código em inglês:** identificadores (variáveis, funções, tipos) e nomes dos arquivos de código-fonte.
* Estrangeirismos de domínio são preservados (EAP, BDI, RDO, medição, empreitada).
* Nomes já fixados pelo plano da fase 0 **permanecem como estão**, sem tradução nem renomeação: `validar`, `catalogo`, `fixtures/entrada.*`, `esperado.md`, `normas.md`.
