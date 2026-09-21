import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { EXIT_SUCCESS, EXIT_USAGE_ERROR } from '../src/exit-codes.js';
import { run, USAGE } from '../src/main.js';

function captureConsole<T>(fn: () => T): { result: T; stdout: string[]; stderr: string[] } {
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
    return { result: fn(), stdout, stderr };
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}

test('--version imprime a versão do package.json', () => {
  const expected = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version;
  const { result, stdout } = captureConsole(() => run(['--version']));
  assert.equal(result, EXIT_SUCCESS);
  assert.deepEqual(stdout, [expected]);
});

test('--help imprime o uso e sai 0', () => {
  const { result, stdout } = captureConsole(() => run(['--help']));
  assert.equal(result, EXIT_SUCCESS);
  assert.deepEqual(stdout, [USAGE]);
});

test('sem argumentos imprime o mesmo uso e sai 0', () => {
  const { result, stdout } = captureConsole(() => run([]));
  assert.equal(result, EXIT_SUCCESS);
  assert.deepEqual(stdout, [USAGE]);
});

test('comando desconhecido sai 1 com mensagem e uso', () => {
  const { result, stderr } = captureConsole(() => run(['voa']));
  assert.equal(result, EXIT_USAGE_ERROR);
  assert.equal(stderr.length, 2);
  assert.match(stderr[0] ?? '', /Comando desconhecido: voa/);
  assert.equal(stderr[1], USAGE);
});

test('opção desconhecida sai 1 com mensagem e uso', () => {
  const { result, stderr } = captureConsole(() => run(['--nao-existe']));
  assert.equal(result, EXIT_USAGE_ERROR);
  assert.equal(stderr.length, 2);
  assert.match(stderr[0] ?? '', /Opção desconhecida/);
  assert.equal(stderr[1], USAGE);
});

test('"list" com argumento extra sai 1', () => {
  const { result, stderr } = captureConsole(() => run(['list', 'extra']));
  assert.equal(result, EXIT_USAGE_ERROR);
  assert.match(stderr[0] ?? '', /Argumento inesperado para "list": extra/);
});
