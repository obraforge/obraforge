// Guardas do workflow de release (item C3 do plano da fase 0), chamadas por
// .github/workflows/release.yml antes de qualquer publicação.
//
// Este arquivo roda de dois jeitos:
// - no workflow, direto do fonte, pelo type stripping do Node (`node tools/src/release-guards.ts`),
//   ANTES do `npm ci`: nenhum código de dependência executa antes das guardas. Por isso ele só
//   importa módulos `node:` e só usa sintaxe TypeScript apagável (sem enum, namespace com código
//   nem parameter property), e é um arquivo só (o type stripping não resolve `./x.js` para `x.ts`);
// - nos testes, compilado pelo tsc como o resto de tools/.
//
// Uso:
//   node tools/src/release-guards.ts commit-em-main <commit> [ref-da-main]   (padrão: origin/main)
//   node tools/src/release-guards.ts versao-da-tag <tag> [package.json]      (padrão: cli/package.json)
//   node tools/src/release-guards.ts versao-do-npm <versão-do-npm>
//   node tools/src/release-guards.ts changelog <tag> [CHANGELOG.md]          (seção vai para o stdout)
// Código de saída: 0 guarda satisfeita; 1 guarda recusou; 2 uso errado ou erro inesperado.
import { spawnSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Mínimo do npm para publicar por OIDC (publicador confiável). Fonte: docs.npmjs.com/trusted-publishers.
export const MIN_NPM_VERSION = '11.5.1';

export class GuardFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GuardFailure';
  }
}

// Guarda 2. Só vX.Y.Z, números sem zero à esquerda, como no semver. Pré-release (v1.0.0-rc.1) e
// metadado de build (v1.0.0+abc) são recusados: publicar pré-release exige decidir antes a
// dist-tag do npm, para a pré-release não virar a `latest`.
const TAG_PATTERN = /^v((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))$/;

export function versionFromTag(tag: string): string {
  const version = TAG_PATTERN.exec(tag)?.[1];
  if (version === undefined) {
    throw new GuardFailure(`a tag ${JSON.stringify(tag)} está fora do formato v<major>.<minor>.<patch> (ex.: v0.0.1).`);
  }
  return version;
}

export function checkTagMatchesPackage(tag: string, packageVersion: unknown): string {
  const version = versionFromTag(tag);
  if (version !== packageVersion) {
    throw new GuardFailure(
      `a tag ${tag} pede a versão ${version}, mas o package.json do pacote está em ${JSON.stringify(packageVersion)}.`,
    );
  }
  return version;
}

// Guarda 3.
interface ParsedVersion {
  core: [number, number, number];
  prerelease: boolean;
}

function parseVersion(text: string): ParsedVersion | undefined {
  const match = /^(\d+)\.(\d+)\.(\d+)(-[0-9A-Za-z.-]+)?$/.exec(text);
  if (match === null) {
    return undefined;
  }
  return { core: [Number(match[1]), Number(match[2]), Number(match[3])], prerelease: match[4] !== undefined };
}

function compareVersions(a: ParsedVersion, b: ParsedVersion): number {
  for (let index = 0; index < 3; index += 1) {
    const difference = a.core[index]! - b.core[index]!;
    if (difference !== 0) {
      return difference;
    }
  }
  // Mesmo núcleo: pré-release vem antes da versão final (semver).
  return Number(!a.prerelease) - Number(!b.prerelease);
}

export function checkNpmVersion(actual: string, minimum: string = MIN_NPM_VERSION): string {
  const floor = parseVersion(minimum);
  if (floor === undefined) {
    throw new Error(`versão mínima do npm inválida: ${minimum}`);
  }
  const trimmed = actual.trim();
  const current = parseVersion(trimmed);
  if (current === undefined) {
    throw new GuardFailure(
      `não deu para ler a versão do npm (${JSON.stringify(actual)}); a publicação por OIDC exige npm ${minimum} ou superior.`,
    );
  }
  if (compareVersions(current, floor) < 0) {
    throw new GuardFailure(
      `npm ${trimmed} está abaixo de ${minimum}, o mínimo para publicar por OIDC (publicador confiável). ` +
        `Use um Node que traga npm ${minimum} ou superior.`,
    );
  }
  return trimmed;
}

// Guarda 1.
function git(cwd: string, args: readonly string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.error !== undefined) {
    throw result.error;
  }
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

// `--end-of-options`: um valor começando com `-` é revisão, nunca opção do git. `^{commit}` desfaz
// a tag anotada até o commit.
function resolveCommit(cwd: string, revision: string): string | undefined {
  const result = git(cwd, ['rev-parse', '--verify', '--quiet', '--end-of-options', `${revision}^{commit}`]);
  return result.status === 0 ? result.stdout.trim() : undefined;
}

