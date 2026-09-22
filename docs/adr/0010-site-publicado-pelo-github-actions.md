# ADR-0010 — Site publicado pelo GitHub Actions, sem o app da Vercel

- **Estado:** aceito
- **Data:** 22/09/2026
- **Decisor:** dono do projeto, pela condição que ele mesmo fixou no ADR-0009
- **Revoga em parte:** o [ADR-0009](0009-vercel-hobby-e-integracao-com-o-git.md), na forma de
  deploy. O plano Hobby continua valendo.

## Contexto

O ADR-0009 escolheu a integração com o Git, com uma condição: "se a instalação pedir escrita em
`Administration`, esta decisão cai, e o deploy passa ao GitHub Actions com token, por ADR novo". O
gate da fase 1 conferiu a tabela oficial de permissões do app (vercel.com/docs/git/vercel-for-github,
atualizada em 17/09/2026): `Administration` com leitura **e escrita** ("Allows us to create
repositories on the user's behalf"), além de escrita em `Contents`, `Pull Requests`, `Checks`,
`Web Hooks` e `Commit Statuses`. A condição se cumpriu antes da instalação, e o app não foi
instalado. O mesmo gate mostrou por que isso importa: com escrita em `Contents`, um branch
`refs/heads/v<versão>` sombrearia a tag da release no marketplace de plugins.

## Decisão

1. O workflow `.github/workflows/site.yml` publica o site a cada push na `main` (e à mão, por
   `workflow_dispatch`), no environment **`producao`**, restrito à `main`, o único lugar onde existe
   o segredo `VERCEL_TOKEN`. PR, inclusive de fork, nunca chega a esse workflow.
2. O site é construído e testado no próprio job (`npm ci --ignore-scripts`, build da CLI, `npm test`
   do site), e só o `dashboard/dist` sobe, com o `vercel.json` dos cabeçalhos dentro dele. A Vercel
   não constrói nada nem roda script de instalação.
3. A CLI da Vercel fica fixada pelo lockfile próprio de `.github/deploy/` (fora dos workspaces, para
   não entrar na árvore do repositório), com Dependabot e varredura do OSV.
4. O token é criado pelo dono na Vercel, com escopo do time e prazo de expiração, e guardado só no
   environment. `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` e `SITE_HOST` são variáveis do repositório (o
   `if` do job, que pula a publicação enquanto o projeto não está configurado, não enxerga variável
   de environment) e não são segredo.
5. Um ruleset de branch bloqueia criar, mover ou apagar `refs/heads/v*`, sem exceção, para nenhum
   branch sombrear a tag de release que o marketplace de plugins usa como `ref`. Criado e visto
   recusando o push do admin em 22/09/2026 (`GH013`).

## Consequências

- Boas: nenhum terceiro com escrita no repositório; o que vai ao ar é o mesmo `dist` que os testes
  do site auditaram; o build não depende de script de instalação.
- Ruins:
  - Um segredo de longa duração passa a existir no repositório (no environment), e `gh secret list`
    do repositório continua vazio só porque o segredo é de environment. A rotação é manual e tem de
    acontecer antes da expiração.
  - Sem preview por PR (a *Publicação e Plugin — Spec* §8 pedia): a verificação de PR fica nos
    testes do site no CI.
  - Mais um workflow com permissão de publicar, a revisar junto com o `release.yml`.

## Alternativas rejeitadas

- **Instalar o app mesmo assim:** a condição do ADR-0009 existia justamente para este caso.
- **API REST da Vercel por script próprio:** evitaria a CLI de terceiro, mas seria código novo de
  upload dentro do pipeline, contra a CLI oficial do mesmo fornecedor que recebe o token.
