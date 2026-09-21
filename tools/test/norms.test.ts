import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractCitations, parseNormsFile } from '../src/rules/norms.js';

const keys = (text: string): string[] => extractCitations([text]).map((citation) => citation.key);

test('cada família de norma vira uma chave canônica', () => {
  const cases: Array<[string, string[]]> = [
    ['Conforme a NR-18.', ['NR-18']],
    ['NR 06 e NR35', ['NR-6', 'NR-35']],
    ['ABNT NBR 15575-1:2021', ['NBR 15575-1']],
    ['NBR ISO 9001:2015', ['NBR ISO 9001']],
    ['NBR ISO/IEC 17025', ['NBR ISO/IEC 17025']],
    ['Lei nº 14.133/2021', ['Lei 14133']],
    ['Lei 14.133/2021', ['Lei 14133']],
    ['lei n.º 14.133, de 1º de abril de 2021', ['Lei 14133']],
    ['Lei Complementar nº 123/2006', ['Lei Complementar 123']],
    ['Decreto nº 11.246/2022', ['Decreto 11246']],
    ['Decreto-Lei nº 5.452/1943', ['Decreto-Lei 5452']],
    ['Resolução CONAMA nº 307/2002', ['Resolução CONAMA 307']],
    ['Resolução CAU/BR nº 91', ['Resolução CAU/BR 91']],
    ['Resolucao CONFEA 1.025/2009', ['Resolução CONFEA 1025']],
  ];
  for (const [text, expected] of cases) {
    assert.deepEqual(keys(text), expected, text);
  }
});

test('texto que não é citação não vira chave', () => {
  for (const text of ['NRs da obra', 'nr 12 itens', 'a resolução de 2019 do conselho', 'webNR-18x', 'NR-100', 'Leis 8']) {
    assert.deepEqual(keys(text), [], text);
  }
});

test('a linha da citação é a linha do arquivo', () => {
  assert.deepEqual(extractCitations(['sem norma', '', 'Veja a NR-18.']), [{ key: 'NR-18', line: 3 }]);
});

test('normas.md: cada entrada ## traz as chaves do título e os campos', () => {
  const entries = parseNormsFile([
    '# Referências normativas',
    '',
    '## Lei nº 14.133/2021',
    '- Título: Lei de Licitações e Contratos Administrativos',
    '- Ano: 2021',
    '- Fonte: https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm',
    '### Nota',
    '- Ano: 1999',
    '# Outro bloco',
    '- Título: fora de entrada',
  ]);
  assert.equal(entries.length, 1);
  assert.deepEqual(entries[0]?.keys, ['Lei 14133']);
  assert.equal(entries[0]?.line, 3);
  // O primeiro campo de cada nome vale; o subtítulo ### continua dentro da entrada.
  assert.equal(entries[0]?.fields.get('Ano')?.value, '2021');
  assert.equal(entries[0]?.fields.get('Título')?.value, 'Lei de Licitações e Contratos Administrativos');
});
