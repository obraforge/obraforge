// Constantes versionadas do validador. Mudar qualquer uma delas é decisão de PR, com revisão.

// Fase atual do projeto (Roadmap). A regra SCRIPTS recusa `scripts/` enquanto for menor que 3.
export const PROJECT_PHASE: number = 0;

// Extensões de código (em minúsculas) que a regra SCRIPTS recusa em qualquer pasta da skill
// enquanto a fase for menor que 3: nenhum código em skill antes da fase 3.
export const CODE_EXTENSIONS: readonly string[] = [
  '.sh', '.bash', '.zsh', '.ps1', '.psm1', '.bat', '.cmd', '.py', '.js', '.mjs', '.cjs', '.ts', '.rb', '.pl',
  '.php', '.exe', '.dll', '.so', '.dylib', '.jar', '.vbs', '.applescript',
];

// Extensões de texto (em minúsculas): o arquivo tem de ser UTF-8, senão vira ESTRUTURA. Arquivo
// de outra extensão com byte NUL nos primeiros 8 KB é binário e fica fora da varredura.
export const TEXT_EXTENSIONS: readonly string[] = [
  '.md', '.markdown', '.txt', '.csv', '.tsv', '.json', '.yaml', '.yml', '.xml', '.html', '.htm',
];

// Tetos de tamanho (ESTRUTURA), verificados antes de ler o YAML ou varrer o arquivo, para o custo
// do validador não depender do tamanho do que vem no PR. Frontmatter: o YAML entre as linhas ---,
// em bytes UTF-8. Arquivo de texto: todo arquivo que seria varrido.
export const MAX_FRONTMATTER_BYTES = 16 * 1024;
export const MAX_TEXT_FILE_BYTES = 1024 * 1024;

// Aviso-padrão que todo SKILL.md traz, como linha inteira, no corpo. O template em
// docs/template-skill/SKILL.md tem de conter exatamente este texto (há teste que confere).
export const AVISO_PADRAO =
  '> **Aviso:** esta skill não substitui o responsável técnico. O resultado deve ser conferido e assumido por profissional habilitado, com ART ou RRT quando exigido.';

// Lista da regra AGENCIA: termos proibidos em qualquer arquivo de texto da skill, comparados sem
// diferenciar maiúsculas e com borda de palavra onde o termo começa ou termina em letra ou dígito.
// O espaço de um termo de duas palavras casa com qualquer sequência de espaços. Ampliação só por PR.
// "nc" fica de fora de propósito: "NC" é não conformidade em checklist de obra.
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
  // Rede e execução
  'WebFetch',
  'WebSearch',
  'Invoke-RestMethod',
  'iwr',
  'irm',
  'certutil',
  'netcat',
  'ncat',
  'scp',
  'sftp',
  'rsync',
  'ssh',
  'telnet',
  'git clone',
  'npx',
  'pip install',
  'npm install',
  'bash -c',
  'sh -c',
  'pwsh',
  // Configuração do agente
  'settings.local.json',
  'CLAUDE.md',
  'AGENTS.md',
  '.mcp.json',
  'mcpServers',
  'PreToolUse',
  'PostToolUse',
  'UserPromptSubmit',
  'SessionStart',
];
