import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AREAS } from '../src/areas.js';

test('são 23 áreas mais a transversal contexto', () => {
  assert.equal(AREAS.length, 24);
  assert.equal(AREAS.at(-1), 'contexto');
});

test('nenhuma área se repete', () => {
  assert.equal(new Set(AREAS).size, AREAS.length);
});

test('toda área é um slug válido como nome de pasta', () => {
  for (const area of AREAS) {
    assert.match(area, /^[a-z0-9]+(-[a-z0-9]+)*$/, area);
  }
});
