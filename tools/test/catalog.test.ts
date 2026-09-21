import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, symlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { AREAS } from '../src/areas.js';
import { buildCatalog, CatalogBuildError, formatCatalogJson } from '../src/catalog.js';
import { makeTempDir, removeTempDirs, REPO_ROOT } from './helpers.js';

after(removeTempDirs);

function skillMd(area: string, name: string): string {
  return [
    '---',
    `name: ${name}`,
    `description: Skill de teste "${name}".`,
    'metadata:',
    `  obraforge-area: "${area}"`,
    '  obraforge-fase: "1"',
    '  obraforge-versao: "1.0.0"',
    '---',
    '',
    'Corpo de teste.',
    '',
  ].join('\n');
}

interface WriteSkillOptions {
  normas?: readonly string[];
  extraFiles?: Record<string, string>;
}

async function writeSkill(skillsRoot: string, area: string, name: string, options: WriteSkillOptions = {}): Promise<string> {
  const dir = join(skillsRoot, area, name);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'SKILL.md'), skillMd(area, name));
  if (options.normas !== undefined) {
    await mkdir(join(dir, 'references'), { recursive: true });
    const body = options.normas
      .map((heading) => `## ${heading}\n- Título: Título de teste\n- Ano: 2024\n- Fonte: https://exemplo.gov.br\n`)
      .join('\n');
    await writeFile(join(dir, 'references', 'normas.md'), body);
  }
  for (const [relPath, content] of Object.entries(options.extraFiles ?? {})) {
    const filePath = join(dir, relPath);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, content);
  }
  return dir;
}

async function writePackage(root: string, version: string): Promise<string> {
  const path = join(root, 'cli-package.json');
  await writeFile(path, JSON.stringify({ version }));
  return path;
}

test('gerar duas vezes seguidas produz saída idêntica byte a byte', async () => {
  const root = await makeTempDir();
  const skillsRoot = join(root, 'skills');
  await writeSkill(skillsRoot, 'contexto', 'exemplo-um', {
    normas: ['Lei 14.133/2021'],
    extraFiles: { 'fixtures/entrada.txt': 'conteudo de entrada' },
  });
  const pkg = await writePackage(root, '9.9.9');

  const first = formatCatalogJson(await buildCatalog(skillsRoot, pkg));
  const second = formatCatalogJson(await buildCatalog(skillsRoot, pkg));
  assert.equal(first, second);
});

test('alterar um byte em um arquivo de uma skill muda o sha256 só daquela skill', async () => {
  const root = await makeTempDir();
  const skillsRoot = join(root, 'skills');
  await writeSkill(skillsRoot, 'contexto', 'skill-a', { extraFiles: { 'fixtures/entrada.txt': 'conteudo-a' } });
  await writeSkill(skillsRoot, 'orcamento', 'skill-b', { extraFiles: { 'fixtures/entrada.txt': 'conteudo-b' } });
  const pkg = await writePackage(root, '9.9.9');

  const before = await buildCatalog(skillsRoot, pkg);
  // Ordem esperada: "orcamento" vem antes de "contexto" em areas.ts.
  assert.deepEqual(
    before.skills.map((skill) => skill.name),
    ['skill-b', 'skill-a'],
  );
  const hashABefore = before.skills.find((skill) => skill.name === 'skill-a')?.sha256;
  const hashBBefore = before.skills.find((skill) => skill.name === 'skill-b')?.sha256;
  assert.ok(hashABefore);
  assert.ok(hashBBefore);

  await writeFile(join(skillsRoot, 'contexto', 'skill-a', 'fixtures', 'entrada.txt'), 'Xonteudo-a');

  const after1 = await buildCatalog(skillsRoot, pkg);
  const hashAAfter = after1.skills.find((skill) => skill.name === 'skill-a')?.sha256;
  const hashBAfter = after1.skills.find((skill) => skill.name === 'skill-b')?.sha256;
  assert.notEqual(hashAAfter, hashABefore);
  assert.equal(hashBAfter, hashBBefore);
});

