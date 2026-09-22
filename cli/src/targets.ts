// Destino de cada ferramenta no projeto (Plataforma · CLI — Spec §3, conferido na documentação
// oficial de cada uma em 21/09/2026; ver o plano da fase 1, §3). O Claude Code não lê
// .agents/skills/; Codex e Gemini CLI leem.
import { lstatSync } from 'node:fs';
import { join } from 'node:path';

export const TOOLS = ['claude', 'codex', 'gemini', 'agents'] as const;
export type Tool = (typeof TOOLS)[number];

export const TOOL_BASE: Readonly<Record<Tool, readonly [string, string]>> = {
  claude: ['.claude', 'skills'],
  codex: ['.agents', 'skills'],
  gemini: ['.agents', 'skills'],
  agents: ['.agents', 'skills'],
};

export const TOOL_LABEL: Readonly<Record<Tool, string>> = {
  claude: 'Claude Code',
  codex: 'Codex',
  gemini: 'Gemini CLI',
  agents: 'destino genérico',
};

export function isTool(value: string): value is Tool {
  return (TOOLS as readonly string[]).includes(value);
}

// Pasta do agente na pasta atual, na ordem da spec. lstat: um link simbólico também é sinal (e o
// add recusa depois, ao conferir o caminho de destino).
const SIGNALS: ReadonlyArray<readonly [string, Tool]> = [
  ['.claude', 'claude'],
  ['.agents', 'agents'],
  ['.gemini', 'gemini'],
];

export type Detection =
  | { readonly kind: 'found'; readonly tool: Tool }
  | { readonly kind: 'none' }
  | { readonly kind: 'ambiguous'; readonly tools: readonly Tool[] };

export function detectTool(cwd: string): Detection {
  const found = SIGNALS.filter(([dir]) => exists(join(cwd, dir))).map(([, tool]) => tool);
  if (found.length === 0) {
    return { kind: 'none' };
  }
  // Sinais que levam ao mesmo destino (.agents/ e .gemini/) não são ambiguidade.
  const destinations = new Set(found.map((tool) => TOOL_BASE[tool].join('/')));
  const [first] = found;
  if (destinations.size === 1 && first !== undefined) {
    return { kind: 'found', tool: first };
  }
  return { kind: 'ambiguous', tools: found };
}

function exists(path: string): boolean {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

// Como o agente encontra a skill depois do add (§3 do plano: doc oficial de cada ferramenta).
// Texto provisório até o exercício do V1.
export function nextSteps(tool: Tool, name: string): string {
  switch (tool) {
    case 'claude':
      return `O Claude Code encontra a skill na sessão aberta; se a pasta .claude/skills não existia quando a sessão começou, reinicie. Peça pelo assunto ou use /${name}.`;
    case 'codex':
      return `O Codex detecta a skill sozinho; se ela não aparecer, reinicie o Codex. Peça pelo assunto ou use $${name}.`;
    case 'gemini':
      return 'No Gemini CLI, rode /skills reload ou reinicie a sessão. Peça pelo assunto.';
    case 'agents':
      return 'Codex e Gemini CLI leem esta pasta. O Claude Code não lê: para ele, use --for claude.';
  }
}
