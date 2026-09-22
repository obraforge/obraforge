# Página: `/skills/<nome>`

**Objetivo:** mostrar que a skill serve e é confiável, e entregar o comando. **Conversão:** copiar
o comando.

**SEO:** title `{nome} — obraforge`; meta description = a primeira frase da `description`.
JSON-LD: `SoftwareSourceCode` (nome, descrição, versão, licença MIT, `codeRepository`) e
`BreadcrumbList`. Slug: o nome da skill.

## Seções, em ordem (princípio 1 do mapa)

1. **O que confere.** H1 com o nome; a `description` inteira; área (link para `/areas/<tag>`),
   fase, versão e estado. Skill depreciada mostra, logo abaixo, `Depreciada: {motivo}`.
2. **Por que confiar.**
   - `Normas citadas`: cada entrada do `references/normas.md` com número, título, ano e o link da
     fonte. Sem entrada: `Esta skill não cita norma.`
   - O aviso, em destaque: `Esta skill não substitui o responsável técnico. O resultado deve ser
     conferido e assumido por profissional habilitado, com ART ou RRT quando exigido.`
3. **Instalar.** Um comando por ferramenta, com botão `Copiar`:
   - Claude Code: `npx obraforge@latest add {nome} --for claude`
   - Codex: `npx obraforge@latest add {nome} --for codex`
   - Gemini CLI: `npx obraforge@latest add {nome} --for gemini`
   - Outro agente compatível: `npx obraforge@latest add {nome} --for agents`
   - Linha abaixo: `Rode na pasta do projeto. Antes de gravar, a CLI confere o hash da skill contra
     o catálogo da versão.`
   - Skill retirada não chega a ter página (a pasta sai do catálogo).
4. **O caso de teste.** `A skill é testada contra um caso inventado, sem dado real.` O
   `esperado.md` renderizado (o que a skill precisa apontar) e o nome do arquivo de entrada, com
   link para ele no GitHub.
5. **A skill inteira.** O corpo do `SKILL.md`, renderizado sem HTML cru, e o link `Ver no
   GitHub`.

**Mídia:** nenhuma.
