// Gerador do catalog.json (item B2 do plano da fase 0). Independente do validador: gera a
// entrada de qualquer pasta skills/<area>/<nome>/ cujo frontmatter dê para ler, mesmo sem
// fixtures/ ou references/normas.md. Só falha quando não consegue montar a entrada.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AREAS } from './areas.js';
import { MAX_TEXT_FILE_BYTES } from './constants.js';
import { isPlainObject, ownValue, parseFrontmatter, type FrontmatterData } from './frontmatter.js';
import { extractCitations } from './rules/norms.js';
import { splitLines } from './text.js';
import { readBytes, readSkillFile, walkTree, type Entry } from './tree.js';

// Erro esperado (fail-closed): a skill não pôde ser catalogada. Distinto de erro inesperado.
export class CatalogBuildError extends Error {}

export interface CatalogSkillEntry {
  name: string;
  area: string;
  phase: number;
  version: string;
  description: string;
  references: string[];
  path: string;
  sha256: string;
}

export interface Catalog {
  version: string;
  areas: readonly string[];
  skills: CatalogSkillEntry[];
}

// heading de nível 2 (## ...) de references/normas.md; não casa com ### nem com "##" sem espaço.
const HEADING = /^##\s+(.*)$/;
const PHASE_PATTERN = /^\d+$/;

export async function buildCatalog(skillsRoot: string, cliPackagePath: string): Promise<Catalog> {
  const version = await readCliVersion(cliPackagePath);
  const entries = await walkTree(skillsRoot);
  // Skill = pasta na profundidade 2 (<area>/<nome>). Arquivo solto na raiz ou na pasta de área
  // (README.md, retiradas.txt) não é skill e fica de fora, sem gerar falha.
  const skillDirs = entries
    .filter((entry) => entry.kind === 'dir' && entry.path.split('/').length === 2)
    .map((entry) => entry.path);

  const skills: CatalogSkillEntry[] = [];
  for (const skillDir of skillDirs) {
    skills.push(await buildSkillEntry(skillsRoot, skillDir, entries));
  }
  skills.sort(compareEntries);

  return { version, areas: AREAS, skills };
}

export function formatCatalogJson(catalog: Catalog): string {
  return `${JSON.stringify(catalog, null, 2)}\n`;
}

