// Guardas do workflow de release (item C3): cada uma com o caso que a faz recusar e o que a faz
// passar. Os testes de CLI rodam o FONTE (.ts) pelo type stripping do Node, que é exatamente o que
// o workflow executa antes do npm ci.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  checkNpmVersion,
  checkTagMatchesPackage,
  extractChangelogSection,
  GuardFailure,
  MIN_NPM_VERSION,
  versionFromTag,
} from '../src/release-guards.js';
import { makeTempDir, removeTempDirs, REPO_ROOT } from './helpers.js';

after(removeTempDirs);

const GUARDS_TS = fileURLToPath(new URL('../../src/release-guards.ts', import.meta.url));

function runGuards(args: string[], cwd: string = REPO_ROOT): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [GUARDS_TS, ...args], { cwd, encoding: 'utf8' });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function git(cwd: string, args: string[]): string {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, `git ${args.join(' ')} falhou: ${result.stderr}`);
  return result.stdout.trim();
}

// Repositório de origem com main (dois commits, tag anotada v0.0.1 no segundo) e um branch fora
// da main (tag anotada v9.9.9). O clone reproduz o checkout do workflow com fetch-depth: 0: a main
// vira origin/main e o commit fora da main existe no clone.
async function makeRepo(): Promise<{ clone: string; oldMain: string; mainHead: string; offMain: string }> {
  const root = await makeTempDir();
  const origin = join(root, 'origem');
  await mkdir(origin);
  git(origin, ['init', '-q', '-b', 'main']);
  git(origin, ['config', 'user.name', 'Teste Obraforge']);
  git(origin, ['config', 'user.email', 'teste@example.com']);
  git(origin, ['config', 'commit.gpgsign', 'false']);
  git(origin, ['config', 'tag.gpgsign', 'false']);
  await writeFile(join(origin, 'a.txt'), '1\n');
  git(origin, ['add', '-A']);
  git(origin, ['commit', '-q', '-m', 'primeiro']);
  const oldMain = git(origin, ['rev-parse', 'HEAD']);
  await writeFile(join(origin, 'a.txt'), '2\n');
  git(origin, ['commit', '-q', '-am', 'segundo']);
  const mainHead = git(origin, ['rev-parse', 'HEAD']);
  git(origin, ['tag', '-a', 'v0.0.1', '-m', 'release na main', mainHead]);
  git(origin, ['checkout', '-q', '-b', 'fora-da-main', oldMain]);
  await writeFile(join(origin, 'b.txt'), 'x\n');
  git(origin, ['add', '-A']);
  git(origin, ['commit', '-q', '-m', 'fora da main']);
  const offMain = git(origin, ['rev-parse', 'HEAD']);
  git(origin, ['tag', '-a', 'v9.9.9', '-m', 'tag fora da main', offMain]);
  git(origin, ['checkout', '-q', 'main']);
  const clone = join(root, 'clone');
  git(root, ['clone', '-q', origin, clone]);
  return { clone, oldMain, mainHead, offMain };
}

// Guarda 1 — commit da tag em main.

test('guarda 1: commit na main (topo ou anterior) passa; tag anotada na main também', async () => {
  const { clone, oldMain, mainHead } = await makeRepo();
  for (const commit of [mainHead, oldMain, 'v0.0.1', git(clone, ['rev-parse', 'v0.0.1'])]) {
    const result = runGuards(['commit-em-main', commit], clone);
    assert.equal(result.status, 0, `${commit}: ${result.stderr}`);
  }
  const result = runGuards(['commit-em-main', 'v0.0.1'], clone);
  assert.equal(result.stdout, `Guarda 1 ok: o commit ${mainHead} está em origin/main.\n`);
});

test('guarda 1: commit fora da main recusa com código 1 (pelo SHA e pela tag anotada)', async () => {
  const { clone, offMain } = await makeRepo();
  for (const commit of [offMain, 'v9.9.9']) {
    const result = runGuards(['commit-em-main', commit], clone);
    assert.equal(result.status, 1, `${commit}: ${result.stdout}`);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, new RegExp(`^Guarda 1 \\(commit da tag em main\\) recusou: o commit ${offMain} não está em origin/main`));
  }
});

test('guarda 1: sem origin/main no clone (checkout raso) recusa, em vez de passar', async () => {
  const { clone, mainHead } = await makeRepo();
  const result = runGuards(['commit-em-main', mainHead, 'origin/nao-existe'], clone);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /não existe neste clone \(o checkout precisa de fetch-depth: 0\)/);
});

