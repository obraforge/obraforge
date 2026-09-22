import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { EXIT_ENVIRONMENT_ERROR, EXIT_SUCCESS } from '../src/exit-codes.js';
import { listCommand, searchCommand } from '../src/list-command.js';

function tempCatalogPath(): { dir: string; file: string } {
  const dir = mkdtempSync(join(tmpdir(), 'obraforge-catalog-'));
  return { dir, file: join(dir, 'catalog.json') };
}

test('catálogo vazio imprime a frase exata e sai 0', () => {
  const { dir, file } = tempCatalogPath();
  try {
    writeFileSync(file, JSON.stringify({ version: '0.0.1', areas: [], retired: [], skills: [] }));
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
      retired: [],
      skills: [
        {
          name: 'skill-um',
          area: 'orcamento',
          phase: 1,
          version: '1.0.0',
          state: 'publicada',
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
          state: 'publicada',
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
    assert.equal(lines[0], 'skill-um (orcamento, fase 1, v1.0.0) — Descrição limpa, sem nada estranho.');
    assert.equal(lines[1], 'skill-dois (contexto, fase 1, v1.0.0) — antes[2J]0;titulodepois');
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

function writeCatalog(file: string): void {
  const skill = (name: string, area: string, phase: number, description: string, extra: object = {}): object => ({
    name,
    area,
    phase,
    version: '1.0.0',
    state: 'publicada',
    description,
    references: [],
    path: `skills/${area}/${name}`,
    sha256: 'c'.repeat(64),
    ...extra,
  });
  writeFileSync(
    file,
    JSON.stringify({
      version: '0.1.0',
      areas: [],
      retired: [],
      skills: [
        skill('validar-planilha-orcamentaria', 'orcamento', 1, 'Confere a planilha orçamentária.'),
        skill('checklist-edital', 'licitacao', 1, 'Checklist do edital de licitação.', { state: 'depreciada', deprecationReason: 'Teste.' }),
        skill('estruturar-eap', 'planejamento', 2, 'Estrutura a EAP.'),
      ],
    }),
  );
}

test('list --area e --fase filtram, e a skill depreciada aparece marcada', () => {
  const { dir, file } = tempCatalogPath();
  try {
    writeCatalog(file);
    assert.equal(listCommand(pathToFileURL(file), { area: 'licitacao' }).stdout, 'checklist-edital (licitacao, fase 1, v1.0.0, depreciada) — Checklist do edital de licitação.');
    assert.equal((listCommand(pathToFileURL(file), { phase: 1 }).stdout ?? '').split('\n').length, 2);
    assert.equal(listCommand(pathToFileURL(file), { area: 'fiscal' }).stdout, 'Nenhuma skill com esses filtros nesta versão.');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('search procura em nome, descrição e área, sem caixa e sem acento', () => {
  const { dir, file } = tempCatalogPath();
  try {
    writeCatalog(file);
    assert.match(searchCommand('ORÇAMENTO', pathToFileURL(file)).stdout ?? '', /^validar-planilha-orcamentaria /);
    assert.match(searchCommand('edital', pathToFileURL(file)).stdout ?? '', /^checklist-edital /);
    assert.match(searchCommand('planejamento', pathToFileURL(file)).stdout ?? '', /^estruturar-eap /);
    assert.equal(searchCommand('telhado\x1b[2J', pathToFileURL(file)).stdout, 'Nenhuma skill encontrada para "telhado[2J".');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('catálogo sem "retired" ou com estado desconhecido sai 3 (fail-closed)', () => {
  const { dir, file } = tempCatalogPath();
  try {
    writeFileSync(file, JSON.stringify({ version: '0.1.0', skills: [] }));
    assert.equal(listCommand(pathToFileURL(file)).code, EXIT_ENVIRONMENT_ERROR);
    writeCatalog(file);
    const catalog = JSON.parse(readFileSync(file, 'utf8')) as { skills: Array<Record<string, unknown>> };
    const first = catalog.skills[0];
    assert.ok(first);
    first['state'] = 'suspensa';
    writeFileSync(file, JSON.stringify(catalog));
    assert.equal(listCommand(pathToFileURL(file)).code, EXIT_ENVIRONMENT_ERROR);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Achado A1 da revisão adversarial do C1: o catálogo é validado na leitura. Nome, área e versão
// com caractere fora do padrão invalidam o catálogo inteiro (fail-closed).
test('A1: catálogo com escape no nome, na área ou na versão sai 3', () => {
  const { dir, file } = tempCatalogPath();
  try {
    for (const [key, value] of [['name', 'skill\x1bc'], ['area', 'x\x1b[2Jy'], ['version', '1.0.0\x1b[31m']] as const) {
      writeCatalog(file);
      const catalog = JSON.parse(readFileSync(file, 'utf8')) as { skills: Array<Record<string, unknown>> };
      const first = catalog.skills[0];
      assert.ok(first);
      first[key] = value;
      writeFileSync(file, JSON.stringify(catalog));
      assert.equal(listCommand(pathToFileURL(file)).code, EXIT_ENVIRONMENT_ERROR, key);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