test('hash da skill usa ordenação por bytes UTF-8 e o formato exato da linha (path\\0sha256hex\\n)', async () => {
  const root = await makeTempDir();
  const skillsRoot = join(root, 'skills');
  const dir = await writeSkill(skillsRoot, 'contexto', 'skill-bytes');

  // U+E000 (plano básico, UTF-8 em 3 bytes: EE 80 80) e U+1F600 (plano suplementar, UTF-8 em 4
  // bytes: F0 9F 98 80). A comparação ingênua de string do JS compara por unidade UTF-16: o par
  // substituto de U+1F600 começa em 0xD83D, menor que 0xE000, então ordenaria o emoji antes. Por
  // bytes UTF-8 é o contrário (0xEE < 0xF0). O teste prova que a implementação usa Buffer.compare.
  const nameBmp = 'arquivo-.txt';
  const nameSupplementary = 'arquivo-\u{1F600}.txt';
  assert.ok(nameSupplementary < nameBmp, 'pré-condição do teste: comparação de string JS deveria inverter a ordem');

  await writeFile(join(dir, nameBmp), 'conteudo-bmp');
  await writeFile(join(dir, nameSupplementary), 'conteudo-emoji');

  const pkg = await writePackage(root, '9.9.9');
  const catalog = await buildCatalog(skillsRoot, pkg);
  const entry = catalog.skills.find((skill) => skill.name === 'skill-bytes');
  assert.ok(entry);

  // Recalcula o hash esperado de forma independente da implementação: lê os três arquivos, ordena
  // pelos bytes UTF-8 do caminho (nameBmp antes de nameSupplementary) e monta a linha exata.
  const raw: Array<[string, Buffer]> = [
    ['SKILL.md', await readFile(join(dir, 'SKILL.md'))],
    [nameBmp, await readFile(join(dir, nameBmp))],
    [nameSupplementary, await readFile(join(dir, nameSupplementary))],
  ];
  const sorted = [...raw].sort(([a], [b]) => Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8')));
  assert.deepEqual(
    sorted.map(([path]) => path),
    ['SKILL.md', nameBmp, nameSupplementary],
  );
  const lines = sorted.map(([path, bytes]) =>
    Buffer.from(`${path}\0${createHash('sha256').update(bytes).digest('hex')}\n`, 'utf8'),
  );
  const expected = createHash('sha256').update(Buffer.concat(lines)).digest('hex');

  assert.equal(entry?.sha256, expected);
});

test('skill sem fixtures/ gera entrada normalmente (independência do validador)', async () => {
  const root = await makeTempDir();
  const skillsRoot = join(root, 'skills');
  await writeSkill(skillsRoot, 'contexto', 'sem-fixture');
  const pkg = await writePackage(root, '9.9.9');

  const catalog = await buildCatalog(skillsRoot, pkg);
  assert.equal(catalog.skills.length, 1);
  const [entry] = catalog.skills;
  assert.equal(entry?.name, 'sem-fixture');
  assert.equal(entry?.area, 'contexto');
  assert.equal(entry?.phase, 1);
  assert.equal(entry?.version, '1.0.0');
  assert.deepEqual(entry?.references, []);
  assert.equal(entry?.path, 'skills/contexto/sem-fixture');
});

test('skill com link simbólico dentro da pasta faz o gerador falhar', async () => {
  const root = await makeTempDir();
  const skillsRoot = join(root, 'skills');
  const dir = await writeSkill(skillsRoot, 'contexto', 'com-link');
  await symlink('/etc/hosts', join(dir, 'link-externo'));
  const pkg = await writePackage(root, '9.9.9');

  await assert.rejects(buildCatalog(skillsRoot, pkg), CatalogBuildError);
});

test('skill com arquivo especial (não é link) dentro da pasta também falha', async () => {
  const root = await makeTempDir();
  const skillsRoot = join(root, 'skills');
  const dir = await writeSkill(skillsRoot, 'contexto', 'com-fifo');
  const fifo = join(dir, 'pipe');
  const result = spawnSync('mkfifo', [fifo]);
  if (result.status !== 0) {
    // mkfifo indisponível no ambiente: a asserção de LINK/other já é coberta pelo teste do
    // symlink acima, então este caso extra é dispensado sem falhar a suíte.
    return;
  }
  const pkg = await writePackage(root, '9.9.9');
  await assert.rejects(buildCatalog(skillsRoot, pkg), CatalogBuildError);
});

// Confere contra a árvore, não contra o catalog.json commitado: a frescura do arquivo é do job
// catalogo, e este teste não pode ficar vermelho junto com ele.
test('skills/ real do repositório gera uma entrada por pasta de skill', async () => {
  const pkg = join(REPO_ROOT, 'cli', 'package.json');
  const skillsRoot = join(REPO_ROOT, 'skills');
  const catalog = await buildCatalog(skillsRoot, pkg);
  const dirs: string[] = [];
  for (const area of await readdir(skillsRoot, { withFileTypes: true })) {
    if (area.isDirectory()) {
      for (const skill of await readdir(join(skillsRoot, area.name), { withFileTypes: true })) {
        if (skill.isDirectory()) {
          dirs.push(`skills/${area.name}/${skill.name}`);
        }
      }
    }
  }
  assert.deepEqual(catalog.skills.map((skill) => skill.path).sort(), dirs.sort());
  assert.deepEqual(catalog.areas, AREAS);
});

test('references são os headings "## " de normas.md, na ordem do arquivo', async () => {
  const root = await makeTempDir();
  const skillsRoot = join(root, 'skills');
  await writeSkill(skillsRoot, 'contexto', 'com-normas', { normas: ['NR-12', 'Lei 14.133/2021'] });
  const pkg = await writePackage(root, '9.9.9');
  const catalog = await buildCatalog(skillsRoot, pkg);
  const entry = catalog.skills.find((skill) => skill.name === 'com-normas');
  assert.deepEqual(entry?.references, ['NR-12', 'Lei 14.133/2021']);
});

test('campo necessário ausente no metadata faz o gerador falhar com mensagem', async () => {
  const root = await makeTempDir();
  const skillsRoot = join(root, 'skills');
  const dir = join(skillsRoot, 'contexto', 'sem-fase');
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, 'SKILL.md'),
    ['---', 'name: sem-fase', 'description: Skill sem obraforge-fase.', 'metadata:', '  obraforge-area: "contexto"', '  obraforge-versao: "1.0.0"', '---', ''].join(
      '\n',
    ),
  );
  const pkg = await writePackage(root, '9.9.9');
  await assert.rejects(buildCatalog(skillsRoot, pkg), (error: unknown) => {
    assert.ok(error instanceof CatalogBuildError);
    assert.match(error.message, /obraforge-fase/);
    return true;
  });
});
