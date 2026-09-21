import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scanPersonalData } from '../src/rules/personal-data.js';

// C5: nenhum teste protegia "telefone com DDD 00 e número não zerado é telefone real". Só o DDD
// zerado não basta para caracterizar o telefone fictício da regra — o número inteiro precisa ser
// zerado, como em (00) 00000-0000.
test('telefone com DDD 00 e número não zerado é DADO-PESSOAL', () => {
  for (const phone of ['(00) 91234-5678', '(00) 3201-1234']) {
    const findings = scanPersonalData('skill/AGENTS.md', `Ligue para ${phone} em caso de dúvida.`);
    const codes = findings.map((finding) => finding.code);
    assert.deepEqual(codes, ['DADO-PESSOAL'], `esperava achado para ${phone}`);
  }
});

test('telefone fictício (00) 00000-0000, com DDD e número zerados, não é achado', () => {
  const findings = scanPersonalData('skill/AGENTS.md', 'Ligue para (00) 00000-0000 em caso de dúvida.');
  assert.deepEqual(findings, []);
});
