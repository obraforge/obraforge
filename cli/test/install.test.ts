import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

// npm roda os testes do workspace com cwd = cli/ (ver AGENTS.md). O prepack copia da raiz do
// monorepo, um nível acima.
const ROOT_DIR = join(process.cwd(), '..');

// Empacota de verdade, instala o tarball numa pasta vazia (sem rede: o pacote não tem
// dependência) e roda o binário instalado — o artefato real que o usuário do `npx obraforge`
// recebe, não só a função testada em memória.
test('npm pack + npm install do tarball: o obraforge instalado roda --version e list', { timeout: 60_000 }, () => {
  const packDir = mkdtempSync(join(tmpdir(), 'obraforge-pack-'));
  const installDir = mkdtempSync(join(tmpdir(), 'obraforge-install-'));
  try {
    const packStdout = execFileSync('npm', ['pack', '--json', '--workspace', 'cli', '--pack-destination', packDir], {
      cwd: ROOT_DIR,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const [report] = JSON.parse(packStdout) as Array<{ filename: string }>;
    assert.ok(report, 'npm pack não retornou nenhum pacote');
    const tarball = join(packDir, report.filename);

    execFileSync('npm', ['install', tarball, '--no-audit', '--no-fund', '--no-save'], {
      cwd: installDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const binPath = join(installDir, 'node_modules', '.bin', 'obraforge');
    // cwd do teste é cli/ (ver comentário acima); lê a versão do próprio package.json do pacote.
    const expectedVersion = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version;

    const versionOutput = execFileSync(binPath, ['--version'], { encoding: 'utf8' }).trim();
    assert.equal(versionOutput, expectedVersion);

    const listOutput = execFileSync(binPath, ['list'], { encoding: 'utf8' }).trim();
    assert.equal(listOutput, 'Nenhuma skill publicada nesta versão.');
  } finally {
    rmSync(packDir, { recursive: true, force: true });
    rmSync(installDir, { recursive: true, force: true });
  }
});
