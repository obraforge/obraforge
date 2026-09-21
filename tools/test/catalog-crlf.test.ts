// Prova que o .gitattributes do repositório (`* text=auto eol=lf`) faz um checkout com
// core.autocrlf=true entregar LF, e não CRLF — condição de que o sha256 por skill seja o mesmo
// em Windows, macOS e Linux (item B2, "pronto quando").
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { makeTempDir, removeTempDirs, REPO_ROOT } from './helpers.js';

after(removeTempDirs);

const CONTENT = 'primeira linha\nsegunda linha\nterceira linha\n';

function git(cwd: string, args: string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

async function makeCommittedRepo(root: string, name: string, withGitattributes: boolean): Promise<string> {
  const dir = join(root, name);
  await mkdir(dir, { recursive: true });
  assert.equal(git(dir, ['init', '-q']).status, 0);
  assert.equal(git(dir, ['config', 'user.name', 'Teste Obraforge']).status, 0);
  assert.equal(git(dir, ['config', 'user.email', 'teste@example.com']).status, 0);
  assert.equal(git(dir, ['config', 'commit.gpgsign', 'false']).status, 0);
  // autocrlf=false na origem: o commit não deve alterar o conteúdo que escrevemos em disco.
  assert.equal(git(dir, ['config', 'core.autocrlf', 'false']).status, 0);
  if (withGitattributes) {
    const gitattributes = await readFile(join(REPO_ROOT, '.gitattributes'), 'utf8');
    await writeFile(join(dir, '.gitattributes'), gitattributes);
  }
  await writeFile(join(dir, 'arquivo.md'), CONTENT);
  assert.equal(git(dir, ['add', '-A']).status, 0);
  assert.equal(git(dir, ['commit', '-q', '-m', 'commit inicial']).status, 0);
  return dir;
}

test('.gitattributes (eol=lf) faz checkout com core.autocrlf=true entregar LF', async (t) => {
  const versionCheck = spawnSync('git', ['--version'], { encoding: 'utf8' });
  if (versionCheck.error !== undefined || versionCheck.status !== 0) {
    t.skip('git indisponível neste ambiente: teste de CRLF pulado.');
    return;
  }

  const root = await makeTempDir();

  // Controle: repositório SEM o .gitattributes do projeto. Prova que core.autocrlf=true, sozinho,
  // converteria LF em CRLF no checkout — para o contraste com o repositório abaixo fazer sentido.
  const control = await makeCommittedRepo(root, 'controle', false);
  const controlClone = join(root, 'controle-clone');
  assert.equal(git(root, ['clone', '-q', '-c', 'core.autocrlf=true', control, controlClone]).status, 0);
  const controlBytes = await readFile(join(controlClone, 'arquivo.md'));
  assert.ok(controlBytes.includes(0x0d), 'pré-condição do teste: sem .gitattributes, autocrlf=true deveria gerar CRLF');

  // Repositório com o .gitattributes real do projeto: mesmo com core.autocrlf=true no clone, o
  // checkout tem que entregar LF, porque eol=lf da o comando sobre o autocrlf do cliente.
  const withAttrs = await makeCommittedRepo(root, 'com-atributos', true);
  const attrsClone = join(root, 'com-atributos-clone');
  assert.equal(git(root, ['clone', '-q', '-c', 'core.autocrlf=true', withAttrs, attrsClone]).status, 0);
  const checkedOutBytes = await readFile(join(attrsClone, 'arquivo.md'));

  assert.ok(!checkedOutBytes.includes(0x0d), 'checkout com .gitattributes não deveria conter CR (0x0D)');
  assert.equal(checkedOutBytes.toString('utf8'), CONTENT);

  const originalHash = createHash('sha256').update(Buffer.from(CONTENT, 'utf8')).digest('hex');
  const checkedOutHash = createHash('sha256').update(checkedOutBytes).digest('hex');
  assert.equal(checkedOutHash, originalHash);
});
