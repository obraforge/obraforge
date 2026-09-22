# ADR-0009 — Site na Vercel: plano Hobby e deploy pela integração com o Git

- **Estado:** aceito
- **Data:** 21/09/2026
- **Decisor:** dono do projeto (D3 do [plano da fase 1](../planos/fase-1-mvp.md))
- **Complementa:** a D-004 (dashboard Astro na Vercel). Não revoga nada.

## Contexto

A D-004 fixou a Vercel. Faltava decidir o plano e a forma de deploy. O termo do plano Hobby, lido em
21/09/2026 (vercel.com/docs/limits/fair-use-guidelines, atualizado em 14/09/2026), diz: "Hobby
teams are restricted to non-commercial personal use only. All commercial usage of the platform
requires either a Pro or Enterprise plan", e define uso comercial como "any Deployment that is used
for the purpose of financial gain of anyone involved in any part of the production of the project".
Também diz: "Asking for Donations does not fall under commercial usage."

Para o deploy, a integração com o Git exige instalar o app da Vercel no GitHub, que pede permissões
amplas no repositório (vercel.com/docs/git/vercel-for-github, 17/09/2026). A alternativa é um
workflow do GitHub Actions com a CLI da Vercel e um `VERCEL_TOKEN` guardado no repositório.

## Decisão

1. **Plano Hobby nas fases 1 e 2.** O obraforge é MIT e não tem receita. Antes de qualquer receita
   ou patrocínio (fase 4), ou se o site passar a servir de vitrine para produto pago, o projeto
   migra para o Open Source Program da Vercel (candidatura prevista na fase 3) ou para o Pro.
2. **Deploy pela integração com o Git.** O app da Vercel é instalado **só** em
   `obraforge/obraforge` e não entra como exceção de nenhum ruleset: o push na `main` e a criação de
   tag continuam só pelo caminho de hoje. A produção sai só da `main`. As permissões pedidas na tela
   de instalação ficam registradas em `docs/fase-1.md`.
3. **Condição:** se a instalação pedir escrita em `Administration`, esta decisão cai, e o deploy
   passa ao GitHub Actions com token, por ADR novo.

## Consequências

- Boas: nenhum segredo no repositório; preview por PR sem código novo, como a *Publicação e Plugin
  — Spec* §8 pede.
- Ruins: um terceiro com permissão de escrita no repositório. O limite é o que os rulesets impedem,
  e o app é revogável a qualquer momento pela org. O termo do Hobby fala em "personal use", e a
  leitura de que um projeto aberto sem receita cabe nele é do dono; em caso de dúvida, parecer da
  skill `advogado`.

## Alternativas rejeitadas

- **GitHub Actions com `VERCEL_TOKEN`:** um segredo de longa duração no repositório, e sem preview
  para PR de fork.
- **Pro desde já:** custo sem necessidade enquanto não há receita.
