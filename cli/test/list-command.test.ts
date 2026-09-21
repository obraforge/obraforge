import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { EXIT_ENVIRONMENT_ERROR, EXIT_SUCCESS } from '../src/exit-codes.js';
import { listCommand } from '../src/list-command.js';

function tempCatalogPath(): { dir: string; file: string } {
  const dir = mkdtempSync(join(tmpdir(), 'obraforge-catalog-'));
  return { dir, file: join(dir, 'catalog.json') };
}

test('catálogo vazio imprime a frase exata e sai 0', () => {
  const { dir, file } = tempCatalogPath();
  try {
    writeFileSync(file, JSON.stringify({ version: '0.0.1', areas: [], skills: [] }));
    const result = listCommand(pathToFileURL(file));
    assert.equal(result.code, EXIT_SUCCESS);
    assert.equal(result.stdout, 'Nenhuma skill publicada nesta versão.');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('catálogo com skills imprime uma linha por skill com a descrição sanitizada', () => {
  const { dir, file } = tempCatalogPath();
  try {
    const catalog = {
      version: '0.0.1',
      areas: ['orcamento'],
      skills: [
        {
          name: 'skill-um',
          area: 'orcamento',
          phase: 1,
          version: '1.0.0',
          description: 'Descrição limpa, sem nada estranho.',
          references: [],
          path: 'skills/orcamento/skill-um',
          sha256: 'a'.repeat(64),
        },
        {
          name: 'skill-dois',
          area: 'contexto',
          phase: 1,
          version: '1.0.0',
          // Vindo de PR de terceiro: limpa tela ANSI, título de janela (OSC + BEL) e sobrescrita
          // bidirecional (U+202E). Nada disso pode chegar ao terminal.
          description: 'antes\x1b[2J\x1b]0;titulo\x07‮depois',
          references: [],
          path: 'skills/contexto/skill-dois',
          sha256: 'b'.repeat(64),
        },
      ],
    };
    writeFileSync(file, JSON.stringify(catalog));
    const result = listCommand(pathToFileURL(file));
    assert.equal(result.code, EXIT_SUCCESS);
    const lines = (result.stdout ?? '').split('\n');
    assert.equal(lines.length, 2);
    assert.equal(lines[0], 'skill-um (orcamento) — Descrição limpa, sem nada estranho.');
    assert.equal(lines[1], 'skill-dois (contexto) — antes[2J]0;titulodepois');
    for (const line of lines) {
      assert.ok(!line.includes('\x1b'));
      assert.ok(!line.includes('\x07'));
      assert.ok(!line.includes('‮'));
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('catálogo ausente sai 3', () => {
  const { dir, file } = tempCatalogPath();
  try {
    const result = listCommand(pathToFileURL(file));
    assert.equal(result.code, EXIT_ENVIRONMENT_ERROR);
    assert.match(result.stderr ?? '', /Erro de ambiente/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('catálogo ilegível (JSON inválido) sai 3', () => {
  const { dir, file } = tempCatalogPath();
  try {
    writeFileSync(file, '{ isto não é json válido');
    const result = listCommand(pathToFileURL(file));
    assert.equal(result.code, EXIT_ENVIRONMENT_ERROR);
    assert.match(result.stderr ?? '', /Erro de ambiente/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('catálogo com formato inesperado (sem "skills") sai 3', () => {
  const { dir, file } = tempCatalogPath();
  try {
    writeFileSync(file, JSON.stringify({ version: '0.0.1' }));
    const result = listCommand(pathToFileURL(file));
    assert.equal(result.code, EXIT_ENVIRONMENT_ERROR);
    assert.match(result.stderr ?? '', /Erro de ambiente/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
