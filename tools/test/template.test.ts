import assert from 'node:assert/strict';
import { cp, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { AVISO_PADRAO } from '../src/constants.js';
import { ownValue, parseFrontmatter, isPlainObject } from '../src/frontmatter.js';
import { splitLines } from '../src/text.js';
import { validateSkillsRoot } from '../src/validate.js';
import { makeTempDir, removeTempDirs, REPO_ROOT } from './helpers.js';

after(removeTempDirs);

const TEMPLATE_DIR = join(REPO_ROOT, 'docs', 'template-skill');

test('o aviso do template é idêntico à constante AVISO_PADRAO', async () => {
  const lines = splitLines(await readFile(join(TEMPLATE_DIR, 'SKILL.md'), 'utf8'));
  const avisos = lines.filter((line) => line.startsWith('> **Aviso:**'));
  assert.deepEqual(avisos, [AVISO_PADRAO]);
});

test('o template copiado para <area>/<nome>/ passa no validador', async () => {
  const frontmatter = parseFrontmatter(splitLines(await readFile(join(TEMPLATE_DIR, 'SKILL.md'), 'utf8')));
  assert.ok(frontmatter.ok);
  const name = ownValue(frontmatter.data, 'name');
  const metadata = ownValue(frontmatter.data, 'metadata');
  assert.ok(typeof name === 'string' && isPlainObject(metadata));
  const area = ownValue(metadata, 'obraforge-area');
  assert.ok(typeof area === 'string');

  const root = join(await makeTempDir(), 'skills');
  await cp(TEMPLATE_DIR, join(root, area, name), { recursive: true });
  assert.deepEqual(await validateSkillsRoot(root), []);
});
