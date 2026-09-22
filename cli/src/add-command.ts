// Comando add (item C1 do plano da fase 1): confere o hash da skill embutida no pacote e a copia
// para o destino da ferramenta, sem nunca gravar fora dele. Cada recusa sai com o código da
// tabela de exit-codes.ts, sem deixar pasta parcial.
import { randomBytes } from 'node:crypto';
import { chmodSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import type { Catalog, CatalogSkill } from './catalog.js';
import { EXIT_ENVIRONMENT_ERROR, EXIT_SECURITY_REFUSAL, EXIT_SUCCESS, EXIT_USAGE_ERROR } from './exit-codes.js';
import { sanitize } from './sanitize.js';
import { hashSkillDir, readRegularFile, SkillTreeError } from './skill-hash.js';
import { detectTool, nextSteps, TOOL_BASE, TOOL_LABEL, TOOLS, type Tool } from './targets.js';

export const LOCK_FILE = 'obraforge.lock.json';
const LOCK_VERSION = 1;
// Mesmo padrão do validador (regra NOME): só nome exato do catálogo vira caminho, e ainda assim
// conferido de novo aqui.
const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const NAME_MAX = 64;
const SECURITY_HINT = 'Não foi gravado nada. Isso pode indicar pacote adulterado: relate pelo canal do SECURITY.md do obraforge.';

// Perguntas ao usuário. Só existe num terminal interativo; sem ele, o add nunca pergunta.
export interface Prompter {
  confirm(question: string): Promise<boolean>;
  choose(question: string, options: readonly string[]): Promise<number | undefined>;
}

export interface AddOptions {
  readonly names: readonly string[];
  readonly tool?: Tool;
  readonly yes: boolean;
  readonly force: boolean;
  readonly cwd: string;
  readonly catalog: Catalog;
  readonly packageRoot: string;
  readonly prompter?: Prompter;
}

export interface AddResult {
  readonly code: number;
  readonly stdout: string[];
  readonly stderr: string[];
}

interface LockEntry {
  name: string;
  version: string;
  sha256: string;
  path: string;
}

// Gravidade para o código final de várias skills: recusa de segurança pesa mais que erro de
// ambiente, que pesa mais que erro de uso.
const SEVERITY = [EXIT_SUCCESS, EXIT_USAGE_ERROR, EXIT_ENVIRONMENT_ERROR, EXIT_SECURITY_REFUSAL];

function worst(a: number, b: number): number {
  return SEVERITY.indexOf(b) > SEVERITY.indexOf(a) ? b : a;
}

export async function addCommand(options: AddOptions): Promise<AddResult> {
  const out: string[] = [];
  const err: string[] = [];
  const fail = (code: number, message: string): AddResult => ({ code, stdout: out, stderr: [...err, message] });

  // O registro local é lido antes de qualquer gravação: se ele estiver ilegível, nada é instalado.
  const lockPath = join(options.cwd, LOCK_FILE);
  let lock: LockEntry[];
  try {
    lock = readLock(lockPath);
  } catch (error) {
    if (error instanceof LockError) {
      return fail(error.code, error.message);
    }
    throw error;
  }

  const tool = await resolveTool(options, out);
  if (typeof tool === 'number') {
    return fail(EXIT_USAGE_ERROR, ambiguityMessage());
  }

  let code = EXIT_SUCCESS;
  let installed = 0;
  for (const name of options.names) {
    const result = await installOne(name, tool, options, lock);
    out.push(...result.stdout);
    err.push(...result.stderr);
    code = worst(code, result.code);
    if (result.entry !== undefined) {
      lock = [...lock.filter((entry) => entry.path !== result.entry?.path), result.entry];
      try {
        writeLock(lockPath, lock);
        installed += result.code === EXIT_SUCCESS ? 1 : 0;
      } catch (error) {
        err.push(`Erro de ambiente: não foi possível gravar ${LOCK_FILE} (${sanitize(error instanceof Error ? error.message : String(error))}).`);
        code = worst(code, EXIT_ENVIRONMENT_ERROR);
      }
    }
  }
  if (options.names.length > 1) {
    const failed = options.names.length - installed;
    out.push(`Resumo: ${installed} de ${options.names.length} skill(s) instalada(s) ou já em dia${failed > 0 ? `, ${failed} com erro` : ''}.`);
  }
  return { code, stdout: out, stderr: err };
}

// Ferramenta de destino: a do --for; sem ele, a detecção pela pasta atual. Ambiguidade pergunta no
// terminal e é erro (devolve o código) fora dele.
async function resolveTool(options: AddOptions, out: string[]): Promise<Tool | number> {
  if (options.tool !== undefined) {
    return options.tool;
  }
  const detection = detectTool(options.cwd);
  if (detection.kind === 'found') {
    return detection.tool;
  }
  if (detection.kind === 'none') {
    out.push('Nenhuma pasta de agente encontrada aqui (.claude/, .agents/ ou .gemini/): usando .agents/skills/. O Claude Code não lê essa pasta; para ele, use --for claude.');
    return 'agents';
  }
  if (options.prompter !== undefined) {
    const choice = await options.prompter.choose(
      'Esta pasta tem mais de um agente. Para qual ferramenta instalar?',
      detection.tools.map((tool) => `${TOOL_LABEL[tool]} (${TOOL_BASE[tool].join('/')}/)`),
    );
    const picked = choice === undefined ? undefined : detection.tools[choice];
    if (picked !== undefined) {
      return picked;
    }
  }
  return EXIT_USAGE_ERROR;
}

function ambiguityMessage(): string {
  return `Esta pasta tem mais de um agente (.claude/ e .agents/ ou .gemini/). Diga o destino com --for, uma destas: ${TOOLS.join(', ')}.`;
}

interface InstallResult extends AddResult {
  readonly entry?: LockEntry;
}

async function installOne(rawName: string, tool: Tool, options: AddOptions, lock: readonly LockEntry[]): Promise<InstallResult> {
  const name = sanitize(rawName);
  const done = (code: number, stdout: string[], stderr: string[], entry?: LockEntry): InstallResult =>
    entry === undefined ? { code, stdout, stderr } : { code, stdout, stderr, entry };

  if (rawName.length > NAME_MAX || !NAME_PATTERN.test(rawName)) {
    return done(EXIT_USAGE_ERROR, [], [`Nome de skill inválido: "${name}". Use o nome exato mostrado por "obraforge list".`]);
  }
  if (options.catalog.retired.includes(rawName)) {
    return done(EXIT_SECURITY_REFUSAL, [], [`${name} foi retirada do catálogo e não pode ser instalada. O motivo está no CHANGELOG do obraforge.`]);
  }
  const skill = options.catalog.skills.find((item) => item.name === rawName);
  if (skill === undefined) {
    const suggestion = closest(rawName, options.catalog.skills.map((item) => item.name));
    const hint = suggestion === undefined ? ' Veja as disponíveis com "obraforge list".' : ` Você quis dizer "${sanitize(suggestion)}"?`;
    return done(EXIT_USAGE_ERROR, [], [`Skill não encontrada no catálogo desta versão: "${name}".${hint}`]);
  }

  const stdout: string[] = [];
  const version = sanitize(skill.version);
  if (skill.state === 'depreciada') {
    stdout.push(`Aviso: ${name} está depreciada. Motivo: ${sanitize(skill.deprecationReason ?? '')}`);
    if (!options.yes) {
      const confirmed = options.prompter !== undefined && (await options.prompter.confirm(`Instalar ${name} mesmo assim?`));
      if (!confirmed) {
        const why = options.prompter === undefined ? 'Fora de um terminal interativo, confirme com --yes.' : 'Instalação cancelada.';
        return done(EXIT_USAGE_ERROR, stdout, [`${name} não foi instalada: skill depreciada. ${why}`]);
      }
    }
  }

  // Origem: só a pasta que o próprio catálogo aponta, e só dentro de skills/ do pacote.
  const expectedPath = `skills/${skill.area}/${skill.name}`;
  const skillsRoot = resolve(options.packageRoot, 'skills');
  const source = resolve(options.packageRoot, expectedPath);
  if (skill.path !== expectedPath || !source.startsWith(`${skillsRoot}${sep}`)) {
    return done(EXIT_SECURITY_REFUSAL, stdout, [`O catálogo aponta ${name} para um caminho inesperado. ${SECURITY_HINT}`]);
  }
  const sourceCheck = checkSource(source, skill);
  if (sourceCheck !== undefined) {
    return done(sourceCheck.code, stdout, [sourceCheck.message]);
  }

  const base = TOOL_BASE[tool];
  const relDest = `${base.join('/')}/${skill.name}`;
  const pathCheck = checkDestinationPath(options.cwd, [...base, skill.name]);
  if (pathCheck !== undefined) {
    return done(pathCheck.code, stdout, [pathCheck.message]);
  }
  const dest = join(options.cwd, ...base, skill.name);
  const entry: LockEntry = { name: skill.name, version: skill.version, sha256: skill.sha256, path: relDest };

  const existing = destinationState(dest, skill.sha256);
  if (existing === 'same') {
    const registered = lock.some((item) => item.path === relDest && item.sha256 === skill.sha256);
    stdout.push(`${name} ${version} já está instalada em ${relDest}/, sem diferença. Nada a fazer${registered ? '' : '; registrada no ' + LOCK_FILE}.`);
    return done(EXIT_SUCCESS, stdout, [], entry);
  }
  if (existing === 'different') {
    if (!options.force) {
      return done(EXIT_USAGE_ERROR, stdout, [
        `${relDest}/ já existe e difere da versão ${version} do catálogo (modificada localmente ou outra versão). Nada foi alterado. Para substituir, use --force.`,
      ]);
    }
    if (options.prompter !== undefined && !options.yes) {
      const confirmed = await options.prompter.confirm(`Substituir ${relDest}/? As mudanças locais serão perdidas.`);
      if (!confirmed) {
        return done(EXIT_USAGE_ERROR, stdout, [`${relDest}/ não foi alterada.`]);
      }
    }
  }

  let leftover: string | undefined;
  try {
    leftover = copyAtomically(source, dest, skill);
  } catch (error) {
    if (error instanceof CopyRefusal) {
      return done(EXIT_SECURITY_REFUSAL, stdout, [`${error.message} ${SECURITY_HINT}`]);
    }
    const cause = sanitize(error instanceof Error ? error.message : String(error));
    return done(EXIT_ENVIRONMENT_ERROR, stdout, [`Erro de ambiente: não foi possível gravar em ${relDest}/ (${cause}). Rode o comando na pasta do projeto, com permissão de escrita.`]);
  }
  stdout.push(`${name} ${version} instalada em ${relDest}/ (${TOOL_LABEL[tool]}).`, nextSteps(tool, skill.name));
  if (leftover !== undefined) {
    stdout.push(`Aviso: a cópia anterior ficou em ${sanitize(leftover)} e não pôde ser apagada; apague à mão.`);
  }
  return done(EXIT_SUCCESS, stdout, [], entry);
}

interface Refusal {
  readonly code: number;
  readonly message: string;
}

function checkSource(source: string, skill: CatalogSkill): Refusal | undefined {
  let sha256: string;
  try {
    sha256 = hashSkillDir(source).sha256;
  } catch (error) {
    if (error instanceof SkillTreeError) {
      return { code: EXIT_SECURITY_REFUSAL, message: `A pasta de ${skill.name} no pacote tem link simbólico ou arquivo especial. ${SECURITY_HINT}` };
    }
    return { code: EXIT_ENVIRONMENT_ERROR, message: `Erro de ambiente: a pasta de ${sanitize(skill.name)} não está no pacote instalado (${sanitize(source)}).` };
  }
  if (sha256 !== skill.sha256) {
    return { code: EXIT_SECURITY_REFUSAL, message: `O hash de ${skill.name} no pacote não confere com o catálogo. ${SECURITY_HINT}` };
  }
  return undefined;
}

// Nenhuma parte do caminho de destino que já existe pode ser link simbólico: se .claude apontar
// para outro lugar, gravar ali seria gravar fora do destino.
function checkDestinationPath(cwd: string, segments: readonly string[]): Refusal | undefined {
  let current = cwd;
  for (const segment of segments) {
    current = join(current, segment);
    let stats;
    try {
      stats = lstatSync(current);
    } catch {
      return undefined;
    }
    if (stats.isSymbolicLink()) {
      return { code: EXIT_SECURITY_REFUSAL, message: `O caminho de destino passa por um link simbólico (${current}). Nada foi gravado.` };
    }
    if (!stats.isDirectory()) {
      return { code: EXIT_ENVIRONMENT_ERROR, message: `Erro de ambiente: ${current} existe e não é pasta.` };
    }
  }
  return undefined;
}

function destinationState(dest: string, sha256: string): 'absent' | 'same' | 'different' {
  try {
    lstatSync(dest);
  } catch {
    return 'absent';
  }
  try {
    return hashSkillDir(dest).sha256 === sha256 ? 'same' : 'different';
  } catch {
    // Link simbólico ou arquivo especial dentro da cópia local: tratada como modificada.
    return 'different';
  }
}

class CopyRefusal extends Error {}

// Copia para uma pasta temporária irmã do destino, confere o hash da cópia e só então a coloca no
// lugar. Só arquivo regular, sem bit de execução. Falha no meio não deixa pasta parcial.
function copyAtomically(source: string, dest: string, skill: CatalogSkill): string | undefined {
  const parent = dirname(dest);
  mkdirSync(parent, { recursive: true });
  const temp = mkdtempSync(join(parent, `.${skill.name}.obraforge-`));
  try {
    const { files } = hashSkillDir(source);
    for (const file of files) {
      const target = join(temp, file.path);
      mkdirSync(dirname(target), { recursive: true, mode: 0o755 });
      writeFileSync(target, readRegularFile(join(source, file.diskPath)), { mode: 0o644, flag: 'wx' });
    }
    chmodSync(temp, 0o755);
    if (hashSkillDir(temp).sha256 !== skill.sha256) {
      throw new CopyRefusal(`A cópia de ${skill.name} não confere com o hash do catálogo.`);
    }
    return replace(temp, dest);
  } catch (error) {
    rmSync(temp, { recursive: true, force: true });
    throw error;
  }
}

// Devolve o caminho da cópia anterior quando ela não pôde ser apagada depois da troca: a cópia nova
// já está no lugar, e isso é sucesso com aviso, não falha.
function replace(temp: string, dest: string): string | undefined {
  let old: string | undefined;
  try {
    lstatSync(dest);
    old = join(dirname(dest), `.${randomBytes(6).toString('hex')}.obraforge-antiga`);
    renameSync(dest, old);
  } catch (error) {
    if (old !== undefined) {
      throw error;
    }
  }
  try {
    renameSync(temp, dest);
  } catch (error) {
    if (old !== undefined) {
      renameSync(old, dest);
    }
    throw error;
  }
  if (old !== undefined) {
    try {
      rmSync(old, { recursive: true, force: true });
    } catch {
      return old;
    }
  }
  return undefined;
}

class LockError extends Error {
  constructor(
    readonly code: number,
    message: string,
  ) {
    super(message);
  }
}

// obraforge.lock.json: por skill instalada, nome, versão, hash e destino (Plataforma · CLI — Spec
// §3). Nunca guarda dado do usuário.
function readLock(lockPath: string): LockEntry[] {
  let stats;
  try {
    stats = lstatSync(lockPath);
  } catch {
    return [];
  }
  if (stats.isSymbolicLink()) {
    throw new LockError(EXIT_SECURITY_REFUSAL, `${LOCK_FILE} é link simbólico. Nada foi gravado.`);
  }
  if (!stats.isFile()) {
    throw new LockError(EXIT_ENVIRONMENT_ERROR, `Erro de ambiente: ${LOCK_FILE} existe e não é arquivo. Nada foi instalado.`);
  }
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(lockPath, 'utf8'));
  } catch {
    throw new LockError(EXIT_ENVIRONMENT_ERROR, `Erro de ambiente: ${LOCK_FILE} está ilegível. Nada foi instalado; corrija ou apague o arquivo.`);
  }
  const skills = typeof data === 'object' && data !== null ? (data as { skills?: unknown }).skills : undefined;
  if (!Array.isArray(skills) || !skills.every(isLockEntry)) {
    throw new LockError(EXIT_ENVIRONMENT_ERROR, `Erro de ambiente: ${LOCK_FILE} em formato inesperado. Nada foi instalado; corrija ou apague o arquivo.`);
  }
  return skills;
}

function isLockEntry(value: unknown): value is LockEntry {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const entry = value as Record<string, unknown>;
  return ['name', 'version', 'sha256', 'path'].every((key) => typeof entry[key] === 'string');
}

function writeLock(lockPath: string, lock: readonly LockEntry[]): void {
  const skills = [...lock]
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    .map(({ name, version, sha256, path }) => ({ name, version, sha256, path }));
  const temp = `${lockPath}.${randomBytes(6).toString('hex')}.tmp`;
  writeFileSync(temp, `${JSON.stringify({ lockfileVersion: LOCK_VERSION, skills }, null, 2)}\n`, { mode: 0o644, flag: 'wx' });
  renameSync(temp, lockPath);
}

// Sugestão por proximidade (distância de edição até 3); nunca é instalada sozinha.
function closest(name: string, candidates: readonly string[]): string | undefined {
  let best: string | undefined;
  let bestDistance = 4;
  for (const candidate of candidates) {
    const distance = editDistance(name, candidate);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min((previous[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1, (previous[j - 1] ?? 0) + cost);
    }
    previous = current;
  }
  return previous[b.length] ?? 0;
}
