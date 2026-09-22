# Fase 1 — MVP: estado e evidências

Registro vivo da fase 1. O caminho está em [`planos/fase-1-mvp.md`](planos/fase-1-mvp.md).
Evidência que não está aqui não conta (regra 6 do Roadmap). As camadas são as do plano:
**1** código com testes verdes · **2** cerca demonstrada (a recusa foi vista recusando) ·
**3** artefato real (o que o usuário ou o GitHub enxergam).

## Tempo por bloco: estimado e real

Estimativa da calibração aceita em 21/09/2026. O real vai do início do bloco até o estado estável
(fatia verificada e mergeada), no relógio de parede, com as esperas pelo dono incluídas e
anotadas.

| Bloco | Itens | Estimado | Início | Fim | Real | Observação |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | A1, S1 | 2–3,5 h | 21/09/2026 22:48 | 21/09/2026 23:04 | 16 min | Sem espera pelo dono. Inclui dois PRs mergeados e o exercício da S1 no Claude Code |
| 2 | S2, S3 | 2–4 h | 21/09/2026 23:04 | 21/09/2026 23:19 | 15 min | Dois agentes de pesquisa em paralelo nas fontes (Planalto, gov.br), com conferência por amostragem; dois PRs |
| 3 | C1, C2 | 2,5–4 h | 21/09/2026 23:19 | 21/09/2026 23:43 | 24 min | Inclui a revisão adversarial do C1 (cerca de 10 min de agente) e a correção de A1, A3, A4 e A5 |
| 4 | C3, V1 | 1,5–3 h | 21/09/2026 23:43 | | | C3 fechado às 23:51 (8 min, com o ensaio do V1 nos três agentes). V1 oficial à espera dos logins do dono nas pastas de configuração limpa (P1) |
| 5 | W1, W2 | 3–5 h | 21/09/2026 23:52 | | | Adiantado enquanto o V1 espera os logins |
| 6 | P1, G1 | 2–4 h | 22/09/2026 00:17 | | | P1 adiantado enquanto o V1 e o W2 esperam o dono |

## Estado por item

