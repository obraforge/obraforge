import { lstat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { BINARY_EXTENSIONS, MAX_BINARY_FILE_BYTES, MAX_TEXT_FILE_BYTES } from './constants.js';
import type { Finding } from './findings.js';
import { parseFrontmatter } from './frontmatter.js';
import { checkFrontmatterKeys, scanAgency } from './rules/agency.js';
import { checkDisclaimer } from './rules/disclaimer.js';
import { checkLinks, checkScripts, checkStructure } from './rules/filesystem.js';
import { checkDescription, checkMetadata, checkName, checkOptionalFields } from './rules/frontmatter-fields.js';
import { checkNorms } from './rules/norms.js';
import { scanPersonalData } from './rules/personal-data.js';
import { splitLines } from './text.js';
import { extensionOf, readSkillFile, readText, walkTree, type Entry } from './tree.js';

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

  let findings = [...checkStructure(skillDir, entries), ...checkScripts(skillDir, entries)];

  // Conteúdo de todo arquivo de texto da skill. Só arquivo da lista de binários fica de fora (e só
  // o tamanho dele é conferido). Todo outro arquivo ou entra em `texts` ou é acusado aqui: nunca
  // sai da varredura calado.
  const texts = new Map<string, string>();
  for (const entry of entries.values()) {
    if (entry.kind !== 'file') {
      continue;
    }
    const binary = BINARY_EXTENSIONS.includes(extensionOf(entry.path));
    const content = await readSkillFile(join(root, skillDir, entry.path), {
      binary,
      maxBytes: binary ? MAX_BINARY_FILE_BYTES : MAX_TEXT_FILE_BYTES,
    });
    if (content.kind === 'text') {
      texts.set(entry.path, content.text);
    } else if (content.kind === 'not-utf8') {
      findings.push({
        code: 'ESTRUTURA',
        file: `${prefix}${entry.path}`,
        message: 'arquivo não é texto UTF-8 nem tem extensão binária aceita (lista em tools/src/constants.ts)',
      });
    } else if (content.kind === 'too-large') {
      findings.push({
        code: 'ESTRUTURA',
        file: `${prefix}${entry.path}`,
        message: binary
          ? `arquivo binário com mais de 5 MiB (${MAX_BINARY_FILE_BYTES} bytes)`
          : `arquivo de texto com mais de 1 MiB (${MAX_TEXT_FILE_BYTES} bytes)`,
      });
    }
  }

  for (const [path, text] of texts) {
    findings.push(...scanAgency(`${prefix}${path}`, text), ...scanPersonalData(`${prefix}${path}`, text));
  }

  // Sem SKILL.md a ESTRUTURA já acusa, e as regras que dependem dele não rodam.
  if (entries.get('SKILL.md')?.kind !== 'file') {
    return findings;
  }
  const skillFile = `${prefix}SKILL.md`;
  const skillText = texts.get('SKILL.md');
  // SKILL.md fora de `texts` já foi acusado na leitura (.md não está na lista de binários).
  if (skillText === undefined) {
    return findings;
  }

  const skillLines = splitLines(skillText);
  const frontmatter = parseFrontmatter(skillLines);
  if (frontmatter.ok) {
    const ctx = { file: skillFile, area, folder, lineOfKey: frontmatter.lineOfKey };
    // Um achado por linha: na linha de uma chave fora da lista branca, o achado da chave
    // substitui o da varredura de texto (ex.: "allowed-tools: Bash(curl *)").
    const keyFindings = checkFrontmatterKeys(skillFile, frontmatter.data, frontmatter.lineOfKey);
    const keyLines = new Set(keyFindings.map((finding) => finding.line));
    findings = findings.filter((finding) => !(finding.code === 'AGENCIA' && finding.file === skillFile && keyLines.has(finding.line)));
    findings.push(
      ...checkName(frontmatter.data, retired, ctx),
      ...checkDescription(frontmatter.data, ctx),
      ...checkMetadata(frontmatter.data, ctx),
      ...checkOptionalFields(frontmatter.data, ctx),
      ...keyFindings,
    );
  } else {
    // Frontmatter ausente, YAML inválido ou que não é mapa cai em ESTRUTURA, e as regras que
    // dependem dos campos (NOME, DESCRICAO, METADATA) não rodam, para não acusar em cascata.
    findings.push({ code: 'ESTRUTURA', file: skillFile, line: frontmatter.line, message: frontmatter.message });
  }

  findings.push(...checkDisclaimer(skillDir, frontmatter.body));

  // Sem normas.md legível a ESTRUTURA já acusa (falta o arquivo, ou ele foi acusado na leitura);
  // NORMA não roda, para não acusar cada citação em cascata.
  const normsText = texts.get('references/normas.md');
  if (normsText !== undefined) {
    findings.push(...checkNorms(skillDir, skillLines, splitLines(normsText)));
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
