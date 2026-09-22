# Site do obraforge — briefing

Fonte: *Base Técnica · Visão e Decisões*, *Plataforma · Dashboard — Spec* e *Base Técnica ·
Segurança — Spec* (ChatPRD, v1.1 de 13/09/2026), e o [plano da fase 1](../planos/fase-1-mvp.md).
Gravado em 21/09/2026. Páginas novas do mesmo site leem este arquivo e não perguntam de novo.

| Ponto | Resposta |
| --- | --- |
| O que é | O catálogo aberto (MIT) de Agent Skills para AEC no Brasil. Uma skill é uma pasta com `SKILL.md` que o agente de código do usuário carrega sob demanda |
| Para quem | O engenheiro, arquiteto, orçamentista, técnico de SST, fiscal de contrato ou administrativo de obra que já usa um agente de código (Claude Code, Codex, Gemini CLI) no trabalho. Nem todo é programador |
| Diferencial real | Conhecimento de obra escrito, validado, com a norma citada e a fonte, em português, instalável com um comando em qualquer agente compatível. Toda skill tem caso de teste sintético e passa por validador no CI |
| Objeção nº 1 | "Posso confiar no que a skill diz?" Resposta do site: a norma citada com número, ano e fonte; o que a skill **não** faz; o aviso de que não substitui o responsável técnico; o caso de teste à vista |
| Provas disponíveis | Só as que existem no repositório: as três skills, o hash de cada uma, a release no npm com provenance, o código aberto. Nenhum número de uso, cliente ou depoimento: o site não afirma nenhum |
| Ação de conversão | Copiar o comando de instalação de uma skill para a ferramenta do visitante |
| Concorrência e referência | Catálogos de extensões para agentes (ver a pesquisa no mapa). Nenhum é de AEC em português |
| Idioma | Português do Brasil. Sem versão em outro idioma na fase 1 |
| Medição | **Nenhuma.** Sem analytics, sem cookie, sem script de terceiro (Dashboard §3; Segurança §7). Não há evento a instrumentar |
| Bots de IA no `robots.txt` | Decisão do dono (ver o mapa) |
| Fronteira | O site é vitrine do catálogo. Não tem login, formulário, conta nem telemetria, e não fala de produto pago |
