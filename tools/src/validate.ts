import { lstat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { Finding } from './findings.js';
import { parseFrontmatter } from './frontmatter.js';
import { checkAllowedToolsKey, scanAgency } from './rules/agency.js';
import { checkDisclaimer } from './rules/disclaimer.js';
import { checkLinks, checkScripts, checkStructure } from './rules/filesystem.js';
import { checkDescription, checkMetadata, checkName } from './rules/frontmatter-fields.js';
import { checkNorms } from './rules/norms.js';
import { scanPersonalData } from './rules/personal-data.js';
import { splitLines } from './text.js';
import { readText, walkTree, type Entry } from './tree.js';

export type { Finding, RuleCode } from './findings.js';
export { RULE_CODES } from './findings.js';

const RETIRED_FILE = 'retiradas.txt';

// Valida uma raiz de skills no formato <raiz>/<area>/<nome>/. Devolve os achados ordenados por
// arquivo e linha; lista vazia significa que tudo passou. Erro inesperado sobe como exceção.
export async function validateSkillsRoot(rootArg: string): Promise<Finding[]> {
  // resolve() tira a barra final: com ela, o lstat seguiria um link simbólico na raiz.
  const root = resolve(rootArg);
  const rootStats = await lstat(root);
  if (rootStats.isSymbolicLink() || !rootStats.isDirectory()) {
    throw new Error(`a raiz de skills não é uma pasta (link simbólico não é seguido): ${rootArg}`);
  }
  const entries = await walkTree(root);
  const findings = checkLinks(entries);
  const retired = await readRetired(root, entries);

  for (const entry of entries) {
    const depth = entry.path.split('/').length;
    if (depth !== 2) {
      continue;
    }
    if (entry.kind === 'dir') {
      findings.push(...(await validateSkill(root, entry.path, entries, retired)));
    } else if (entry.kind === 'file') {
      findings.push({
        code: 'ESTRUTURA',
        file: entry.path,
        message: 'arquivo solto na pasta de área; cada skill fica em <area>/<nome>/',
      });
    }
  }
  return findings.sort(compareFindings);
}

// Arquivos na raiz (README.md, retiradas.txt) não são skill e não passam pelas regras de conteúdo.
async function readRetired(root: string, entries: readonly Entry[]): Promise<Set<string>> {
  const entry = entries.find((item) => item.path === RETIRED_FILE);
  // Ausente é lista vazia; link simbólico já é acusado por LINK e não é lido.
  if (entry === undefined || entry.kind === 'symlink') {
    return new Set();
  }
  if (entry.kind !== 'file') {
    throw new Error(`${RETIRED_FILE} não é arquivo regular`);
  }
  const text = await readText(join(root, RETIRED_FILE));
  if (text === null) {
    throw new Error(`${RETIRED_FILE} não é arquivo de texto`);
  }
  const names = splitLines(text)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'));
  return new Set(names);
}

async function validateSkill(
  root: string,
  skillDir: string,
  allEntries: readonly Entry[],
  retired: ReadonlySet<string>,
): Promise<Finding[]> {
  const [area = '', folder = ''] = skillDir.split('/');
  const prefix = `${skillDir}/`;
  const entries = new Map<string, Entry>();
  for (const entry of allEntries) {
    if (entry.path.startsWith(prefix)) {
      const path = entry.path.slice(prefix.length);
      entries.set(path, { ...entry, path });
    }
  }

  const findings = [...checkStructure(skillDir, entries), ...checkScripts(skillDir, entries)];

  // Conteúdo de todo arquivo de texto da skill; binário (byte NUL nos primeiros 8 KB) fica de fora.
  const texts = new Map<string, string>();
  for (const entry of entries.values()) {
    if (entry.kind === 'file') {
      const text = await readText(join(root, skillDir, entry.path));
      if (text !== null) {
        texts.set(entry.path, text);
      }
    }
  }

  const agencyFindings: Finding[] = [];
  for (const [path, text] of texts) {
    agencyFindings.push(...scanAgency(`${prefix}${path}`, text));
    findings.push(...scanPersonalData(`${prefix}${path}`, text));
  }
  findings.push(...agencyFindings);

  // Sem SKILL.md a ESTRUTURA já acusa, e as regras que dependem dele não rodam.
  if (entries.get('SKILL.md')?.kind !== 'file') {
    return findings;
  }
  const skillFile = `${prefix}SKILL.md`;
  const skillText = texts.get('SKILL.md');
  if (skillText === undefined) {
    findings.push({ code: 'ESTRUTURA', file: skillFile, message: 'SKILL.md não é arquivo de texto' });
    return findings;
  }

  const skillLines = splitLines(skillText);
  const frontmatter = parseFrontmatter(skillLines);
  if (frontmatter.ok) {
    const ctx = { file: skillFile, area, folder, lineOfKey: frontmatter.lineOfKey };
    findings.push(
      ...checkName(frontmatter.data, retired, ctx),
      ...checkDescription(frontmatter.data, ctx),
      ...checkMetadata(frontmatter.data, ctx),
      ...checkAllowedToolsKey(skillFile, frontmatter.data, frontmatter.lineOfKey(['allowed-tools']), agencyFindings),
    );
  } else {
    // Frontmatter ausente, YAML inválido ou que não é mapa cai em ESTRUTURA, e as regras que
    // dependem dos campos (NOME, DESCRICAO, METADATA) não rodam, para não acusar em cascata.
    findings.push({ code: 'ESTRUTURA', file: skillFile, line: frontmatter.line, message: frontmatter.message });
  }

  findings.push(...checkDisclaimer(skillDir, frontmatter.body));

  // Sem normas.md a ESTRUTURA já acusa; NORMA não roda, para não acusar cada citação em cascata.
  const normsText = texts.get('references/normas.md');
  if (normsText !== undefined) {
    findings.push(...checkNorms(skillDir, skillLines, splitLines(normsText)));
  } else if (entries.get('references/normas.md')?.kind === 'file') {
    findings.push({ code: 'ESTRUTURA', file: `${prefix}references/normas.md`, message: 'normas.md não é arquivo de texto' });
  }
  return findings;
}

function compareFindings(a: Finding, b: Finding): number {
  if (a.file !== b.file) {
    return a.file < b.file ? -1 : 1;
  }
  if (a.line !== b.line) {
    return (a.line ?? 0) - (b.line ?? 0);
  }
  if (a.code !== b.code) {
    return a.code < b.code ? -1 : 1;
  }
  return a.message < b.message ? -1 : a.message > b.message ? 1 : 0;
}
