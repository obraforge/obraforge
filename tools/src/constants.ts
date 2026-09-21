// Constantes versionadas do validador. Mudar qualquer uma delas é decisão de PR, com revisão.

// Fase atual do projeto (Roadmap). A regra SCRIPTS recusa `scripts/` enquanto for menor que 3.
export const PROJECT_PHASE: number = 0;

// Aviso-padrão que todo SKILL.md traz, como linha inteira, no corpo. O template em
// docs/template-skill/SKILL.md tem de conter exatamente este texto (há teste que confere).
export const AVISO_PADRAO =
  '> **Aviso:** esta skill não substitui o responsável técnico. O resultado deve ser conferido e assumido por profissional habilitado, com ART ou RRT quando exigido.';

// Lista inicial da regra AGENCIA: termos proibidos em qualquer arquivo de texto da skill,
// comparados sem diferenciar maiúsculas e com borda de palavra onde o termo começa ou termina
// em letra ou dígito. Ampliação só por PR.
export const AGENCIA_TERMS: readonly string[] = [
  'hook',
  'hooks',
  'settings.json',
  'allowed-tools',
  'allowedTools',
  'permissionMode',
  'bypassPermissions',
  'dangerously-skip-permissions',
  'curl',
  'wget',
  'Invoke-WebRequest',
  'fetch(',
];