export function checkCommitOnMain(commit: string, mainRef: string, cwd: string): string {
  const sha = resolveCommit(cwd, commit);
  if (sha === undefined) {
    throw new GuardFailure(`o commit ${JSON.stringify(commit)} não existe neste clone.`);
  }
  const mainSha = resolveCommit(cwd, mainRef);
  if (mainSha === undefined) {
    throw new GuardFailure(
      `a referência ${JSON.stringify(mainRef)} não existe neste clone (o checkout precisa de fetch-depth: 0).`,
    );
  }
  const result = git(cwd, ['merge-base', '--is-ancestor', sha, mainSha]);
  if (result.status === 0) {
    return sha;
  }
  if (result.status === 1) {
    throw new GuardFailure(`o commit ${sha} não está em ${mainRef}: a tag aponta para fora da main.`);
  }
  throw new GuardFailure(`git merge-base saiu com ${String(result.status)}: ${result.stderr.trim()}`);
}

// Corpo da release: a seção `## [<versão>]` do CHANGELOG.md, até o próximo título de nível 2.
// Fail-closed: sem a seção, ou com ela vazia ou repetida, não há release.
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function extractChangelogSection(changelog: string, version: string): string {
  const lines = changelog.replace(/\r\n?/g, '\n').split('\n');
  const heading = new RegExp(`^## \\[${escapeRegExp(version)}\\](?:[ \\t].*)?$`);
  const starts = lines.flatMap((line, index) => (heading.test(line) ? [index] : []));
  const [first] = starts;
  if (first === undefined) {
    throw new GuardFailure(`o CHANGELOG.md não tem a seção "## [${version}]"; sem changelog, não há release.`);
  }
  if (starts.length > 1) {
    throw new GuardFailure(`o CHANGELOG.md tem ${starts.length} seções "## [${version}]"; deixe uma só.`);
  }
  const next = lines.findIndex((line, index) => index > first && line.startsWith('## '));
  const section = lines.slice(first + 1, next === -1 ? lines.length : next);
  while (section.length > 0 && section[0]!.trim() === '') {
    section.shift();
  }
  while (section.length > 0 && section.at(-1)!.trim() === '') {
    section.pop();
  }
  if (section.length === 0) {
    throw new GuardFailure(`a seção "## [${version}]" do CHANGELOG.md está vazia.`);
  }
  return `${section.join('\n')}\n`;
}

// CLI.
const USAGE = [
  'Uso:',
  '  release-guards commit-em-main <commit> [ref-da-main]',
  '  release-guards versao-da-tag <tag> [package.json]',
  '  release-guards versao-do-npm <versão-do-npm>',
  '  release-guards changelog <tag> [CHANGELOG.md]',
].join('\n');

interface Command {
  label: string;
  minArgs: number;
  maxArgs: number;
  run: (args: readonly string[]) => void;
}

function readPackageVersion(path: string): unknown {
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
  return typeof parsed === 'object' && parsed !== null ? (parsed as { version?: unknown }).version : undefined;
}

const COMMANDS: Record<string, Command> = {
  'commit-em-main': {
    label: 'Guarda 1 (commit da tag em main)',
    minArgs: 1,
    maxArgs: 2,
    run: ([commit = '', mainRef = 'origin/main']) => {
      const sha = checkCommitOnMain(commit, mainRef, process.cwd());
      console.log(`Guarda 1 ok: o commit ${sha} está em ${mainRef}.`);
    },
  },
  'versao-da-tag': {
    label: 'Guarda 2 (versão da tag)',
    minArgs: 1,
    maxArgs: 2,
    run: ([tag = '', packagePath = 'cli/package.json']) => {
      const version = checkTagMatchesPackage(tag, readPackageVersion(packagePath));
      console.log(`Guarda 2 ok: a tag ${tag} bate com ${packagePath} (${version}).`);
    },
  },
  'versao-do-npm': {
    label: 'Guarda 3 (versão do npm)',
    minArgs: 1,
    maxArgs: 1,
    run: ([actual = '']) => {
      const version = checkNpmVersion(actual);
      console.log(`Guarda 3 ok: npm ${version} (mínimo ${MIN_NPM_VERSION}).`);
    },
  },
  changelog: {
    label: 'Changelog da release',
    minArgs: 1,
    maxArgs: 2,
    run: ([tag = '', changelogPath = 'CHANGELOG.md']) => {
      const version = versionFromTag(tag);
      const section = extractChangelogSection(readFileSync(changelogPath, 'utf8'), version);
      // O stdout leva só a seção (vira o corpo da release); a confirmação vai para o stderr.
      process.stdout.write(section);
      console.error(`Changelog ok: seção [${version}] de ${changelogPath}.`);
    },
  },
};

export function runCli(argv: readonly string[]): number {
  const [name = '', ...args] = argv;
  const command = Object.hasOwn(COMMANDS, name) ? COMMANDS[name] : undefined;
  if (command === undefined || args.length < command.minArgs || args.length > command.maxArgs) {
    console.error(USAGE);
    return 2;
  }
  try {
    command.run(args);
    return 0;
  } catch (error) {
    if (error instanceof GuardFailure) {
      console.error(`${command.label} recusou: ${error.message}`);
      return 1;
    }
    // Fail-closed: qualquer erro inesperado termina com código diferente de zero.
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${command.label}: erro inesperado: ${message}`);
    return 2;
  }
}

function isEntryPoint(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) {
    return false;
  }
  try {
    return pathToFileURL(realpathSync(entry)).href === import.meta.url;
  } catch {
    return false;
  }
}

if (isEntryPoint()) {
  process.exitCode = runCli(process.argv.slice(2));
}
