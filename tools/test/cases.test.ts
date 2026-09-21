import assert from 'node:assert/strict';
import { chmod, mkdir, readdir, readFile, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { RULE_CODES, validateSkillsRoot } from '../src/validate.js';
import { walkTree } from '../src/tree.js';
import {
  appendLine,
  CASES_DIR,
  cnpjWithDv,
  codesOf,
  copyValidCase,
  cpfWithDv,
  maskCnpj,
  maskCpf,
  REPO_ROOT,
  removeTempDirs,
  VALID_CASE,
} from './helpers.js';

after(removeTempDirs);

const committedCases = (await readdir(CASES_DIR)).filter((name) => name.startsWith('invalida-')).sort();

test('o caso válido passa em todas as regras', async () => {
  assert.deepEqual(await validateSkillsRoot(VALID_CASE), []);
});

test('o validador sobre skills/ do repositório passa', async () => {
  assert.deepEqual(await validateSkillsRoot(join(REPO_ROOT, 'skills')), []);
});

for (const name of committedCases) {
  const code = name.slice('invalida-'.length);

  test(`${name} acusa exatamente ${code}`, async () => {
    assert.ok((RULE_CODES as readonly string[]).includes(code), `código desconhecido: ${code}`);
    assert.deepEqual(await codesOf(join(CASES_DIR, name)), [code]);
  });

  test(`${name} difere do caso válido em um único arquivo`, async () => {
    const files = async (root: string): Promise<Map<string, string>> => {
      const entries = (await walkTree(root)).filter((entry) => entry.kind === 'file');
      const contents = await Promise.all(entries.map((entry) => readFile(join(root, entry.path), 'utf8')));
      return new Map(entries.map((entry, index) => [entry.path, contents[index] ?? '']));
    };
    const valid = await files(VALID_CASE);
    const invalid = await files(join(CASES_DIR, name));
    const paths = new Set([...valid.keys(), ...invalid.keys()]);
    const changed = [...paths].filter((path) => valid.get(path) !== invalid.get(path));
    assert.equal(changed.length, 1, `arquivos diferentes: ${changed.join(', ')}`);
  });
}

// Casos que não podem ser commitados: são montados numa cópia temporária do caso válido.
const materialized: Record<'LINK' | 'DADO-PESSOAL', Record<string, (skill: string) => Promise<void>>> = {
  LINK: {
    'link simbólico': async (skill) => {
      await mkdir(join(skill, 'assets'));
      await symlink('../SKILL.md', join(skill, 'assets', 'atalho.md'));
    },
    'arquivo executável': async (skill) => {
      await chmod(join(skill, 'fixtures', 'esperado.md'), 0o755);
    },
  },
  'DADO-PESSOAL': {
    CPF: async (skill) => {
      await appendLine(join(skill, 'fixtures', 'entrada.csv'), `XPT;Sigla de teste;NR-6;Pessoa;${maskCpf(cpfWithDv('390533447'))}`);
    },
    CNPJ: async (skill) => {
      await appendLine(join(skill, 'fixtures', 'entrada.csv'), `XPT;Sigla de teste;NR-6;Empresa;${maskCnpj(cnpjWithDv('904718260001'))}`);
    },
    'CNPJ alfanumérico': async (skill) => {
      await appendLine(join(skill, 'fixtures', 'entrada.csv'), `XPT;Sigla de teste;NR-6;Empresa;${maskCnpj(cnpjWithDv('A1B2C3D40001'))}`);
    },
    'e-mail': async (skill) => {
      await appendLine(join(skill, 'fixtures', 'entrada.csv'), 'XPT;Sigla de teste;NR-6;Pessoa;fulano@obraforge.invalid');
    },
    // DDD terminado em 0 fica em reserva na Anatel e não está alocado: o número tem a forma de
    // telefone sem ser de ninguém hoje.
    telefone: async (skill) => {
      await appendLine(join(skill, 'fixtures', 'entrada.csv'), 'XPT;Sigla de teste;NR-6;Pessoa;(10) 90000-0001');
    },
  },
};

for (const [code, cases] of Object.entries(materialized)) {
  for (const [label, apply] of Object.entries(cases)) {
    test(`invalida-${code} (${label}, montado no teste) acusa exatamente ${code}`, async () => {
      const { root, skill } = await copyValidCase();
      await apply(skill);
      assert.deepEqual(await codesOf(root), [code]);
    });
  }
}

test('toda regra tem um caso inválido', () => {
  const covered = new Set<string>([...committedCases.map((name) => name.slice('invalida-'.length)), ...Object.keys(materialized)]);
  assert.deepEqual([...covered].sort(), [...RULE_CODES].sort());
});