test('guarda 1: commit inexistente ou valor com cara de opção do git recusa', async () => {
  const { clone } = await makeRepo();
  for (const commit of ['0123456789abcdef0123456789abcdef01234567', '--all', '']) {
    const result = runGuards(['commit-em-main', commit], clone);
    assert.equal(result.status, 1, `${JSON.stringify(commit)}: ${result.stdout}`);
    assert.match(result.stderr, /não existe neste clone/);
  }
});

// Guarda 2 — versão da tag igual à de cli/package.json.

test('guarda 2: extrai a versão de vX.Y.Z', () => {
  assert.equal(versionFromTag('v0.0.1'), '0.0.1');
  assert.equal(versionFromTag('v10.20.300'), '10.20.300');
});

test('guarda 2: tag fora do formato v<major>.<minor>.<patch> recusa', () => {
  const invalid = ['0.0.1', 'V0.0.1', 'v0.0', 'v0.0.1.2', 'v01.0.0', 'v0.0.1-rc.1', 'v0.0.1+build', 'v 0.0.1', 'release-0.0.1', 'v', ''];
  for (const tag of invalid) {
    assert.throws(() => versionFromTag(tag), GuardFailure, tag);
  }
});

test('guarda 2: versão da tag diferente da do package.json recusa', () => {
  assert.equal(checkTagMatchesPackage('v0.0.1', '0.0.1'), '0.0.1');
  assert.throws(() => checkTagMatchesPackage('v0.0.2', '0.0.1'), /a tag v0\.0\.2 pede a versão 0\.0\.2, mas o package\.json do pacote está em "0\.0\.1"/);
  assert.throws(() => checkTagMatchesPackage('v0.0.1', undefined), GuardFailure);
  assert.throws(() => checkTagMatchesPackage('v0.0.1', 1), GuardFailure);
});

test('guarda 2 (CLI): passa com a versão igual e recusa com a diferente', async () => {
  const pkg = join(await makeTempDir(), 'package.json');
  await writeFile(pkg, JSON.stringify({ name: 'obraforge', version: '0.0.1' }));

  const ok = runGuards(['versao-da-tag', 'v0.0.1', pkg]);
  assert.equal(ok.status, 0, ok.stderr);

  for (const tag of ['v0.0.2', '0.0.1', 'v0.0.1-rc.1']) {
    const refused = runGuards(['versao-da-tag', tag, pkg]);
    assert.equal(refused.status, 1, tag);
    assert.equal(refused.stdout, '');
    assert.match(refused.stderr, /^Guarda 2 \(versão da tag\) recusou: /);
  }
});

test('guarda 2 (CLI): lê cli/package.json por padrão', async () => {
  const { version } = JSON.parse(await readFile(join(REPO_ROOT, 'cli', 'package.json'), 'utf8')) as { version: string };
  assert.equal(runGuards(['versao-da-tag', `v${version}`]).status, 0);
  assert.equal(runGuards(['versao-da-tag', `v${version}.0`]).status, 1);
});

test('guarda 2 (CLI): package.json ausente é erro, com código 2', async () => {
  const result = runGuards(['versao-da-tag', 'v0.0.1', join(await makeTempDir(), 'nao-existe.json')]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /erro inesperado/);
});

// Guarda 3 — npm 11.5.1 ou superior.

test('guarda 3: o mínimo é o da documentação do npm para OIDC', () => {
  assert.equal(MIN_NPM_VERSION, '11.5.1');
});

test('guarda 3: npm 11.5.1 ou superior passa', () => {
  for (const version of ['11.5.1', '11.5.2', '11.6.0', '11.12.1', '12.0.0', '11.12.1\n']) {
    assert.equal(checkNpmVersion(version), version.trim());
  }
});

test('guarda 3: npm abaixo de 11.5.1, pré-release de 11.5.1 ou versão ilegível recusa', () => {
  for (const version of ['11.5.0', '11.4.99', '10.9.2', '9.99.99', '11.5.1-pre.0']) {
    assert.throws(() => checkNpmVersion(version), /está abaixo de 11\.5\.1/, version);
  }
  for (const version of ['', 'abc', '11.5', 'v11.5.1']) {
    assert.throws(() => checkNpmVersion(version), /não deu para ler a versão do npm/, version);
  }
});

