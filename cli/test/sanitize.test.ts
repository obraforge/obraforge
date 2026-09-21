import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sanitize } from '../src/sanitize.js';

test('remove sequência ANSI de limpar tela (ESC + CSI)', () => {
  const input = 'antes\x1b[2Jdepois';
  const output = sanitize(input);
  assert.ok(!output.includes('\x1b'));
  assert.equal(output, 'antes[2Jdepois');
});

test('remove sequência OSC de título de janela, inclusive o BEL', () => {
  const input = 'antes\x1b]0;titulo\x07depois';
  const output = sanitize(input);
  assert.ok(!output.includes('\x1b'));
  assert.ok(!output.includes('\x07'));
  assert.equal(output, 'antes]0;titulodepois');
});

test('remove sobrescrita bidirecional U+202E', () => {
  const input = 'antes‮depois';
  assert.equal(sanitize(input), 'antesdepois');
});

test('preserva texto comum em português', () => {
  const input = 'Confere planilha orçamentária de obra (NBR 12.721)';
  assert.equal(sanitize(input), input);
});
