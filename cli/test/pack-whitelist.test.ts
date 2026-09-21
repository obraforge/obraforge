import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { test } from 'node:test';

// npm roda os testes do workspace com cwd = cli/ (ver AGENTS.md). O prepack copia da raiz do
// monorepo, um nível acima.
const ROOT_DIR = join(process.cwd(), '..');

function listFilesRecursive(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFilesRecursive(full));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

function toPosix(path: string): string {
  return path.split(sep).join('/');
}

test('npm pack leva exatamente a lista branca: nada de dist/test, scripts, tsconfig, src ou test', () => {
  const stdout = execFileSync('npm', ['pack', '--dry-run', '--json', '--workspace', 'cli'], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const [report] = JSON.parse(stdout) as Array<{ files: Array<{ path: string }> }>;
  assert.ok(report, 'npm pack --dry-run --json não retornou nenhum pacote');
  const packed = new Set(report.files.map((f) => f.path));

  // A lista branca esperada, construída a partir do estado real do repositório: package.json
  // (sempre incluído pelo npm), README.md, LICENSE, catalog.json (copiados pelo prepack a partir
  // da raiz), todo arquivo dentro de skills/ (idem) e todo .js compilado em dist/src/.
  const expected = new Set<string>(['package.json', 'README.md', 'LICENSE', 'catalog.json']);

  const cliDir = process.cwd();
  for (const file of listFilesRecursive(join(cliDir, 'skills'))) {
    expected.add(toPosix(relative(cliDir, file)));
  }
  for (const file of listFilesRecursive(join(cliDir, 'dist', 'src'))) {
    expected.add(toPosix(relative(cliDir, file)));
  }

  const missing = [...expected].filter((path) => !packed.has(path));
  const extra = [...packed].filter((path) => !expected.has(path));

  assert.deepEqual(missing, [], `arquivos esperados que faltaram no tarball: ${missing.join(', ')}`);
  assert.deepEqual(extra, [], `arquivos indevidos que entraram no tarball: ${extra.join(', ')}`);

  // Confirma explicitamente que nada de dist/test, scripts/, tsconfig.json, src/ ou test/ vazou.
  for (const path of packed) {
    assert.ok(!path.startsWith('dist/test/'), `dist/test/ não pode entrar no tarball: ${path}`);
    assert.ok(!path.startsWith('scripts/'), `scripts/ não pode entrar no tarball: ${path}`);
    assert.notEqual(path, 'tsconfig.json');
    assert.ok(!path.startsWith('src/'), `src/ não pode entrar no tarball: ${path}`);
    assert.ok(!path.startsWith('test/'), `test/ não pode entrar no tarball: ${path}`);
  }
});