test('guarda 3 (CLI): recusa npm antigo com mensagem clara e passa o atual', () => {
  const refused = runGuards(['versao-do-npm', '10.9.2']);
  assert.equal(refused.status, 1);
  assert.equal(refused.stdout, '');
  assert.match(refused.stderr, /^Guarda 3 \(versão do npm\) recusou: npm 10\.9\.2 está abaixo de 11\.5\.1, o mínimo para publicar por OIDC/);

  const ok = runGuards(['versao-do-npm', '11.5.1']);
  assert.equal(ok.status, 0);
  assert.equal(ok.stdout, 'Guarda 3 ok: npm 11.5.1 (mínimo 11.5.1).\n');
});

// Changelog — corpo da release.

const CHANGELOG = [
  '# Changelog',
  '',
  '## [Não lançado]',
  '',
  '## [0.0.10] — a definir',
  '',
  '### Adicionadas',
  '',
  '- Coisa da 0.0.10.',
  '',
  '## [0.0.1] — 21/09/2026',
  '',
  'Primeira release.',
  '',
  '### Adicionadas',
  '',
  '- Coisa da 0.0.1.',
  '',
  '## [0.0.0]',
  '',
  '- Reserva.',
  '',
].join('\n');

test('changelog: extrai só a seção da versão, até o próximo título de nível 2', () => {
  assert.equal(extractChangelogSection(CHANGELOG, '0.0.1'), 'Primeira release.\n\n### Adicionadas\n\n- Coisa da 0.0.1.\n');
  assert.equal(extractChangelogSection(CHANGELOG, '0.0.10'), '### Adicionadas\n\n- Coisa da 0.0.10.\n');
  assert.equal(extractChangelogSection(CHANGELOG, '0.0.0'), '- Reserva.\n');
});

test('changelog: CRLF no arquivo não muda a seção extraída', () => {
  assert.equal(extractChangelogSection(CHANGELOG.replace(/\n/g, '\r\n'), '0.0.1'), extractChangelogSection(CHANGELOG, '0.0.1'));
});

test('changelog: sem a seção da versão, recusa (fail-closed)', () => {
  assert.throws(() => extractChangelogSection(CHANGELOG, '0.0.2'), /não tem a seção "## \[0\.0\.2\]"; sem changelog, não há release/);
  // A versão casa com o título inteiro entre colchetes, e o ponto dela não é curinga de regex.
  assert.throws(() => extractChangelogSection(CHANGELOG, '0.0.1.'), GuardFailure);
  assert.throws(() => extractChangelogSection('## [0x0x1]\n\n- x\n', '0.0.1'), GuardFailure);
});

test('changelog: seção vazia ou repetida recusa', () => {
  assert.throws(() => extractChangelogSection('## [0.0.1]\n\n\n## [0.0.0]\n\n- x\n', '0.0.1'), /está vazia/);
  assert.throws(() => extractChangelogSection('## [0.0.1]\n', '0.0.1'), /está vazia/);
  assert.throws(() => extractChangelogSection('## [0.0.1]\n\n- a\n\n## [0.0.1]\n\n- b\n', '0.0.1'), /tem 2 seções/);
});

test('changelog (CLI): a seção vai para o stdout e a tag sem seção recusa', async () => {
  const path = join(await makeTempDir(), 'CHANGELOG.md');
  await writeFile(path, CHANGELOG);

  const ok = runGuards(['changelog', 'v0.0.1', path]);
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(ok.stdout, 'Primeira release.\n\n### Adicionadas\n\n- Coisa da 0.0.1.\n');

  const missing = runGuards(['changelog', 'v0.0.2', path]);
  assert.equal(missing.status, 1);
  assert.equal(missing.stdout, '');
  assert.match(missing.stderr, /^Changelog da release recusou: o CHANGELOG\.md não tem a seção "## \[0\.0\.2\]"/);

  const badTag = runGuards(['changelog', '0.0.1', path]);
  assert.equal(badTag.status, 1);
  assert.equal(badTag.stdout, '');
});

test('CHANGELOG.md do repositório tem a seção da versão atual de cli/package.json', async () => {
  const { version } = JSON.parse(await readFile(join(REPO_ROOT, 'cli', 'package.json'), 'utf8')) as { version: string };
  const changelog = await readFile(join(REPO_ROOT, 'CHANGELOG.md'), 'utf8');
  assert.ok(extractChangelogSection(changelog, version).length > 0);
});

// Uso.

test('uso errado sai 2: sem comando, comando desconhecido, argumento a mais ou a menos', () => {
  for (const args of [[], ['toString'], ['publicar'], ['versao-do-npm'], ['versao-do-npm', '11.5.1', 'extra'], ['commit-em-main']]) {
    const result = runGuards(args);
    assert.equal(result.status, 2, JSON.stringify(args));
    assert.match(result.stderr, /^Uso:/);
  }
});
