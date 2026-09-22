import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

// npm roda os testes do workspace com cwd = cli/ (ver AGENTS.md). O prepack copia da raiz do
// monorepo, um nível acima.
const ROOT_DIR = join(process.cwd(), '..');
// No Windows, npm e o bin instalado são scripts .cmd, que só rodam por um shell.
const IS_WINDOWS = process.platform === 'win32';

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
      shell: IS_WINDOWS,
    });
    const [report] = JSON.parse(packStdout) as Array<{ filename: string }>;
    assert.ok(report, 'npm pack não retornou nenhum pacote');
    const tarball = join(packDir, report.filename);

    execFileSync('npm', ['install', tarball, '--no-audit', '--no-fund', '--no-save'], {
      cwd: installDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: IS_WINDOWS,
    });

    const binPath = join(installDir, 'node_modules', '.bin', IS_WINDOWS ? 'obraforge.cmd' : 'obraforge');
    // cwd do teste é cli/ (ver comentário acima); lê a versão do próprio package.json do pacote.
    const expectedVersion = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version;

    const versionOutput = execFileSync(binPath, ['--version'], { encoding: 'utf8', shell: IS_WINDOWS }).trim();
    assert.equal(versionOutput, expectedVersion);

    // O esperado sai do mesmo catalog.json que o prepack copiou para dentro do pacote, e não de
    // um estado fixo do repositório: o teste vale com o catálogo vazio e com skills.
    const catalog = JSON.parse(readFileSync(join(ROOT_DIR, 'catalog.json'), 'utf8')) as {
      skills: Array<{ name: string; area: string }>;
    };
    const listOutput = execFileSync(binPath, ['list'], { encoding: 'utf8', shell: IS_WINDOWS }).trim();
    if (catalog.skills.length === 0) {
      assert.equal(listOutput, 'Nenhuma skill publicada nesta versão.');
    } else {
      const lines = listOutput.split('\n');
      assert.equal(lines.length, catalog.skills.length);
      catalog.skills.forEach((skill, i) => {
        assert.ok(lines[i]?.startsWith(`${skill.name} (${skill.area}, fase `), `linha ${i + 1}: ${lines[i]}`);
      });
    }
  } finally {
    rmSync(packDir, { recursive: true, force: true });
    rmSync(installDir, { recursive: true, force: true });
  }
});
