import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { makeTempDir, removeTempDirs } from './helpers.js';

after(removeTempDirs);

const CLI = fileURLToPath(new URL('../src/catalog-cli.js', import.meta.url));

function run(...args: string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

async function setup(): Promise<{ skillsRoot: string; saida: string; pkg: string }> {
  const root = await makeTempDir();
  const skillsRoot = join(root, 'skills');
  await mkdir(skillsRoot, { recursive: true });
  const pkg = join(root, 'cli-package.json');
  await writeFile(pkg, JSON.stringify({ version: '1.2.3' }));
  const saida = join(root, 'catalog.json');
  return { skillsRoot, saida, pkg };
}

test('--verificar sai 1 com mensagem quando o catalog.json não existe', async () => {
  const { skillsRoot, saida, pkg } = await setup();
  const result = run('--verificar', skillsRoot, saida, pkg);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /não existe/);
});

test('sem --verificar, gera o catalog.json; com --verificar depois, sai 0', async () => {
  const { skillsRoot, saida, pkg } = await setup();
  const generated = run(skillsRoot, saida, pkg);
  assert.equal(generated.status, 0);

  const verified = run('--verificar', skillsRoot, saida, pkg);
  assert.equal(verified.status, 0);
  assert.equal(verified.stderr, '');
});

test('--verificar sai 1 com diff legível quando o catalog.json está desatualizado', async () => {
  const { skillsRoot, saida, pkg } = await setup();
  assert.equal(run(skillsRoot, saida, pkg).status, 0);

  const original = await readFile(saida, 'utf8');
  assert.match(original, /"skills": \[\]/);
  await writeFile(saida, original.replace('"skills": []', '"skills": [\n\n  ]'));

  const result = run('--verificar', skillsRoot, saida, pkg);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /desatualizado/);
  assert.ok(
    result.stderr.split('\n').some((line) => line.startsWith('- ') || line.startsWith('+ ')),
    `esperava linha de diff (- ou +) em:\n${result.stderr}`,
  );
});

test('--verificar não escreve nada em disco: o arquivo desatualizado continua igual depois', async () => {
  const { skillsRoot, saida, pkg } = await setup();
  assert.equal(run(skillsRoot, saida, pkg).status, 0);
  const original = await readFile(saida, 'utf8');
  const tampered = original.replace('"skills": []', '"skills": [\n\n  ]');
  await writeFile(saida, tampered);

  run('--verificar', skillsRoot, saida, pkg);
  const afterVerify = await readFile(saida, 'utf8');
  assert.equal(afterVerify, tampered);
});
