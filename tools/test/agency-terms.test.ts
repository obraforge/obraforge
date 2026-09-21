import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scanAgency } from '../src/rules/agency.js';

function codes(text: string): string[] {
  return scanAgency('contexto/exemplo/SKILL.md', text).map((finding) => finding.code);
}

// "scp" só casa em minúsculas: o comando é escrito assim, e "SCP" em maiúsculas é a sigla de
// Sociedade em Conta de Participação, comum em incorporação imobiliária e na área tributária.
test('scp em minúsculas é acusado como comando', () => {
  assert.deepEqual(codes('Copie com scp planilha.xlsx servidor:/obra'), ['AGENCIA']);
});

test('SCP em maiúsculas (Sociedade em Conta de Participação) não é acusado', () => {
  assert.deepEqual(codes('A obra é tocada por uma SCP, com sócio ostensivo e sócios participantes.'), []);
});

// Shell chamado com uma opção que contém "c" executa o texto seguinte como comando.
for (const line of ['bash -c "x"', 'bash -lc "x"', 'sh -c x', 'sh -ec x', 'zsh -c x', 'dash -c x', 'ksh -c x', 'fish -c x']) {
  test(`shell com opção -c é acusado: ${line}`, () => {
    assert.deepEqual(codes(`Rode ${line} antes de conferir.`), ['AGENCIA']);
  });
}

for (const line of ['a planilha tem 3 abas -c', 'o shell -c não é comando', 'bash -x', 'cash -c']) {
  test(`sem shell com -c não é acusado: ${line}`, () => {
    assert.deepEqual(codes(line), []);
  });
}

// O padrão do shell não pode ter backtracking quadrático: uma opção gigante só de "c" seguida de
// dígito (que falha a borda de palavra) tem de sair em tempo linear.
test('padrão de shell com -c roda em tempo linear numa opção de 200 mil letras', () => {
  const line = `bash -${'c'.repeat(200_000)}1`;
  const start = performance.now();
  scanAgency('contexto/exemplo/SKILL.md', line);
  const elapsed = performance.now() - start;
  assert.ok(elapsed < 200, `levou ${elapsed.toFixed(0)} ms`);
});
