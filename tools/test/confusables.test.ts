// Tabela gerada por tools/scripts/generate-confusables.mjs a partir do confusables.txt do Unicode.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CONFUSABLES, CONFUSABLES_VERSION } from '../src/confusables.js';
import { skeleton } from '../src/text.js';

test('tabela de confundíveis: origem fora do ASCII e protótipo de um caractere [a-z0-9]', () => {
  assert.equal(CONFUSABLES_VERSION, '18.0.0');
  assert.equal(CONFUSABLES.size, 1586);
  for (const [codePoint, prototype] of CONFUSABLES) {
    assert.ok(codePoint >= 0x80, `origem ASCII: ${codePoint.toString(16)}`);
    assert.match(prototype, /^[a-z0-9]$/);
  }
});

test('tabela de confundíveis traz os homóglifos do pedido', () => {
  const expected: Array<[number, string]> = [
    [0x03f2, 'c'],
    [0x03c5, 'u'],
    [0x03bf, 'o'],
    [0x0261, 'g'],
    [0x0131, 'i'],
    [0x1d04, 'c'],
    [0x0570, 'h'],
    [0x0585, 'o'],
    [0x0455, 's'],
  ];
  for (const [codePoint, prototype] of expected) {
    assert.equal(CONFUSABLES.get(codePoint), prototype, `U+${codePoint.toString(16).toUpperCase()}`);
  }
});

test('esqueleto troca só o confundível fora do ASCII e mantém o resto', () => {
  assert.equal(skeleton('\u03F2url'), 'curl');
  assert.equal(skeleton('rodar.\u0455h'), 'rodar.sh');
  // ASCII fica como está, inclusive "1", "0", "I" e "|", e a caixa; letra acentuada também.
  assert.equal(skeleton('SCP I|10 ação ç é'), 'SCP I|10 ação ç é');
  // Um code point fora do plano básico que está na tabela vira um caractere só.
  assert.equal(skeleton('\u{1D206}'), '3');
});

test('esqueleto troca o confundível antes e depois do NFKC', () => {
  // Antes: o NFKC leva U+03F2 a U+03C2 (ς) e U+03F9 a U+03A3 (Σ), que não estão na tabela.
  assert.equal(skeleton('\u03F2url'), 'curl');
  assert.equal(skeleton('S\u03F9P'), 'ScP');
  // Depois: U+1FBE não está na tabela, mas o NFKC o leva a U+03B9 (ι), que está.
  assert.equal(skeleton('p\u1FBEp'), 'pip');
  // Letra de largura total está na tabela: vira minúscula, como todo confundível trocado.
  assert.equal(skeleton('\uFF33\uFF23\uFF30'), 'scp');
});