// Diff legível entre o catálogo commitado (oldText; null quando o arquivo não existe) e o
// gerado (newText): prefixo e sufixo comuns descartados, e o miolo mostrado como linhas
// removidas (-) e acrescentadas (+). Não é o diff mínimo, mas é legível e determinístico.
export function diffLines(oldText: string | null, newText: string): string[] {
  const oldArr = oldText === null ? [] : toDisplayLines(oldText);
  const newArr = toDisplayLines(newText);

  let start = 0;
  const maxStart = Math.min(oldArr.length, newArr.length);
  while (start < maxStart && oldArr[start] === newArr[start]) {
    start++;
  }
  let oldEnd = oldArr.length;
  let newEnd = newArr.length;
  while (oldEnd > start && newEnd > start && oldArr[oldEnd - 1] === newArr[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }

  const removed = oldArr.slice(start, oldEnd).map((line) => `- ${line}`);
  const added = newArr.slice(start, newEnd).map((line) => `+ ${line}`);
  return [...removed, ...added];
}

function toDisplayLines(text: string): string[] {
  const lines = text.split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines;
}

async function readCliVersion(cliPackagePath: string): Promise<string> {
  let text: string;
  try {
    text = await readFile(cliPackagePath, 'utf8');
  } catch {
    throw new CatalogBuildError(`${cliPackagePath}: não foi possível ler o package.json da cli`);
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new CatalogBuildError(`${cliPackagePath}: JSON inválido`);
  }
  const version = isPlainObject(data) ? ownValue(data, 'version') : undefined;
  if (typeof version !== 'string' || version.trim() === '') {
    throw new CatalogBuildError(`${cliPackagePath}: campo "version" ausente ou inválido`);
  }
  return version;
}

async function buildSkillEntry(root: string, skillDir: string, allEntries: readonly Entry[]): Promise<CatalogSkillEntry> {
  const prefix = `${skillDir}/`;
  const all: Entry[] = [];
  for (const entry of allEntries) {
    if (entry.path.startsWith(prefix)) {
      all.push({ ...entry, path: entry.path.slice(prefix.length) });
    }
  }
  // Arquivo ou pasta oculta (nome começando com ".", ex.: .DS_Store, .git) não entra no hash nem
  // no restante da varredura: o validador já recusa esse tipo de entrada (ESTRUTURA); o gerador só
  // ignora, para o hash não depender de arquivo que o SO cria sozinho.
  const scoped = all.filter((entry) => !isHidden(entry.path));

  // Fail-closed: link simbólico ou arquivo especial dentro da skill nunca entra no hash, então a
  // skill inteira falha em vez de silenciosamente ignorar a entrada.
  const bad = scoped.find((entry) => entry.kind === 'symlink' || entry.kind === 'other');
  if (bad !== undefined) {
    throw new CatalogBuildError(`${skillDir}: link simbólico ou arquivo especial em "${bad.path}"`);
  }

  const skillAbs = join(root, skillDir);
  let skillText: string | null;
  try {
    // O validador aceita SKILL.md com BOM UTF-8 (readSkillFile já retira o BOM); o gerador lê da
    // mesma forma, para as duas ferramentas concordarem na mesma pasta.
    const content = await readSkillFile(join(skillAbs, 'SKILL.md'), { binary: false, maxBytes: MAX_TEXT_FILE_BYTES });
    skillText = content.kind === 'text' ? content.text : null;
  } catch {
    skillText = null;
  }
  if (skillText === null) {
    throw new CatalogBuildError(`${skillDir}: SKILL.md ausente ou ilegível`);
  }
  const frontmatter = parseFrontmatter(splitLines(skillText));
  if (!frontmatter.ok) {
    throw new CatalogBuildError(`${skillDir}: frontmatter inválido (${frontmatter.message})`);
  }

  const name = requireString(frontmatter.data, 'name', skillDir, 'name');
  const description = requireString(frontmatter.data, 'description', skillDir, 'description');
  const metadata = ownValue(frontmatter.data, 'metadata');
  if (!isPlainObject(metadata)) {
    throw new CatalogBuildError(`${skillDir}: metadata ausente ou não é mapa`);
  }
  const area = requireString(metadata, 'obraforge-area', skillDir, 'metadata.obraforge-area');
  const phaseRaw = requireString(metadata, 'obraforge-fase', skillDir, 'metadata.obraforge-fase');
  if (!PHASE_PATTERN.test(phaseRaw)) {
    throw new CatalogBuildError(`${skillDir}: metadata.obraforge-fase não é um número inteiro`);
  }
  const version = requireString(metadata, 'obraforge-versao', skillDir, 'metadata.obraforge-versao');

  const sha256 = await hashSkillFiles(skillAbs, scoped);
  const references = await readReferences(skillAbs, scoped);

  return {
    name,
    area,
    phase: Number(phaseRaw),
    version,
    description,
    references,
    path: `skills/${skillDir}`,
    sha256,
  };
}

// Qualquer segmento do caminho relativo à skill começando com "." (arquivo oculto, ou dentro de
// uma pasta oculta, ex.: ".git/config").
function isHidden(path: string): boolean {
  return path.split('/').some((segment) => segment.startsWith('.'));
}

function requireString(data: FrontmatterData, key: string, skillDir: string, label: string): string {
  const value = ownValue(data, key);
  if (typeof value !== 'string' || value.trim() === '') {
    throw new CatalogBuildError(`${skillDir}: falta ${label}`);
  }
  return value;
}

// Hash da skill: todos os arquivos (não pastas), ordenados pelos bytes UTF-8 do caminho relativo
// POSIX, normalizado em NFC (Buffer.compare, não comparação de string JS). Cada linha é
// "caminho\0sha256hex\n" dos bytes crus do arquivo; o sha256 da skill é o sha256 hex da
// concatenação dessas linhas. O caminho usado na linha (e na ordenação) é sempre a forma NFC,
// porque é a forma que o git grava; a leitura do arquivo em si usa o caminho como o sistema de
// arquivos devolveu (`diskPath`), que pode estar em NFD (ex.: HFS+/APFS antigo). Um mesmo nome
// visível criado em NFD ou em NFC produz, assim, o mesmo hash.
async function hashSkillFiles(skillAbs: string, scoped: readonly Entry[]): Promise<string> {
  const files = scoped
    .filter((entry) => entry.kind === 'file')
    .map((entry) => ({ diskPath: entry.path, nfcPath: entry.path.normalize('NFC') }));
  const sorted = [...files].sort((a, b) => compareBytes(a.nfcPath, b.nfcPath));
  const lines: Buffer[] = [];
  for (const file of sorted) {
    const bytes = await readBytes(join(skillAbs, file.diskPath));
    const fileHash = createHash('sha256').update(bytes).digest('hex');
    lines.push(Buffer.from(`${file.nfcPath}\0${fileHash}\n`, 'utf8'));
  }
  return createHash('sha256').update(Buffer.concat(lines)).digest('hex');
}

function compareBytes(a: string, b: string): number {
  return Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

// references: a chave canônica (a mesma que a regra NORMA usa para casar citação) de cada heading
// "## " de references/normas.md, na ordem do arquivo, sem duplicatas. Um heading que não gera
// chave (não casa com nenhuma forma de citação reconhecida) fica de fora. Lista vazia se o
// arquivo não existir, não for arquivo regular, ou não for texto que o validador aceitaria. A
// leitura é a mesma do validador (readSkillFile, que tira o BOM UTF-8), para a entrada da
// primeira linha não sumir de references quando o arquivo tem BOM.
async function readReferences(skillAbs: string, scoped: readonly Entry[]): Promise<string[]> {
  const normsEntry = scoped.find((entry) => entry.path === 'references/normas.md');
  if (normsEntry === undefined || normsEntry.kind !== 'file') {
    return [];
  }
  const content = await readSkillFile(join(skillAbs, 'references/normas.md'), { binary: false, maxBytes: MAX_TEXT_FILE_BYTES });
  if (content.kind !== 'text') {
    return [];
  }
  const references: string[] = [];
  const seen = new Set<string>();
  for (const line of splitLines(content.text)) {
    const match = HEADING.exec(line);
    if (match === null) {
      continue;
    }
    for (const citation of extractCitations([(match[1] ?? '').trim()])) {
      if (!seen.has(citation.key)) {
        seen.add(citation.key);
        references.push(citation.key);
      }
    }
  }
  return references;
}

// Ordem: pela posição da área em areas.ts; área desconhecida (fora da lista fechada) vai depois
// das conhecidas, por nome; dentro do mesmo grupo, por nome (bytes UTF-8).
function areaRank(area: string): number {
  const index = (AREAS as readonly string[]).indexOf(area);
  return index === -1 ? Number.POSITIVE_INFINITY : index;
}

function compareEntries(a: CatalogSkillEntry, b: CatalogSkillEntry): number {
  const rankA = areaRank(a.area);
  const rankB = areaRank(b.area);
  if (rankA !== rankB) {
    return rankA - rankB;
  }
  if (!Number.isFinite(rankA)) {
    const byArea = compareBytes(a.area, b.area);
    if (byArea !== 0) {
      return byArea;
    }
  }
  return compareBytes(a.name, b.name);
}
