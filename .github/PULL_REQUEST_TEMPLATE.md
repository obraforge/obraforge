## O que este PR muda

<!-- Descreva a mudança e, se for skill nova ou alterada, a issue de proposta relacionada. -->

## Checklist de segurança de conteúdo (OWASP LLM Top 10 — skills)

Marque só o que se aplica; se o PR não toca em `skills/`, marque como não aplicável (N/A) no comentário.

- [ ] A skill **confere, estrutura, explica ou dá modelo** — não produz o entregável de engenharia nem a apuração fiscal fim a fim (LLM06)
- [ ] A fixture (`fixtures/entrada.*`, `fixtures/esperado.md`) é **sintética**, sem dado real de cliente, obra ou pessoa (LLM02)
- [ ] Toda citação normativa tem **número, título, ano e fonte** em `references/normas.md`; norma paga só indica onde adquirir, sem transcrever texto (LLM09)
- [ ] A skill **não** referencia hook, `settings.json`, permissão do agente (`allowed-tools`) nem comando de rede (`curl`, `wget`, `fetch(` etc.) (LLM06)
- [ ] A skill **não** tem pasta `scripts/` — ou, se tem, o projeto já está na fase 3 e o PR tem duas aprovações de mantenedor registradas (LLM01)
- [ ] A skill contém o **aviso-padrão** de que não substitui o responsável técnico (LLM09)

## Checklist de dependência nova (se este PR adiciona uma dependência)

- [ ] Versão **estável** conferida no registro oficial (npm ou equivalente) no momento da adoção
- [ ] **OSV.dev** conferido para o pacote e a versão, sem vulnerabilidade aberta alcançável
- [ ] **Licença** conferida na fonte oficial e compatível com MIT (não restringe uso comercial); se restringir, autorização explícita do dono está registrada neste PR

<!-- Versão, resultado do OSV e licença conferidos: -->

## Verificação local

- [ ] `npm ci && npm run build && npm test` rodou verde localmente
