# Site do obraforge — mapa (fase 1)

As páginas e rotas vêm da *Plataforma · Dashboard — Spec* §4. Este mapa diz o trabalho de cada
uma. Tudo é gerado do `catalog.json` e dos arquivos das skills da mesma revisão da `main`; nada
sobre skill é digitado à mão (Dashboard §11, critério 1).

## Pesquisa de estrutura (21/09/2026)

| Referência | O que a página do item faz | Acerta | Erra para o engenheiro |
| --- | --- | --- | --- |
| [skills.sh](https://skills.sh) | Título, categoria, **comando `npx` no topo**, resumo, corpo do `SKILL.md`, relacionadas, instalações, estrelas, badges de auditoria | Comando a um clique; o `SKILL.md` inteiro à vista | Abre com comando de terminal; confiança medida por popularidade |
| [claude.com/plugins](https://claude.com/plugins) | Cards com nome, descrição, "verified", instalações, "Works with"; filtros por compatibilidade | Filtro por ferramenta; estado vazio claro | Instalações como prova de qualidade |
| [aitmpl.com](https://www.aitmpl.com) | Categorias por tipo de artefato (skill, agent, hook, MCP); estatísticas na home | Busca rápida | Taxonomia do agente, não do trabalho; conteúdo atrás de JavaScript |
| [agentskills.io](https://agentskills.io) | Documentação do padrão, com a lista de clientes compatíveis | Explica o formato | Não é catálogo |
| [raycast.com/store](https://www.raycast.com/store) | Nome, descrição, autor, botão de instalar, estatísticas | Descrição antes do botão | Fora do mundo de agentes |

**Princípios que este site segue:**

1. A página da skill abre com **o que ela confere**, em linguagem de obra. O comando vem depois.
2. A confiança é normativa, não de popularidade: a norma citada com a fonte, o que a skill não faz
   e o caso de teste. O site não mostra estrela nem contagem de instalação.
3. A busca aceita o vocabulário do canteiro (edital, orçamento, PGR), porque procura na descrição.
4. O aviso de que a skill não substitui o responsável técnico aparece na página, fora do corpo do
   `SKILL.md`.
5. As áreas são as do trabalho (orçamento, licitação, SST), não os tipos de artefato.

## Páginas

| Rota | Trabalho no funil | O que pede do visitante | Para onde leva |
| --- | --- | --- | --- |
| `/` | Dizer em uma frase o que é o obraforge e por que confiar, e levar a uma skill | Escolher uma skill ou uma área | `/skills/<nome>`, `/skills`, `/areas/<tag>` |
| `/skills` | Achar a skill certa: lista inteira, busca por texto e filtro por área e fase | Buscar ou filtrar | `/skills/<nome>` |
| `/skills/<nome>` | Convencer que a skill serve e é confiável, e entregar o comando. Ordem: o que confere → normas com fonte, o que não faz, aviso → comando por ferramenta → o caso de teste → o `SKILL.md` inteiro | Escolher a ferramenta e copiar o comando | O próprio agente do visitante; o código no GitHub |
| `/areas/<tag>` | Mostrar o que existe numa área (só áreas com skill publicada) | Escolher uma skill | `/skills/<nome>` |
| `/sobre` | Explicar o projeto, a fronteira (o que não é), a segurança e a privacidade, e como contribuir | Ler; contribuir pelo GitHub | GitHub, `CONTRIBUTING.md`, `SECURITY.md` |

## O que não existe, e por quê

- **Página de docs de instalação por ferramenta, contribuidores, perfis, MCPs, Stack Builder:**
  fases 2 e 4 (Dashboard §2).
- **Skill planejada:** fase 2 (plano da fase 1, §5).
- **Busca no servidor, conta, formulário, newsletter:** a fronteira da D-006 e a regra "sem
  formulário, sem telemetria".
- **Blog:** fora do escopo da fase 1.

## Navegação

- Topo: obraforge (vai para `/`) · Skills · Sobre · GitHub.
- Rodapé: licença MIT, versão do catálogo mostrada no site, link para o código, para o
  `SECURITY.md` e para a nota de privacidade em `/sobre#privacidade`.
- A 1 clique de qualquer página: a lista de skills.

## Legal (LGPD)

- **Privacidade:** o site não coleta dado pessoal, não usa cookie e não carrega script de terceiro.
  A nota fica em `/sobre#privacidade`. A Vercel registra logs de acesso do servidor por conta
  própria; a nota diz isso sem prometer o que não controla.
- **Termos de uso:** a licença MIT do conteúdo e do código, e o aviso de que a skill não substitui
  o responsável técnico, em `/sobre`. Sem termos próprios, porque não há serviço nem conta.
- **Cookies e consentimento:** não se aplicam: nenhum cookie é definido. Por isso não há banner.

## Funil

Busca no Google ou numa IA, link de colega ou do GitHub → `/` ou direto numa `/skills/<nome>` →
escolhe a ferramenta → copia o comando → roda `npx obraforge add` no próprio projeto.

## SEO e GEO (comum a todas as páginas)

- HTML estático, conteúdo inteiro sem depender de JavaScript; `sitemap.xml`; canonical por página.
- JSON-LD: `WebSite` na home; `SoftwareSourceCode` na página da skill (código aberto, licença,
  versão); `BreadcrumbList` nas páginas internas.
- `llms.txt` na raiz, apontando para as páginas das skills e para o `catalog.json`.
- A mesma frase-definição em todo o site: "O obraforge é o catálogo aberto de Agent Skills para
  arquitetura, engenharia e construção no Brasil."

## Decisões do dono (21/09/2026)

- **Mapa aprovado.**
- **Bots de IA no `robots.txt`** (GPTBot, ClaudeBot, PerplexityBot e afins): **liberados**. O
  catálogo é aberto, e ser citado por assistente é um dos caminhos pelos quais o engenheiro
  descobre a skill.
