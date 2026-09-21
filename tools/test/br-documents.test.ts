import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isValidCnpj, isValidCpf } from '../src/br-documents.js';
import { cnpjWithDv, cpfWithDv } from './helpers.js';

// Exemplo oficial do CNPJ alfanumérico (Receita Federal, "Perguntas e Respostas — CNPJ
// Alfanumérico", pergunta 14; Serpro, "Cálculo dos dígitos verificadores de CNPJ alfanumérico"):
// base 12.ABC.345/01DE, dígitos verificadores 3 e 5. Base e DV ficam separados de propósito.
const OFFICIAL_BASE = '12ABC34501DE';
const OFFICIAL_DV = '35';

test('CNPJ alfanumérico: o exemplo oficial da Receita Federal é válido', () => {
  assert.equal(isValidCnpj(`${OFFICIAL_BASE}${OFFICIAL_DV}`), true);
  // O gerador dos testes chega ao mesmo DV por outro caminho.
  assert.equal(cnpjWithDv(OFFICIAL_BASE), `${OFFICIAL_BASE}${OFFICIAL_DV}`);
});

test('CPF e CNPJ gerados com DV válido passam; qualquer DV trocado falha', () => {
  const bases = { cpf: ['390533447', '000000001', '987654321'], cnpj: ['904718260001', 'A1B2C3D40001', 'ZZ0000000001'] };
  for (const base of bases.cpf) {
    const cpf = cpfWithDv(base);
    assert.equal(isValidCpf(cpf), true, cpf);
    for (let position = 9; position < 11; position++) {
      for (let delta = 1; delta < 10; delta++) {
        const digit = (Number(cpf[position]) + delta) % 10;
        const wrong = `${cpf.slice(0, position)}${digit}${cpf.slice(position + 1)}`;
        assert.equal(isValidCpf(wrong), false, wrong);
      }
    }
  }
  for (const base of bases.cnpj) {
    const cnpj = cnpjWithDv(base);
    assert.equal(isValidCnpj(cnpj), true, cnpj);
    for (let position = 12; position < 14; position++) {
      for (let delta = 1; delta < 10; delta++) {
        const digit = (Number(cnpj[position]) + delta) % 10;
        const wrong = `${cnpj.slice(0, position)}${digit}${cnpj.slice(position + 1)}`;
        assert.equal(isValidCnpj(wrong), false, wrong);
      }
    }
  }
});

test('sequência de um dígito só não é documento real', () => {
  // 11111111111 passa no cálculo do DV, mas não é CPF de ninguém.
  assert.equal(cpfWithDv('111111111'), '11111111111');
  assert.equal(isValidCpf('11111111111'), false);
  assert.equal(isValidCpf('00000000000'), false);
  assert.equal(isValidCnpj('00000000000000'), false);
});

test('formato errado é inválido', () => {
  assert.equal(isValidCpf('1234567890'), false);
  assert.equal(isValidCpf('abcdefghijk'), false);
  // Letra minúscula e letra nos dígitos verificadores ficam fora do formato oficial.
  assert.equal(isValidCnpj(cnpjWithDv('A1B2C3D40001').toLowerCase()), false);
  assert.equal(isValidCnpj(`${OFFICIAL_BASE}3A`), false);
});
