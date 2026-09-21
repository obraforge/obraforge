# ADR-0002 — ESM e build com `tsc`, sem bundler

- **Estado:** aceito
- **Data:** 21/09/2026
- **Decisor:** dono do projeto
- **Revoga em parte:** D-004, só o trecho "CLI `obraforge` compilada para um arquivo". O resto da
  D-004 continua vigente.

## Contexto

A D-004 diz que a CLI é "compilada para um arquivo com dependências mínimas". O item A1 do plano da
fase 0 (`docs/planos/fase-0-fundacao.md`) diz "build com `tsc`, sem bundler". As duas afirmações se
contradizem, e o formato de módulos (ESM ou CommonJS) também não estava decidido. As duas coisas
precisam estar fechadas antes do primeiro arquivo de código.

O que restringe: `engines >=22`; a CLI da fase 0 tem **zero dependências de runtime**; toda
dependência nova amplia a cadeia de suprimento de um pacote que distribui instruções para agentes.

## Decisão

1. **ESM em todos os workspaces** (`"type": "module"`, `module`/`moduleResolution` `nodenext`).
2. **Build com `tsc`**, que emite um arquivo `.js` por arquivo `.ts`. **Sem bundler.**
3. O pacote publicado leva a árvore compilada em `dist/`, restrita pela lista branca do campo
   `files` (item C1 do plano).

**Gatilho de revisão:** a primeira dependência de runtime da CLI. Nesse momento, reavaliar se
empacotar num arquivo reduz a árvore instalada pelo `npx` o bastante para justificar um bundler.

## Consequências

- Boas: nenhuma dependência de build além do `typescript`; o código publicado é legível e o stack
  trace aponta para o arquivo e a linha reais; ESM é o formato nativo do Node e do ecossistema atual.
- Ruins: o tarball tem vários arquivos em vez de um; se a CLI ganhar dependências de runtime, elas
  entram na árvore do `npx` do usuário até o gatilho acima ser reavaliado.

## Alternativas rejeitadas

- **ESM + esbuild num arquivo (manteria a D-004 intacta):** uma dependência de desenvolvimento a
  mais, sem ganho enquanto a CLI não tiver dependência de runtime para embutir.
- **CommonJS + `tsc`:** formato legado, sem vantagem para Node 22 ou superior.
