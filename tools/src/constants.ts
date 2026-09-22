// Constantes versionadas do validador. Mudar qualquer uma delas é decisão de PR, com revisão.

// Fase atual do projeto (Roadmap). A regra SCRIPTS recusa `scripts/` enquanto for menor que 3.
export const PROJECT_PHASE: number = 1;

// Extensões de código (em minúsculas) que a regra SCRIPTS recusa em qualquer pasta da skill
// enquanto a fase for menor que 3: nenhum código em skill antes da fase 3.
export const CODE_EXTENSIONS: readonly string[] = [
  '.sh', '.bash', '.zsh', '.ps1', '.psm1', '.bat', '.cmd', '.py', '.js', '.mjs', '.cjs', '.ts', '.rb', '.pl',
  '.php', '.exe', '.dll', '.so', '.dylib', '.jar', '.vbs', '.applescript',
  '.fish', '.ksh', '.csh', '.tcsh', '.command', '.lua', '.awk', '.tcl', '.pyw', '.scpt', '.hta', '.wsf', '.wsh',
  '.jse', '.vbe', '.nu', '.r', '.sql', '.reg', '.msi', '.pkg', '.deb', '.rpm', '.dmg', '.appimage',
];

// Lista branca de binários (extensões em minúsculas): só arquivo com uma destas extensões fica
// fora da varredura (limitação registrada: o conteúdo dele não é lido) e tem o teto de
// MAX_BINARY_FILE_BYTES. Todo outro arquivo, com qualquer extensão ou sem extensão, tem de ser
// UTF-8 válido, sem byte NUL e sem BOM UTF-16, senão vira ESTRUTURA; e é varrido.
// Ficam de fora de propósito: Excel, Word e PowerPoint com macro (.xlsm, .docm, .pptm), que são
// código executável, e arquivo compactado (.zip), que pode esconder qualquer conteúdo.
export const BINARY_EXTENSIONS: readonly string[] = [
  '.xlsx', '.xls', '.ods', '.docx', '.doc', '.odt', '.pptx', '.pdf', '.png', '.jpg', '.jpeg', '.gif',
  '.webp', '.bmp', '.tif', '.tiff', '.dwg', '.dwf', '.rvt', '.rfa', '.skp',
  // Geoprocessamento (KMZ e shapefile: .shp, .shx, .dbf, .sbn, .sbx), cronograma (MS Project),
  // Excel binário, CAD e BIM (MicroStation, Navisworks, IFC compactado, DWFx, Rhino, ArchiCAD),
  // nuvem de pontos (LAS, LAZ, E57) e foto HEIC.
  '.kmz', '.shp', '.shx', '.dbf', '.sbn', '.sbx', '.mpp', '.mpt', '.xlsb', '.dgn', '.nwd', '.nwc', '.nwf',
  '.las', '.laz', '.e57', '.ifczip', '.dwfx', '.3dm', '.pln', '.heic',
];

// Tetos de tamanho (ESTRUTURA), verificados antes de ler o YAML ou varrer o arquivo, para o custo
// do validador não depender do tamanho do que vem no PR. Frontmatter: o YAML entre as linhas ---,
// em bytes UTF-8. Arquivo de texto: todo arquivo fora da lista de binários. Binário: arquivo da
// lista de binários, conferido só pelo tamanho.
export const MAX_FRONTMATTER_BYTES = 16 * 1024;
export const MAX_TEXT_FILE_BYTES = 1024 * 1024;
export const MAX_BINARY_FILE_BYTES = 5 * 1024 * 1024;

// Aviso-padrão que todo SKILL.md traz, como linha inteira, no corpo. O template em
// docs/template-skill/SKILL.md tem de conter exatamente este texto (há teste que confere).
export const AVISO_PADRAO =
  '> **Aviso:** esta skill não substitui o responsável técnico. O resultado deve ser conferido e assumido por profissional habilitado, com ART ou RRT quando exigido.';