| Item | Estado | Evidência |
| --- | --- | --- |
| A1 Abertura | ✅ camadas 1 e 2 ([#14](https://github.com/obraforge/obraforge/pull/14)) | ADRs [0007](adr/0007-estado-da-skill.md), [0008](adr/0008-fixture-so-em-texto.md) e [0009](adr/0009-vercel-hobby-e-integracao-com-o-git.md). Validador: `obraforge-estado` e `obraforge-motivo` na lista branca do `metadata`, com as regras de par; binário em `fixtures/` falha com `ESTRUTURA`. Catálogo: `state`, `deprecationReason` e `retired`. Vermelho visto antes do conserto: 13 testes caíram pelo motivo certo, mais 4 de mensagem que acusavam a chave fora da lista em vez da regra nova. 857 testes no `tools` e 26 na `cli` |
| S1 `validar-planilha-orcamentaria` | ✅ mergeada ([#15](https://github.com/obraforge/obraforge/pull/15)); revisão de domínio pendente (P3) | Fixture CSV com os seis erros do exemplo da spec e duas armadilhas que não são erro (arredondamento no 6.2, encargos declarados). Exercício de escrita no Claude Code 2.1.258 em 21/09/2026, sem interação, com pedido que não cita a skill: os seis apontados, nenhum falso positivo, total geral tratado como herança do subtotal 3, aviso presente. Normas: nenhuma citada, o que o `normas.md` declara |
| S2 `checklist-edital` | ✅ mergeada ([#16](https://github.com/obraforge/obraforge/pull/16)); revisão de domínio pendente (P3) | Fixture Markdown: edital sintético com exigências espalhadas (declarações nas condições de participação, na visita técnica e nas disposições gerais), uma atípica (sede ou filial no município, cláusula 8.1) e três armadilhas dentro do limite da lei (atestado de 50% da área, garantia de 1%, índices de 1,0). Artigos da Lei nº 14.133/2021 conferidos no texto compilado do Planalto em 21/09/2026. Exercício de escrita no Claude Code em 21/09/2026: todos os itens com a cláusula, a 8.1 sinalizada com o art. 9º, I, "b", nenhuma armadilha sinalizada, aviso presente |
| S3 `revisar-conformidade-documental` | ✅ mergeada ([#17](https://github.com/obraforge/obraforge/pull/17)); revisão de domínio pendente (P3) | Fixture Markdown: lista de seis documentos de uma obra fictícia com data de referência fixa (15/03/2026), dois vencidos (revisão do PGR, alvará), dois faltantes (ART ou RRT de execução, projeto aprovado) e armadilhas (PCMSO recente, ART de projeto válida no próprio escopo, PGR por profissional habilitado). NR-1, NR-7 e NR-18 conferidas nos PDFs consolidados do gov.br, e as Leis nº 6.496/1977 e nº 12.378/2010 no Planalto, em 21/09/2026. Exercício de escrita no Claude Code: os quatro apontados, PCMSO "a confirmar" (aceito pelo `esperado.md`), aviso presente |
| C1 `add --for` | ✅ camadas 1 e 2 ([#18](https://github.com/obraforge/obraforge/pull/18)) | Oito cercas com teste próprio, cada uma vista recusando (desligada, cai só o teste dela): hash do pacote, link simbólico no caminho, retirada, padrão do nome, depreciada sem `--yes`, `--force`, registro local que é link, caminho do catálogo fora de `skills/<area>/<nome>`. Teste de "sem rede" em `cli/src`. Hash da CLI conferido contra o `sha256` do `catalog.json` gerado pelo `tools`, skill por skill. Exercitado com o artefato compilado numa pasta limpa: `list`, `search`, `add` com e sem `--for`, cópia idêntica, sugestão de nome. Job novo `testes (windows)` no CI, fora do ruleset (P5). **Revisão adversarial própria (lente de segurança e correção, agente `adversario`, 21/09/2026):** nenhum achado alto; os invariantes de hash, gravação fora do destino, sobrescrita, executável, rede, terminal e hash contra o gerador resistiram. A1 (média: versão, área e nome sugerido vindos do catálogo chegavam ao terminal sem `sanitize()`) corrigido com a validação de nome, área e versão na leitura do catálogo e a sanitização nas mensagens; A3 (troca com `--force` relatava falha quando só a cópia antiga não podia ser apagada), A4 (`--yes` também pula a confirmação do `--force`, agora dito na ajuda) e A5 (registro local que é pasta saía com 2; resumo não contava falha do registro) corrigidos, cada um com teste vermelho antes. A2 (`kill -9` no meio da cópia deixa a pasta temporária oculta `.<skill>.obraforge-*`) aceito: a cópia anterior não é destruída, e apagar a sobra numa próxima execução iria contra "nunca apaga o que não instalou" |
| C2 `list`, `search`, interativo | ✅ camadas 1 e 2 ([#18](https://github.com/obraforge/obraforge/pull/18)) | Filtros `--area` e `--fase`, `search` sem caixa e sem acento, modo interativo com entrada simulada nos testes e exercitado num pseudo-terminal real (`script`): escolheu área, skill e ferramenta e instalou. O pseudo-terminal expôs um bug (Ctrl+D derrubava a CLI com stack trace): teste vermelho primeiro, depois o conserto |
| C3 Release `0.1.0` | ✅ camadas 1 a 3 ([#19](https://github.com/obraforge/obraforge/pull/19)) | Revisão de domínio das três skills aprovada pelo dono em 21/09/2026 antes da tag. Tag `v0.1.0` criada em 21/09/2026; workflow [35680883329](https://github.com/obraforge/obraforge/actions/runs/35680883329) verde nos três jobs; npm `latest` = `0.1.0`, atestação SLSA v1 no registro (a lista de atestações levou alguns minutos para aparecer); release [v0.1.0](https://github.com/obraforge/obraforge/releases/tag/v0.1.0) com `obraforge-v0.1.0.cdx.json`. Numa pasta vazia, `npx -y obraforge@0.1.0 list` mostra as três skills e `add validar-planilha-orcamentaria` com `--for claude`, `codex` e `gemini` grava e registra no `obraforge.lock.json` |
| V1 Exercício 3 × 3 | 🟡 ensaio feito; rodada oficial pendente | **Ensaio** (21/09/2026, tarball da release instalado por `add` em pasta limpa, pedido sem o nome da skill): Claude Code e Codex apontaram tudo do `esperado.md` nas três skills, com o aviso; Gemini CLI 0.60.0 parou sem autenticação. A configuração pessoal do dono contaminou o ensaio (o `~/.codex/AGENTS.md` mudou o formato da resposta do Codex; um hook do dono apareceu no Claude Code). **Rodada oficial:** com o pacote publicado e configuração limpa por agente (`CODEX_HOME`, `GEMINI_CLI_HOME`, `CLAUDE_CONFIG_DIR`), decisão do dono em 21/09/2026 |
| W1 Site | ✅ camadas 1 e 2 ([#20](https://github.com/obraforge/obraforge/pull/20)); produção no W2 | `dashboard/` em Astro 7.3.3 estático, Tailwind 4.3.3 e `marked` 18.0.13 (MIT, sem registro no OSV em 21/09/2026). Estrutura e copy pela skill `site` (briefing, mapa aprovado pelo dono, uma página por doc em `docs/site/`); visual pela skill `design`, direção "Prancha" escolhida pelo dono, com guia e tokens em `docs/design/` e `dashboard/src/styles/tokens.css`. Testes sobre o HTML gerado: nada em linha, nada de outro host; cada comando mostrado roda contra a CLI e instala; uma skill maliciosa gerada à parte não vira HTML nem script (vermelho visto desligando o escape de HTML e o filtro de link); `vercel.json` com a CSP e os cabeçalhos. Render real conferido em desktop, celular e modo escuro. Telemetria do Astro desligada no build. Árvore de dependências: licenças permissivas, fora uma LGPL-3.0 (`@img/sharp-libvips`, binário do `sharp` que o Astro traz), que só roda no build e não é distribuída |
| W2 Publicação na Vercel | 🟡 à espera do dono | A integração com o Git caiu pela condição do próprio ADR-0009 (o app pede `Administration` com escrita, conferido na doc oficial e por `gh api apps/vercel`); o app não foi instalado. [ADR-0010](adr/0010-site-publicado-pelo-github-actions.md): `.github/workflows/site.yml` constrói e testa o site e publica só o `dashboard/dist`, no environment `producao` restrito à `main` (criado em 22/09/2026), com a CLI da Vercel 59.25.0 fixada pelo lockfile de `.github/deploy/` (Apache-2.0; 222 dependências permissivas, uma sem licença declarada, `@vercel/cli-auth`, da própria Vercel). Falta o dono: `vercel login`, o token no environment e o projeto |
| P1 Marketplace | ✅ camadas 1 a 3 ([#21](https://github.com/obraforge/obraforge/pull/21)) | `tools/src/marketplace.ts` gera `.claude-plugin/marketplace.json` do catálogo no `npm run catalogo`, e o `--verificar` do job `catalogo` confere os dois arquivos. Um plugin por skill, fonte `git-subdir` em `skills/<area>/<nome>` fixada na tag `v<versão do catálogo>`, `"strict": false`, skill na raiz do plugin. Vermelho visto: os três testes do gerador caíram antes da implementação. `claude plugin validate . --strict` verde (Claude Code 2.1.258). Instalação real numa pasta de configuração temporária (`CLAUDE_CONFIG_DIR`): `claude plugin marketplace add` do repositório local e `claude plugin install checklist-edital@obraforge` buscaram a skill da tag `v0.1.0`, e a cópia no cache tem o mesmo SHA-256 do catálogo (a da CLI). Nome ao invocar: `checklist-edital:checklist-edital`. Fluxo real depois do merge, pelo GitHub: `claude plugin marketplace add obraforge/obraforge` e `install revisar-conformidade-documental@obraforge` gravaram cópia idêntica ao catálogo pelo hash |
| G1 Gate da fase 1 | 🟡 achados corrigidos em PR; fechamento depois do V1 e do W2 | Ver a seção abaixo |

## Autorizações do dono para a execução (21/09/2026)

- O agente mergeia os PRs da fase com `gh pr merge --squash --admin`, só com os seis checks verdes.
- A revisão de domínio das três skills acontece antes da release: nada vai ao npm sem ela.
- Depois da revisão de domínio, o agente cria a tag `v0.1.0`.
- O agente instala o Gemini CLI e atualiza o Codex CLI nas versões estáveis; o login é do dono.

## Desvios do plano

- **C1, hash (21/09/2026):** o plano previa uma implementação só do hash, na `cli`, importada pelo
  `tools`. Os jobs `validar` e `catalogo` do CI compilam só o `tools`, e a importação obrigaria a
  mudar os scripts e a ordem do build. Ficaram duas implementações do mesmo algoritmo, e o teste
  `cli/test/skill-hash.test.ts` confere o hash da CLI contra o `sha256` que o gerador gravou no
  `catalog.json`, em toda skill real, mais um vetor com nome em NFD, ordenação por bytes e arquivo
  oculto. Uma divergência faz todo `add` recusar (fail-closed) e derruba esse teste.
- **W2, forma de deploy (22/09/2026):** a integração com o Git do plano e do ADR-0009 caiu pela
  condição que o próprio ADR fixou; o deploy passou ao GitHub Actions ([ADR-0010](adr/0010-site-publicado-pelo-github-actions.md)).
  Consequência aceita: não há preview por PR; a verificação de PR fica nos testes do site no CI.

## Gate da fase 1 (G1) — verificação adversarial (22/09/2026)

- **Lentes:** normativa (as três skills), segurança (site, plugin, pipeline) e correção (CLI e
  geradores), cada uma num agente `adversario`, e uma contra-refutação por um agente novo sobre os
  achados médios e altos. **Lente externa (Codex): ausente, por decisão do dono** (escolheu as três
  lentes internas; o Codex 0.155.1 está instalado).
- **Contra-refutação:** os nove achados médios e altos foram CONFIRMADOS; nenhum REFUTADO. Severidade
  revista em três: a NR-18 desceu de alta para média (o item usado pela skill não mudou), o motivo
  invisível desceu de média para baixa, e a queda do ADR-0009 subiu de média para alta.
- **O que resistiu:** o renderizador de Markdown do site (64 payloads), os atributos e o JSON-LD, a
  CSP num Chrome real sem `unsafe-inline`, a rede zero no build com a telemetria desligada, a fixação
  do plugin na tag (sem cair para a `main` quando a tag não existe), os invariantes do `add`, e a
  release `0.1.0` idêntica ao repositório.

| Achado | Lente | Severidade | Decisão |
| --- | --- | --- | --- |
| Pergunta de skill depreciada antes do aviso e do motivo, no terminal; modo interativo sem marcar a depreciada | correção | alta | Corrigido: a pergunta traz o aviso e o motivo; a escolha marca `(depreciada)`. Teste vermelho antes |
| Queda do ADR-0009: o app da Vercel pede `Administration` com escrita | segurança | alta | Corrigido: [ADR-0010](adr/0010-site-publicado-pelo-github-actions.md), deploy pelo GitHub Actions; app não instalado |
| NR-18 e NR-7 com a portaria errada no `normas.md` da S3 | normativa | média e baixa | Corrigido nos PDFs vigentes: NR-18 com redação da SEPRT 3.733/2020 e última alteração MTE 836/2026; NR-7 com redação da SEPRT 6.734/2020 e última alteração MTP 567/2022. Skill 1.0.1 |
| `esperado.md` justificava os 210 m² como "50% da obra" | normativa | média | Corrigido: o limite se mede pela parcela de maior relevância, que o edital não indica; vira ponto a confirmar. Skill 1.1.0 |
| Vínculo do profissional exigido na abertura (6.3, c), contra o art. 67, I | normativa | média | Corrigido: nova referência na skill e segunda atípica no `esperado.md`. Skill 1.1.0, reexercitada no Claude Code: as duas atípicas sinalizadas |
| PCMSO "a confirmar" contraditório entre skill e `esperado.md` | normativa | média | Corrigido no `esperado.md`: "a confirmar" é a resposta certa |
| Versão do plugin igual com conteúdo novo: o usuário do plugin nunca atualiza | segurança | média | Corrigido: a versão leva o começo do hash (`1.0.0+7e7ed863fa01`); `claude plugin validate --strict` verde |
| Branch `refs/heads/v*` sombreia a tag da release no plugin | segurança | média | Corrigido: ruleset de branch `v*` sem exceção, visto recusando o push do admin (`GH013`) |
| Motivo só de caractere invisível aceito | correção | baixa | Corrigido no validador e no gerador |
| Exceção da NR-18 sem "em segurança do trabalho"; ART restrita à engenharia; soma do subtotal com item mal numerado | normativa | baixa | Corrigido (skills 1.0.1) |
| Link relativo com `..` saía da pasta da skill no GitHub | segurança | baixa | Corrigido: o link é resolvido e descartado se sair da pasta |
| Nome fora do padrão sem sugestão; `search ""` listava tudo; resumo antes das causas; `PROJECT_PHASE` em 0; teste do marketplace alegando cobrir retirada | correção | baixa | Corrigidos |
| `kill -9` no meio da cópia deixa a pasta temporária oculta | correção (C1) | baixa | Aceito (ver C1) |
| `fixtures/entrada.svg` com `<script>` passa (é texto); skill chamada `index` colidiria com `/skills` | segurança | baixa | Aceitos e registrados: o site não renderiza a fixture de entrada, e nenhum nome de skill é `index` |
| `list --area` diferencia caixa; `list` só mostra o estado quando depreciada | correção | observação | Aceitos: o plano só pede busca sem caixa no `search` |
