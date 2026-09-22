import assert from 'node:assert/strict';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { addCommand, LOCK_FILE, type AddOptions, type Prompter } from '../src/add-command.js';
import type { Catalog, CatalogSkill } from '../src/catalog.js';
import { EXIT_ENVIRONMENT_ERROR, EXIT_SECURITY_REFUSAL, EXIT_SUCCESS, EXIT_USAGE_ERROR } from '../src/exit-codes.js';
import { hashSkillDir } from '../src/skill-hash.js';

const temps: string[] = [];
after(() => {
  for (const dir of temps) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  temps.push(dir);
  return dir;
}

const FILES: Record<string, string> = {
  'SKILL.md': '---\nname: skill-teste\n---\n\nCorpo.\n',
  'fixtures/entrada.csv': 'a;b\n1;2\n',
  'fixtures/esperado.md': '# Esperado\n',
  'references/normas.md': '# Referências\n',
};

// Pacote de teste: <raiz>/skills/<area>/<nome>/ com os arquivos acima, e a entrada do catálogo com
// o hash calculado da pasta.
function makePackage(names: readonly string[] = ['skill-teste'], extra: Partial<CatalogSkill> = {}): { root: string; catalog: Catalog } {
  const root = tempDir('obraforge-pacote-');
  const skills = names.map((name) => {
    const dir = join(root, 'skills', 'contexto', name);
    for (const [path, content] of Object.entries(FILES)) {
      mkdirSync(join(dir, path, '..'), { recursive: true });
      writeFileSync(join(dir, path), content.replace('skill-teste', name));
    }
    const skill: CatalogSkill = {
      name,
      area: 'contexto',
      phase: 1,
      version: '1.0.0',
      state: 'publicada',
      description: `Skill de teste ${name}.`,
      path: `skills/contexto/${name}`,
      sha256: hashSkillDir(dir).sha256,
      ...extra,
    };
    return skill;
  });
  return { root, catalog: { version: '0.1.0', retired: [], skills } };
}

function options(pkg: { root: string; catalog: Catalog }, cwd: string, overrides: Partial<AddOptions> = {}): AddOptions {
  return { names: ['skill-teste'], yes: false, force: false, cwd, catalog: pkg.catalog, packageRoot: pkg.root, ...overrides };
}

// Nada gravado: nem a pasta de agente, nem o registro, nem sobra de pasta temporária.
function assertNothingWritten(cwd: string): void {
  assert.deepEqual(readdirSync(cwd), []);
}

function readLock(cwd: string): Array<{ name: string; version: string; sha256: string; path: string }> {
  return (JSON.parse(readFileSync(join(cwd, LOCK_FILE), 'utf8')) as { skills: [] }).skills;
}

test('add --for claude numa pasta limpa grava a skill e o registro local', async () => {
  const pkg = makePackage();
  const cwd = tempDir('obraforge-projeto-');
  const result = await addCommand(options(pkg, cwd, { tool: 'claude' }));
  assert.equal(result.code, EXIT_SUCCESS, result.stderr.join('\n'));
  const dest = join(cwd, '.claude', 'skills', 'skill-teste');
  assert.equal(hashSkillDir(dest).sha256, pkg.catalog.skills[0]?.sha256);
  assert.deepEqual(readLock(cwd), [{ name: 'skill-teste', version: '1.0.0', sha256: pkg.catalog.skills[0]?.sha256, path: '.claude/skills/skill-teste' }]);
  assert.match(result.stdout.join('\n'), /instalada em \.claude\/skills\/skill-teste\//);
  // Nenhuma sobra de pasta temporária ao lado do destino.
  assert.deepEqual(readdirSync(join(cwd, '.claude', 'skills')), ['skill-teste']);
});

for (const tool of ['codex', 'gemini', 'agents'] as const) {
  test(`add --for ${tool} grava em .agents/skills/`, async () => {
    const pkg = makePackage();
    const cwd = tempDir('obraforge-projeto-');
    const result = await addCommand(options(pkg, cwd, { tool }));
    assert.equal(result.code, EXIT_SUCCESS, result.stderr.join('\n'));
    assert.ok(existsSync(join(cwd, '.agents', 'skills', 'skill-teste', 'SKILL.md')));
    assert.equal(readLock(cwd)[0]?.path, '.agents/skills/skill-teste');
  });
}

test('arquivos copiados não têm bit de execução, mesmo que a origem tenha', async () => {
  const pkg = makePackage();
  const cwd = tempDir('obraforge-projeto-');
  const result = await addCommand(options(pkg, cwd, { tool: 'claude' }));
  assert.equal(result.code, EXIT_SUCCESS);
  const file = join(cwd, '.claude', 'skills', 'skill-teste', 'SKILL.md');
  assert.equal(statSync(file).mode & 0o111, 0);
});

test('hash divergente no catálogo: recusa com 2 e não grava nada', async () => {
  const pkg = makePackage();
  const skill = pkg.catalog.skills[0];
  assert.ok(skill);
  const flipped = `${skill.sha256.slice(0, -1)}${skill.sha256.endsWith('0') ? '1' : '0'}`;
  const catalog: Catalog = { ...pkg.catalog, skills: [{ ...skill, sha256: flipped }] };
  const cwd = tempDir('obraforge-projeto-');
  const result = await addCommand(options({ root: pkg.root, catalog }, cwd, { tool: 'claude' }));
  assert.equal(result.code, EXIT_SECURITY_REFUSAL);
  assert.match(result.stderr.join('\n'), /hash .* não confere/);
  assertNothingWritten(cwd);
});

test('um byte alterado na pasta embutida: recusa com 2 e não grava nada', async () => {
  const pkg = makePackage();
  writeFileSync(join(pkg.root, 'skills', 'contexto', 'skill-teste', 'fixtures', 'entrada.csv'), 'a;b\n1;3\n');
  const cwd = tempDir('obraforge-projeto-');
  const result = await addCommand(options(pkg, cwd, { tool: 'claude' }));
  assert.equal(result.code, EXIT_SECURITY_REFUSAL);
  assertNothingWritten(cwd);
});

test('skill retirada: recusa com 2 e não grava nada', async () => {
  const pkg = makePackage();
  const catalog: Catalog = { ...pkg.catalog, retired: ['skill-velha'] };
  const cwd = tempDir('obraforge-projeto-');
  const result = await addCommand(options({ root: pkg.root, catalog }, cwd, { names: ['skill-velha'], tool: 'claude' }));
  assert.equal(result.code, EXIT_SECURITY_REFUSAL);
  assert.match(result.stderr.join('\n'), /retirada/);
  assertNothingWritten(cwd);
});

test('skill depreciada sem --yes e sem terminal: sai 1 e não grava nada; o motivo é sanitizado', async () => {
  const pkg = makePackage(['skill-teste'], { state: 'depreciada', deprecationReason: 'Norma revogada.\x1b[2J‮' });
  const cwd = tempDir('obraforge-projeto-');
  const result = await addCommand(options(pkg, cwd, { tool: 'claude' }));
  assert.equal(result.code, EXIT_USAGE_ERROR);
  assert.match(result.stderr.join('\n'), /--yes/);
  const warning = result.stdout.join('\n');
  assert.match(warning, /Motivo: Norma revogada\./);
  assert.ok(!warning.includes('\x1b') && !warning.includes('‮'));
  assertNothingWritten(cwd);
});

test('skill depreciada com --yes: instala', async () => {
  const pkg = makePackage(['skill-teste'], { state: 'depreciada', deprecationReason: 'Norma revogada.' });
  const cwd = tempDir('obraforge-projeto-');
  const result = await addCommand(options(pkg, cwd, { tool: 'claude', yes: true }));
  assert.equal(result.code, EXIT_SUCCESS);
  assert.ok(existsSync(join(cwd, '.claude', 'skills', 'skill-teste', 'SKILL.md')));
});

test('skill depreciada no terminal: pergunta; recusar não grava nada', async () => {
  const pkg = makePackage(['skill-teste'], { state: 'depreciada', deprecationReason: 'Norma revogada.' });
  const cwd = tempDir('obraforge-projeto-');
  const asked: string[] = [];
  const prompter: Prompter = {
    confirm: async (question) => {
      asked.push(question);
      return false;
    },
    choose: async () => undefined,
  };
  const result = await addCommand(options(pkg, cwd, { tool: 'claude', prompter }));
  assert.equal(result.code, EXIT_USAGE_ERROR);
  assert.equal(asked.length, 1);
  assertNothingWritten(cwd);
});

test('cópia local modificada sem --force: sai 1 e não altera nada', async () => {
  const pkg = makePackage();
  const cwd = tempDir('obraforge-projeto-');
  assert.equal((await addCommand(options(pkg, cwd, { tool: 'claude' }))).code, EXIT_SUCCESS);
  const file = join(cwd, '.claude', 'skills', 'skill-teste', 'SKILL.md');
  writeFileSync(file, 'minha edição\n');
  const result = await addCommand(options(pkg, cwd, { tool: 'claude' }));
  assert.equal(result.code, EXIT_USAGE_ERROR);
  assert.match(result.stderr.join('\n'), /--force/);
  assert.equal(readFileSync(file, 'utf8'), 'minha edição\n');
});

test('cópia local modificada com --force: substitui pela do catálogo, sem sobra', async () => {
  const pkg = makePackage();
  const cwd = tempDir('obraforge-projeto-');
  await addCommand(options(pkg, cwd, { tool: 'claude' }));
  const dir = join(cwd, '.claude', 'skills', 'skill-teste');
  writeFileSync(join(dir, 'SKILL.md'), 'minha edição\n');
  const result = await addCommand(options(pkg, cwd, { tool: 'claude', force: true }));
  assert.equal(result.code, EXIT_SUCCESS, result.stderr.join('\n'));
  assert.equal(hashSkillDir(dir).sha256, pkg.catalog.skills[0]?.sha256);
  assert.deepEqual(readdirSync(join(cwd, '.claude', 'skills')), ['skill-teste']);
});

test('cópia idêntica já instalada à mão: nada a fazer, e entra no registro', async () => {
  const pkg = makePackage();
  const cwd = tempDir('obraforge-projeto-');
  const dest = join(cwd, '.claude', 'skills', 'skill-teste');
  for (const [path, content] of Object.entries(FILES)) {
    mkdirSync(join(dest, path, '..'), { recursive: true });
    writeFileSync(join(dest, path), content);
  }
  const result = await addCommand(options(pkg, cwd, { tool: 'claude' }));
  assert.equal(result.code, EXIT_SUCCESS);
  assert.match(result.stdout.join('\n'), /Nada a fazer; registrada/);
  assert.equal(readLock(cwd).length, 1);
});

test('.claude é link simbólico para fora: recusa com 2 e não grava no alvo do link', async () => {
  const pkg = makePackage();
  const cwd = tempDir('obraforge-projeto-');
  const outside = tempDir('obraforge-fora-');
  symlinkSync(outside, join(cwd, '.claude'));
  const result = await addCommand(options(pkg, cwd, { tool: 'claude' }));
  assert.equal(result.code, EXIT_SECURITY_REFUSAL);
  assert.match(result.stderr.join('\n'), /link simbólico/);
  assert.deepEqual(readdirSync(outside), []);
  assert.ok(!existsSync(join(cwd, LOCK_FILE)));
});

test('.claude/skills é link simbólico: também recusa com 2', async () => {
  const pkg = makePackage();
  const cwd = tempDir('obraforge-projeto-');
  const outside = tempDir('obraforge-fora-');
  mkdirSync(join(cwd, '.claude'));
  symlinkSync(outside, join(cwd, '.claude', 'skills'));
  const result = await addCommand(options(pkg, cwd, { tool: 'claude' }));
  assert.equal(result.code, EXIT_SECURITY_REFUSAL);
  assert.deepEqual(readdirSync(outside), []);
});

test('registro local que é link simbólico: recusa com 2 antes de instalar', async () => {
  const pkg = makePackage();
  const cwd = tempDir('obraforge-projeto-');
  const outside = tempDir('obraforge-fora-');
  writeFileSync(join(outside, 'alvo.json'), '{"skills":[]}');
  symlinkSync(join(outside, 'alvo.json'), join(cwd, LOCK_FILE));
  const result = await addCommand(options(pkg, cwd, { tool: 'claude' }));
  assert.equal(result.code, EXIT_SECURITY_REFUSAL);
  assert.ok(!existsSync(join(cwd, '.claude')));
  assert.equal(readFileSync(join(outside, 'alvo.json'), 'utf8'), '{"skills":[]}');
});

test('registro local ilegível: sai 3 antes de instalar', async () => {
  const pkg = makePackage();
  const cwd = tempDir('obraforge-projeto-');
  writeFileSync(join(cwd, LOCK_FILE), '{ quebrado');
  const result = await addCommand(options(pkg, cwd, { tool: 'claude' }));
  assert.equal(result.code, EXIT_ENVIRONMENT_ERROR);
  assert.ok(!existsSync(join(cwd, '.claude')));
});

test('nome com ../ nunca vira caminho: sai 1 e não grava nada', async () => {
  const pkg = makePackage();
  const cwd = tempDir('obraforge-projeto-');
  for (const name of ['../skill-teste', 'skill-teste/../../x', '/etc/passwd', 'Skill-Teste']) {
    const result = await addCommand(options(pkg, cwd, { names: [name], tool: 'claude' }));
    assert.equal(result.code, EXIT_USAGE_ERROR, name);
  }
  assertNothingWritten(cwd);
});

test('catálogo com caminho fora de skills/<area>/<nome>: recusa com 2', async () => {
  const pkg = makePackage();
  const skill = pkg.catalog.skills[0];
  assert.ok(skill);
  const catalog: Catalog = { ...pkg.catalog, skills: [{ ...skill, path: 'skills/contexto/../../..' }] };
  const cwd = tempDir('obraforge-projeto-');
  const result = await addCommand(options({ root: pkg.root, catalog }, cwd, { tool: 'claude' }));
  assert.equal(result.code, EXIT_SECURITY_REFUSAL);
  assertNothingWritten(cwd);
});

test('nome desconhecido: sai 1 com sugestão, sem instalar a sugestão', async () => {
  const pkg = makePackage();
  const cwd = tempDir('obraforge-projeto-');
  const result = await addCommand(options(pkg, cwd, { names: ['skil-teste'], tool: 'claude' }));
  assert.equal(result.code, EXIT_USAGE_ERROR);
  assert.match(result.stderr.join('\n'), /Você quis dizer "skill-teste"\?/);
  assertNothingWritten(cwd);
});

test('sem --for e sem sinal: usa .agents/skills/ e avisa que o Claude Code não lê', async () => {
  const pkg = makePackage();
  const cwd = tempDir('obraforge-projeto-');
  const result = await addCommand(options(pkg, cwd));
  assert.equal(result.code, EXIT_SUCCESS);
  assert.match(result.stdout.join('\n'), /O Claude Code não lê essa pasta; para ele, use --for claude/);
  assert.ok(existsSync(join(cwd, '.agents', 'skills', 'skill-teste')));
});

test('sem --for, com .claude/: detecta o Claude Code', async () => {
  const pkg = makePackage();
  const cwd = tempDir('obraforge-projeto-');
  mkdirSync(join(cwd, '.claude'));
  const result = await addCommand(options(pkg, cwd));
  assert.equal(result.code, EXIT_SUCCESS);
  assert.ok(existsSync(join(cwd, '.claude', 'skills', 'skill-teste')));
});

test('sem --for, com .agents/ e .gemini/: mesmo destino, sem ambiguidade', async () => {
  const pkg = makePackage();
  const cwd = tempDir('obraforge-projeto-');
  mkdirSync(join(cwd, '.agents'));
  mkdirSync(join(cwd, '.gemini'));
  const result = await addCommand(options(pkg, cwd));
  assert.equal(result.code, EXIT_SUCCESS);
  assert.ok(existsSync(join(cwd, '.agents', 'skills', 'skill-teste')));
});

test('sem --for, com .claude/ e .agents/, sem terminal: sai 1 e não grava nada', async () => {
  const pkg = makePackage();
  const cwd = tempDir('obraforge-projeto-');
  mkdirSync(join(cwd, '.claude'));
  mkdirSync(join(cwd, '.agents'));
  const result = await addCommand(options(pkg, cwd));
  assert.equal(result.code, EXIT_USAGE_ERROR);
  assert.match(result.stderr.join('\n'), /--for/);
  assert.deepEqual(readdirSync(cwd).sort(), ['.agents', '.claude']);
  assert.deepEqual(readdirSync(join(cwd, '.claude')), []);
});

test('sem --for, com .claude/ e .agents/, no terminal: pergunta e usa a escolha', async () => {
  const pkg = makePackage();
  const cwd = tempDir('obraforge-projeto-');
  mkdirSync(join(cwd, '.claude'));
  mkdirSync(join(cwd, '.agents'));
  const prompter: Prompter = { confirm: async () => true, choose: async () => 0 };
  const result = await addCommand(options(pkg, cwd, { prompter }));
  assert.equal(result.code, EXIT_SUCCESS);
  assert.ok(existsSync(join(cwd, '.claude', 'skills', 'skill-teste')));
});

test('várias skills: uma falha não desfaz as outras, e o código final é o pior', async () => {
  const pkg = makePackage(['skill-um', 'skill-dois']);
  const cwd = tempDir('obraforge-projeto-');
  const result = await addCommand(options(pkg, cwd, { names: ['skill-um', 'nao-existe', 'skill-dois'], tool: 'claude' }));
  assert.equal(result.code, EXIT_USAGE_ERROR);
  assert.ok(existsSync(join(cwd, '.claude', 'skills', 'skill-um')));
  assert.ok(existsSync(join(cwd, '.claude', 'skills', 'skill-dois')));
  assert.equal(readLock(cwd).length, 2);
  assert.match(result.stdout.join('\n'), /Resumo: 2 de 3/);
});

test('recusa de segurança pesa mais que erro de uso no código final', async () => {
  const pkg = makePackage();
  const catalog: Catalog = { ...pkg.catalog, retired: ['skill-velha'] };
  const cwd = tempDir('obraforge-projeto-');
  const result = await addCommand(options({ root: pkg.root, catalog }, cwd, { names: ['nao-existe', 'skill-velha'], tool: 'claude' }));
  assert.equal(result.code, EXIT_SECURITY_REFUSAL);
});

test('link simbólico dentro da pasta embutida: recusa com 2', async () => {
  const pkg = makePackage();
  symlinkSync('../SKILL.md', join(pkg.root, 'skills', 'contexto', 'skill-teste', 'fixtures', 'atalho.md'));
  const cwd = tempDir('obraforge-projeto-');
  const result = await addCommand(options(pkg, cwd, { tool: 'claude' }));
  assert.equal(result.code, EXIT_SECURITY_REFUSAL);
  assertNothingWritten(cwd);
  assert.ok(lstatSync(join(pkg.root, 'skills', 'contexto', 'skill-teste', 'fixtures', 'atalho.md')).isSymbolicLink());
});

test('nome malicioso vindo do próprio catálogo: o padrão do nome segura, sai 1 e não grava nada', async () => {
  const pkg = makePackage();
  const skill = pkg.catalog.skills[0];
  assert.ok(skill);
  // Caminho e hash coerentes com o nome, para só a regra do nome poder recusar.
  const catalog: Catalog = { ...pkg.catalog, skills: [{ ...skill, name: '../fora', path: 'skills/contexto/../fora' }] };
  mkdirSync(join(pkg.root, 'skills', 'fora'), { recursive: true });
  writeFileSync(join(pkg.root, 'skills', 'fora', 'SKILL.md'), FILES['SKILL.md'] ?? '');
  const cwd = tempDir('obraforge-projeto-');
  const result = await addCommand(options({ root: pkg.root, catalog }, cwd, { names: ['../fora'], tool: 'claude' }));
  assert.equal(result.code, EXIT_USAGE_ERROR);
  assertNothingWritten(cwd);
});
