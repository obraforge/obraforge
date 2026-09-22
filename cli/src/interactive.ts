// Modo interativo (item C2 do plano da fase 1): `obraforge` sem argumento, num terminal. Escolhe
// área, skill e ferramenta, confirma, e cai no mesmo caminho do add.
import { addCommand, type AddResult, type Prompter } from './add-command.js';
import type { Catalog } from './catalog.js';
import { EXIT_SUCCESS, EXIT_USAGE_ERROR } from './exit-codes.js';
import { sanitize } from './sanitize.js';
import { detectTool, TOOL_BASE, TOOL_LABEL, TOOLS } from './targets.js';

export interface Io {
  question(text: string): Promise<string>;
  write(text: string): void;
}

export function prompterFor(io: Io): Prompter {
  return {
    async confirm(question) {
      const answer = (await io.question(`${question} (s/N) `)).trim().toLowerCase();
      return answer === 's' || answer === 'sim';
    },
    async choose(question, options) {
      io.write(question);
      options.forEach((option, index) => io.write(`  ${index + 1}. ${option}`));
      const answer = Number((await io.question('Número: ')).trim());
      return Number.isInteger(answer) && answer >= 1 && answer <= options.length ? answer - 1 : undefined;
    },
  };
}

export async function interactive(io: Io, catalog: Catalog, cwd: string, packageRoot: string): Promise<AddResult> {
  const cancel = (message: string): AddResult => ({ code: EXIT_USAGE_ERROR, stdout: [], stderr: [message] });
  if (catalog.skills.length === 0) {
    return { code: EXIT_SUCCESS, stdout: ['Nenhuma skill publicada nesta versão.'], stderr: [] };
  }
  const prompter = prompterFor(io);
  const areas = [...new Set(catalog.skills.map((skill) => skill.area))];
  const area = areas[(await prompter.choose('Escolha a área:', areas.map(sanitize))) ?? -1];
  if (area === undefined) {
    return cancel('Escolha inválida. Nada foi instalado.');
  }
  const skills = catalog.skills.filter((skill) => skill.area === area);
  const skill = skills[(await prompter.choose('Escolha a skill:', skills.map((item) => `${sanitize(item.name)} — ${sanitize(item.description)}`))) ?? -1];
  if (skill === undefined) {
    return cancel('Escolha inválida. Nada foi instalado.');
  }
  const detection = detectTool(cwd);
  const suggested = detection.kind === 'found' ? detection.tool : undefined;
  const labels = TOOLS.map((tool) => `${TOOL_LABEL[tool]} (${TOOL_BASE[tool].join('/')}/)${tool === suggested ? ' — detectado nesta pasta' : ''}`);
  const tool = TOOLS[(await prompter.choose('Para qual ferramenta?', labels)) ?? -1];
  if (tool === undefined) {
    return cancel('Escolha inválida. Nada foi instalado.');
  }
  if (!(await prompter.confirm(`Instalar ${sanitize(skill.name)} ${sanitize(skill.version)} em ${TOOL_BASE[tool].join('/')}/${sanitize(skill.name)}/?`))) {
    return cancel('Nada foi instalado.');
  }
  return addCommand({ names: [skill.name], tool, yes: false, force: false, cwd, catalog, packageRoot, prompter });
}
