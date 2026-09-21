import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { isMap, isSeq, isScalar, LineCounter, parseDocument } from 'yaml';

// Raiz do repositório onde os workflows do GitHub Actions vivem. O AGENTS.md proíbe action de
// terceiro sem SHA completo fixado (40 caracteres hex); este teste é a cerca que impõe isso.
const WORKFLOWS_DIR = fileURLToPath(new URL('../../../.github/workflows/', import.meta.url));

const SHA40 = /^[0-9a-f]{40}$/;
const LOCAL_ACTION = /^\.\//;

interface UsesViolation {
  file: string;
  line: number | undefined;
  value: string;
}

// Só aceita `owner/repo[/caminho]@<sha40>` ou `./ação-local`. Rejeita tag (`@v1`), branch
// (`@main`) e SHA curto.
function isPinned(uses: string): boolean {
  if (LOCAL_ACTION.test(uses)) {
    return true;
  }
  const at = uses.lastIndexOf('@');
  if (at === -1) {
    return false;
  }
  return SHA40.test(uses.slice(at + 1));
}

// Percorre o documento YAML já parseado e coleta todo valor de uma chave `uses:` que não esteja
// fixado por SHA. Caminha por mapas e sequências para achar `uses:` em qualquer profundidade
// (step de job comum, ou job que chama workflow reusável).
export function findUnpinnedUses(yamlText: string, file: string): UsesViolation[] {
  const lineCounter = new LineCounter();
  const doc = parseDocument(yamlText, { lineCounter, strict: true });
  const violations: UsesViolation[] = [];

  function visit(node: unknown): void {
    if (isMap(node)) {
      for (const pair of node.items) {
        if (isScalar(pair.key) && pair.key.value === 'uses' && isScalar(pair.value) && typeof pair.value.value === 'string') {
          const value = pair.value.value;
          if (!isPinned(value)) {
            const range = pair.value.range;
            const line = range ? lineCounter.linePos(range[0]).line : undefined;
            violations.push({ file, line, value });
          }
        }
        visit(pair.value);
      }
    } else if (isSeq(node)) {
      for (const item of node.items) {
        visit(item);
      }
    }
  }

  visit(doc.contents);
  return violations;
}

async function listWorkflowFiles(): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(WORKFLOWS_DIR, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isFile() && /\.ya?ml$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

test('todo uses: em .github/workflows/*.yml (inclusive release.yml, quando existir) está fixado por SHA de 40 caracteres hex', async () => {
  const files = await listWorkflowFiles();
  assert.ok(files.length > 0, `esperava pelo menos um workflow em ${WORKFLOWS_DIR}`);

  const violations: UsesViolation[] = [];
  for (const file of files) {
    const text = await readFile(join(WORKFLOWS_DIR, file), 'utf8');
    const doc = parseDocument(text, { strict: true });
    assert.equal(
      doc.errors.length,
      0,
      `${file} não parseia como YAML: ${doc.errors.map((error) => error.message).join('; ')}`,
    );
    violations.push(...findUnpinnedUses(text, file));
  }

  assert.deepEqual(
    violations,
    [],
    `uses: sem SHA de 40 caracteres hex:\n${violations
      .map((violation) => `  ${violation.file}:${violation.line ?? '?'} uses: ${violation.value}`)
      .join('\n')}`,
  );
});

test('a checagem acusa um uses: fixado por tag em vez de SHA (vermelho da regra)', () => {
  const yamlComTag = [
    'jobs:',
    '  x:',
    '    steps:',
    '      - uses: actions/checkout@v7.0.1',
  ].join('\n');

  const violations = findUnpinnedUses(yamlComTag, 'exemplo.yml');
  assert.equal(violations.length, 1);
  assert.equal(violations[0]?.value, 'actions/checkout@v7.0.1');
  assert.equal(violations[0]?.line, 4);
});

test('a checagem acusa um uses: fixado por branch', () => {
  const yamlComBranch = ['jobs:', '  x:', '    steps:', '      - uses: actions/checkout@main'].join('\n');
  const violations = findUnpinnedUses(yamlComBranch, 'exemplo.yml');
  assert.equal(violations.length, 1);
});

test('./ação local não é acusada', () => {
  const yamlLocal = [
    'jobs:',
    '  x:',
    '    steps:',
    '      - uses: ./.github/actions/local',
  ].join('\n');
  assert.deepEqual(findUnpinnedUses(yamlLocal, 'exemplo.yml'), []);
});

test('uses: fixado por SHA de 40 hex não é acusado, com ou sem comentário de tag', () => {
  const yamlPinned = [
    'jobs:',
    '  x:',
    '    steps:',
    '      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1',
    '  y:',
    '    uses: owner/repo/.github/workflows/reusable.yml@0123456789abcdef0123456789abcdef01234567',
  ].join('\n');
  assert.deepEqual(findUnpinnedUses(yamlPinned, 'exemplo.yml'), []);
});
