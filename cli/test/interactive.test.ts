import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import type { Catalog } from '../src/catalog.js';
import { EXIT_SUCCESS, EXIT_USAGE_ERROR } from '../src/exit-codes.js';
import { interactive, type Io } from '../src/interactive.js';
import { hashSkillDir } from '../src/skill-hash.js';

const temps: string[] = [];
after(() => temps.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

function temp(): string {
  const dir = mkdtempSync(join(tmpdir(), 'obraforge-interativo-'));
  temps.push(dir);
  return dir;
}

function makePackage(): { root: string; catalog: Catalog } {
  const root = temp();
  const dir = join(root, 'skills', 'orcamento', 'skill-teste');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'SKILL.md'), 'corpo\n');
  return {
    root,
    catalog: {
      version: '0.1.0',
      retired: [],
      skills: [
        { name: 'skill-teste', area: 'orcamento', phase: 1, version: '1.0.0', state: 'publicada', description: 'Teste.', path: 'skills/orcamento/skill-teste', sha256: hashSkillDir(dir).sha256 },
      ],
    },
  };
}

function scripted(answers: string[]): Io & { written: string[] } {
  const written: string[] = [];
  return {
    written,
    question: async () => answers.shift() ?? '',
    write: (text) => {
      written.push(text);
    },
  };
}

test('escolhe área, skill e ferramenta, confirma e instala pelo mesmo caminho do add', async () => {
  const pkg = makePackage();
  const cwd = temp();
  const io = scripted(['1', '1', '1', 's']);
  const result = await interactive(io, pkg.catalog, cwd, pkg.root);
  assert.equal(result.code, EXIT_SUCCESS, result.stderr.join('\n'));
  assert.ok(existsSync(join(cwd, '.claude', 'skills', 'skill-teste', 'SKILL.md')));
  assert.ok(existsSync(join(cwd, 'obraforge.lock.json')));
});

test('escolha inválida: sai 1 e não grava nada', async () => {
  const pkg = makePackage();
  const cwd = temp();
  const result = await interactive(scripted(['9']), pkg.catalog, cwd, pkg.root);
  assert.equal(result.code, EXIT_USAGE_ERROR);
  assert.deepEqual(readdirSync(cwd), []);
});

test('não confirmar: sai 1 e não grava nada', async () => {
  const pkg = makePackage();
  const cwd = temp();
  const result = await interactive(scripted(['1', '1', '2', 'n']), pkg.catalog, cwd, pkg.root);
  assert.equal(result.code, EXIT_USAGE_ERROR);
  assert.deepEqual(readdirSync(cwd), []);
});

test('G1: a escolha de skill marca a depreciada', async () => {
  const pkg = makePackage();
  const skill = pkg.catalog.skills[0];
  assert.ok(skill);
  const catalog: Catalog = { ...pkg.catalog, skills: [{ ...skill, state: 'depreciada', deprecationReason: 'Norma revogada.' }] };
  const io = scripted(['1', '9']);
  await interactive(io, catalog, temp(), pkg.root);
  assert.ok(io.written.some((line) => /skill-teste .*depreciada/.test(line)), io.written.join('\n'));
});
