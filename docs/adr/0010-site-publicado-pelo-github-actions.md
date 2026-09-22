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
3. A publicação usa a API REST da Vercel por um script próprio, sem dependência
   (`tools/src/deploy-site.ts`): sobe cada arquivo por SHA-1 e cria o deploy de produção sem
   framework nem build. O script falha fechado sem token, org ou projeto e com link simbólico na
   pasta do site, e nunca inclui o token numa mensagem de erro.
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
  - O script próprio acompanha a API REST da Vercel; mudança nela quebra a publicação, que falha
    fechada (o site anterior continua no ar).

## Alternativas rejeitadas

- **Instalar o app mesmo assim:** a condição do ADR-0009 existia justamente para este caso.
- **CLI oficial da Vercel fixada por lockfile:** foi a primeira escolha, e o OSV do CI a derrubou: a
  `vercel` 59.25.0 trazia 59 vulnerabilidades conhecidas na própria árvore em 22/09/2026 (2
  críticas, 23 altas, em `tar`, `minimatch`, `js-yaml`, `path-to-regexp` e outras), uma delas no
  pacote `sandbox`, sem versão corrigida. O script próprio é pouco código, testado com uma API de
  mentira, e não traz árvore nenhuma.
