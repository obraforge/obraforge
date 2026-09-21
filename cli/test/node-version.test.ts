import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isSupportedNodeVersion, MINIMUM_NODE_MAJOR } from '../src/node-version.js';

test('recusa versão abaixo do mínimo', () => {
  assert.equal(isSupportedNodeVersion('21.7.0'), false);
});

test('aceita a versão mínima exata', () => {
  assert.equal(isSupportedNodeVersion('22.0.0'), true);
});

test('aceita versão acima do mínimo', () => {
  assert.equal(isSupportedNodeVersion('24.15.0'), true);
});

test('recusa string malformada (fail-closed)', () => {
  assert.equal(isSupportedNodeVersion('não é uma versão'), false);
  assert.equal(isSupportedNodeVersion(''), false);
  assert.equal(isSupportedNodeVersion('v22.0.0'), false);
});

test('a constante do mínimo é a documentada no plano', () => {
  assert.equal(MINIMUM_NODE_MAJOR, 22);
});