// Lista da regra AGENCIA: termos proibidos em qualquer arquivo de texto da skill, comparados sem
// diferenciar maiúsculas e com borda de palavra onde o termo começa ou termina em letra ou dígito.
// O espaço de um termo de duas palavras casa com qualquer sequência de espaços, inclusive vazia.
// Ampliação só por PR.
// "nc" fica de fora de propósito: "NC" é não conformidade em checklist de obra. "ftp" também:
// servidor FTP de projetos é comum em obra. E "Notification", "Stop", "Setup" e "Elicitation", que
// são eventos de hook mas casariam com texto comum.
// Termos acusados em qualquer grafia menos a toda em maiúsculas, que é sigla: "SCP" é Sociedade em
// Conta de Participação, comum em incorporação imobiliária e na área tributária, e "RCP" é
// reanimação cardiopulmonar, comum em SST. Só a palavra exatamente "SCP" ou "RCP" fica isenta:
// "Scp", "sCp" e "Rcp" executam o comando num sistema de arquivos que não diferencia maiúsculas.
export const AGENCIA_TERMS_EXCEPT_UPPERCASE: readonly string[] = ['scp', 'rcp'];

// Shell chamado com uma opção que contém "c" (-c, -lc, -ec...) executa o texto seguinte. A opção
// é procurada numa janela de 200 caracteres da mesma linha lógica, depois de outras opções e
// argumentos (rules/agency.ts).
export const AGENCIA_SHELLS: readonly string[] = [
  'bash', 'sh', 'zsh', 'dash', 'ksh', 'fish', 'rbash', 'mksh', 'ash', 'csh', 'tcsh',
];

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
  'sftp',
  'rsync',
  'ssh',
  'telnet',
  'git clone',
  'npx',
  'pip install',
  'npm install',
  'pwsh',
  'pip3 install',
  'npm ci',
  'npm i',
  'gh repo clone',
  'gh api',
  'powershell',
  'Start-BitsTransfer',
  'bitsadmin',
  'Net.WebClient',
  'DownloadString',
  'DownloadFile',
  'socat',
  'openssl s_client',
  'tftp',
  'aria2c',
  'rclone',
  // Rodada 3: execução por PowerShell e gerenciadores de pacote, contêiner e Git que baixam código.
  'iex',
  'Invoke-Expression',
  'pipx install',
  'uv add',
  'uv pip',
  'pnpm i',
  'pnpm install',
  'pnpm add',
  'yarn add',
  'bun add',
  'brew install',
  'apt install',
  'apt-get install',
  'docker pull',
  'docker run',
  'gh release download',
  'gh gist clone',
  'git pull',
  'git fetch',
  'git submodule',
  // Configuração do agente
  'settings.local.json',
  'CLAUDE.md',
  'CLAUDE.local.md',
  'AGENTS.md',
  '.mcp.json',
  'mcpServers',
  'PreToolUse',
  'PostToolUse',
  'PostToolUseFailure',
  'UserPromptSubmit',
  'SessionStart',
  'SessionEnd',
  'SubagentStop',
  'PreCompact',
  'PermissionRequest',
  '.claude.json',
  'mcp.json',
  // Rodada 3: eventos de hook da doc oficial (https://code.claude.com/docs/en/hooks) com nome em
  // CamelCase distintivo. Stop, Setup, Notification e Elicitation ficam de fora: casariam com texto
  // comum.
  'UserPromptExpansion',
  'PermissionDenied',
  'PostToolBatch',
  'MessageDisplay',
  'SubagentStart',
  'TaskCreated',
  'TaskCompleted',
  'StopFailure',
  'TeammateIdle',
  'InstructionsLoaded',
  'ConfigChange',
  'CwdChanged',
  'DirectoryAdded',
  'FileChanged',
  'WorktreeCreate',
  'WorktreeRemove',
  'PostCompact',
  'PreModelSwitch',
  'PostModelSwitch',
  'ElicitationResult',
];
