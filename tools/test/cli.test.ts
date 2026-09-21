import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmod, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, test } from 'node:test';
import { formatFinding } from '../src/report.js';
import { validateSkillsRoot } from '../src/validate.js';
import { CASES_DIR, copyValidCase, makeTempDir, removeTempDirs, VALID_CASE } from './helpers.js';

after(removeTempDirs);

const CLI = fileURLToPath(new URL('../src/validate-cli.js', import.meta.url));

function run(...args: string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

test('sem achados: sai 0 e imprime o resumo', () => {
  const result = run(VALID_CASE);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^Validador: nenhum achado em .+\.\n$/);
});

test('com achado: sai 1 com uma linha legível por achado e o resumo', () => {
  const result = run(join(CASES_DIR, 'invalida-NOME'));
  assert.equal(result.status, 1);
  assert.deepEqual(result.stdout.split('\n'), [
    'NOME contexto/exemplo-valido/SKILL.md:2 — name "exemplo-renomeado" difere do nome da pasta',
    `Validador: 1 achado em ${join(CASES_DIR, 'invalida-NOME')}.`,
    '',
  ]);
});

test('erro inesperado (raiz inexistente) sai com código diferente de zero', async () => {
  const result = run(join(await makeTempDir(), 'nao-existe'));
  assert.equal(result.status, 2);
  assert.match(result.stderr, /^Erro inesperado no validador: /);
  assert.equal(result.stdout, '');
});

test('uso errado (duas raízes) sai 2', () => {
  assert.equal(run(VALID_CASE, VALID_CASE).status, 2);
});

test('nome de arquivo com quebra de linha não quebra a linha do achado', async () => {
  const { root, skill } = await copyValidCase();
  const file = join(skill, 'fixtures', 'a\n::error::injetado.md');
  await writeFile(file, 'x\n');
  await chmod(file, 0o755);
  // A quebra de linha no nome também é caractere de controle, que a ESTRUTURA acusa no nome.
  const lines = (await validateSkillsRoot(root)).map(formatFinding);
  for (const line of lines) {
    assert.ok(!line.includes('\n'), line);
  }
  assert.deepEqual(lines, [
    'ESTRUTURA contexto/exemplo-valido/fixtures/a\\u{a}::error::injetado.md — nome de arquivo com caractere invisível',
    'LINK contexto/exemplo-valido/fixtures/a\\u{a}::error::injetado.md — arquivo com permissão de execução',
  ]);
});
