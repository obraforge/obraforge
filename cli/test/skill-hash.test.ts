import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { hashSkillDir } from '../src/skill-hash.js';

// npm roda os testes do workspace com cwd = cli/; o catalog.json e skills/ reais ficam na raiz.
const ROOT_DIR = join(process.cwd(), '..');

// O add confere contra o hash que o gerador do catálogo (tools/) gravou. As duas implementações
// precisam concordar em toda skill real do repositório.
test('o hash da CLI é igual ao sha256 do catalog.json em cada skill real', () => {
  const catalog = JSON.parse(readFileSync(join(ROOT_DIR, 'catalog.json'), 'utf8')) as { skills: Array<{ name: string; path: string; sha256: string }> };
  for (const skill of catalog.skills) {
    assert.equal(hashSkillDir(join(ROOT_DIR, skill.path)).sha256, skill.sha256, skill.name);
  }
});

// Mesmo formato exato do teste do gerador (tools/test/catalog.test.ts): linhas "caminho\0sha\n",
// ordenadas pelos bytes UTF-8 do caminho em NFC, sem arquivo oculto.
test('formato exato: ordem por bytes, caminho em NFC e arquivo oculto ignorado', () => {
  const dir = mkdtempSync(join(tmpdir(), 'obraforge-hash-'));
  try {
    const files: Record<string, string> = { 'b.md': 'B', 'a/z.md': 'Z', 'Á.md': 'acento', 'ç.md': 'cedilha' };
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(join(dir, path, '..'), { recursive: true });
      writeFileSync(join(dir, path.normalize('NFD')), content);
    }
    writeFileSync(join(dir, '.DS_Store'), 'lixo do sistema');
    const sorted = Object.keys(files)
      .map((path) => path.normalize('NFC'))
      .sort((a, b) => Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8')));
    const lines = sorted.map((path) => `${path}\0${createHash('sha256').update(files[path] ?? '').digest('hex')}\n`);
    const expected = createHash('sha256').update(Buffer.from(lines.join(''), 'utf8')).digest('hex');
    assert.equal(hashSkillDir(dir).sha256, expected);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
