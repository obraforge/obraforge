import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { EXIT_SUCCESS, EXIT_USAGE_ERROR } from '../src/exit-codes.js';
import { run, USAGE } from '../src/main.js';

async function captureConsole<T>(fn: () => Promise<T>): Promise<{ result: T; stdout: string[]; stderr: string[] }> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const originalLog = console.log;
  const originalError = console.error;
  console.log = (...args: unknown[]) => {
    stdout.push(args.map(String).join(' '));
  };
  console.error = (...args: unknown[]) => {
    stderr.push(args.map(String).join(' '));
  };
  try {
    return { result: await fn(), stdout, stderr };
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}

test('--version imprime a versão do package.json', async () => {
  const expected = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version;
  const { result, stdout } = await captureConsole(() => run(['--version']));
  assert.equal(result, EXIT_SUCCESS);
  assert.deepEqual(stdout, [expected]);
});

test('--help imprime o uso e sai 0', async () => {
  const { result, stdout } = await captureConsole(() => run(['--help']));
  assert.equal(result, EXIT_SUCCESS);
  assert.deepEqual(stdout, [USAGE]);
});

// Fora de um terminal (como no teste e no CI), o modo interativo nunca abre: pedir sem comando é
// ambiguidade, e ambiguidade sem terminal é erro (Plataforma · CLI — Spec §5).
test('sem argumentos e sem terminal sai 1 com a orientação e o uso', async () => {
  const { result, stdout, stderr } = await captureConsole(() => run([]));
  assert.equal(result, EXIT_USAGE_ERROR);
  assert.deepEqual(stdout, []);
  assert.match(stderr[0] ?? '', /Sem terminal interativo/);
  assert.equal(stderr[1], USAGE);
});

test('comando desconhecido sai 1 com mensagem e uso', async () => {
  const { result, stderr } = await captureConsole(() => run(['voa']));
  assert.equal(result, EXIT_USAGE_ERROR);
  assert.equal(stderr.length, 2);
  assert.match(stderr[0] ?? '', /Comando desconhecido: voa/);
  assert.equal(stderr[1], USAGE);
});

test('opção desconhecida sai 1 com mensagem e uso', async () => {
  const { result, stderr } = await captureConsole(() => run(['--nao-existe']));
  assert.equal(result, EXIT_USAGE_ERROR);
  assert.equal(stderr.length, 2);
  assert.match(stderr[0] ?? '', /Opção desconhecida/);
  assert.equal(stderr[1], USAGE);
});

test('"list" com argumento extra sai 1', async () => {
  const { result, stderr } = await captureConsole(() => run(['list', 'extra']));
  assert.equal(result, EXIT_USAGE_ERROR);
  assert.match(stderr[0] ?? '', /Argumento inesperado para "list": extra/);
});

const usageCases: Array<[string, string[], RegExp]> = [
  ['add sem nome', ['add'], /precisa do nome/],
  ['add com --for desconhecido', ['add', 'x', '--for', 'vscode'], /--for aceita: claude, codex, gemini, agents/],
  ['list com --for', ['list', '--for', 'claude'], /Argumento inesperado para "list": --for/],
  ['list com --fase inválida', ['list', '--fase', 'um'], /--fase deve ser um número inteiro/],
  ['search sem termo', ['search'], /precisa de um termo/],
  ['search com --yes', ['search', 'edital', '--yes'], /não se aplica a "search"/],
  ['opção sem comando', ['--yes'], /precisa de um comando/],
];

for (const [name, argv, message] of usageCases) {
  test(`erro de uso: ${name} sai 1`, async () => {
    const { result, stderr } = await captureConsole(() => run(argv));
    assert.equal(result, EXIT_USAGE_ERROR);
    assert.match(stderr[0] ?? '', message);
  });
}

// Ctrl+D no modo interativo: o readline rejeita a pergunta com AbortError. A CLI cancela sem
// stack trace e sem gravar nada.
test('Ctrl+D numa pergunta do modo interativo: cancela com 1, sem exceção', async () => {
  const cwd = mkdtempSync(join(tmpdir(), 'obraforge-ctrl-d-'));
  try {
    const abort = Object.assign(new Error('Aborted with Ctrl+D'), { name: 'AbortError', code: 'ABORT_ERR' });
    const io = { question: async () => Promise.reject(abort), write: () => undefined };
    const { result, stderr } = await captureConsole(() => run([], { cwd, packageRoot: cwd, catalogJson: pathToFileURL(join(process.cwd(), '..', 'catalog.json')), io }));
    assert.equal(result, EXIT_USAGE_ERROR);
    assert.match(stderr.join('\n'), /Cancelado/);
    assert.deepEqual(readdirSync(cwd), []);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
