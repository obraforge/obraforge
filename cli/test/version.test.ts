import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { readVersion } from '../src/version.js';

test('lê a versão do package.json do próprio pacote', () => {
  // O npm roda o teste com o diretório do workspace como cwd.
  const expected = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version;
  assert.equal(readVersion(), expected);
});

test('falha quando o package.json não tem versão', () => {
  const dir = mkdtempSync(join(tmpdir(), 'obraforge-version-'));
  const file = join(dir, 'package.json');
  writeFileSync(file, JSON.stringify({ name: 'sem-versao' }));
  assert.throws(() => readVersion(pathToFileURL(file)), /sem o campo "version"/);
});
