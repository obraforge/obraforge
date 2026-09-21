import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkNorms, extractCitations, parseNormsFile } from '../src/rules/norms.js';

const keys = (text: string): string[] => extractCitations([text]).map((citation) => citation.key);

test('cada família de norma vira uma chave canônica', () => {
  const cases: Array<[string, string[]]> = [
    ['Conforme a NR-18.', ['NR-18']],
    ['NR 06 e NR35', ['NR-6', 'NR-35']],
    ['ABNT NBR 15575-1:2021', ['NBR 15575-1']],
    ['NBR ISO 9001:2015', ['NBR ISO 9001']],
    ['NBR ISO/IEC 17025', ['NBR ISO/IEC 17025']],
    ['NBR-6118', ['NBR 6118']],
    ['ABNT NBR-6118:2014', ['NBR 6118']],
    ['NBR9050', ['NBR 9050']],
    ['Lei nº 14.133/2021', ['Lei 14133']],
    ['Lei 14.133/2021', ['Lei 14133']],
    ['lei n.º 14.133, de 1º de abril de 2021', ['Lei 14133']],
    ['Lei n. 8.666/93', ['Lei 8666']],
    ['Lei Complementar nº 123/2006', ['Lei Complementar 123']],
    ['Lei Federal nº 8.666/1993', ['Lei 8666']],
    ['Lei Estadual nº 8.666/1993', ['Lei 8666']],
    ['Lei Municipal nº 8.666/1993', ['Lei 8666']],
    ['Decreto nº 11.246/2022', ['Decreto 11246']],
    ['Decreto Federal nº 7.983/2013', ['Decreto 7983']],
    ['Decreto Estadual nº 7.983/2013', ['Decreto 7983']],
    ['Decreto-Lei nº 5.452/1943', ['Decreto-Lei 5452']],
    ['Leis 8.666/1993 e 14.133/2021', ['Lei 8666', 'Lei 14133']],
    ['Leis 8.666/1993, 10.520/2002 e 14.133/2021', ['Lei 8666', 'Lei 10520', 'Lei 14133']],
    ['Resolução CONAMA nº 307/2002', ['Resolução CONAMA 307']],
    ['Resolução CAU/BR nº 91', ['Resolução CAU/BR 91']],
    ['Resolução CAU/BR nº 91/2014', ['Resolução CAU/BR 91']],
    ['Resolucao CONFEA nº 1.025/2009', ['Resolução CONFEA 1025']],
    ['Resolução nº 307/2002 do CONAMA', ['Resolução CONAMA 307']],
    ['Resolução nº 1.025/2009 do CONFEA', ['Resolução CONFEA 1025']],
    ['Resolução Conama nº 307/2002', ['Resolução CONAMA 307']],
    // Toda grafia aceita do sinal de número, nas duas formas de Resolução.
    ['Resolução CONAMA n.º 307/2002', ['Resolução CONAMA 307']],
    ['Resolução CONAMA n° 307/2002', ['Resolução CONAMA 307']],
    ['Resolução CONAMA no. 307/2002', ['Resolução CONAMA 307']],
    ['Resolução CONAMA n. 307/2002', ['Resolução CONAMA 307']],
    ['Resolução n.º 307/2002 do CONAMA', ['Resolução CONAMA 307']],
    ['Resolução n° 307/2002 do CONAMA', ['Resolução CONAMA 307']],
    ['Resolução no. 307/2002 do CONAMA', ['Resolução CONAMA 307']],
    ['Resolução n. 307/2002 do CONAMA', ['Resolução CONAMA 307']],
  ];
  for (const [text, expected] of cases) {
    assert.deepEqual(keys(text), expected, text);
  }
});

// Sigla só com maiúsculas (2 ou mais letras, com barra interna, como CAU/BR) dispensa o sinal de
// número, com o órgão antes ou depois do número.
test('resolução com sigla em maiúsculas e sem sinal de número vira citação', () => {
  const cases: Array<[string, string[]]> = [
    ['Resolução CONAMA 307/2002', ['Resolução CONAMA 307']],
    ['Siga a Resolução CONAMA 307/2002 na triagem do entulho.', ['Resolução CONAMA 307']],
    ['Resolução CAU/BR 91/2014', ['Resolução CAU/BR 91']],
    ['Resolucao CONFEA 1.025/2009', ['Resolução CONFEA 1025']],
    ['RESOLUÇÃO CONAMA 307', ['Resolução CONAMA 307']],
    ['Resolução CD 5/2019', ['Resolução CD 5']],
    ['Resolução 273/2000 do CONAMA', ['Resolução CONAMA 273']],
    ['Resolução 91/2014 do CAU/BR', ['Resolução CAU/BR 91']],
    ['Resolução 1.025 do CONFEA.', ['Resolução CONFEA 1025']],
  ];
  for (const [text, expected] of cases) {
    assert.deepEqual(keys(text), expected, text);
  }
});

test('texto que não é citação não vira chave', () => {
  for (const text of ['NRs da obra', 'nr 12 itens', 'a resolução de 2019 do conselho', 'webNR-18x', 'NR-100', 'Leis 8', 'nbr 9050']) {
    assert.deepEqual(keys(text), [], text);
  }
});

// Resolução só vira citação ancorada no sinal de número (nº, n.º, n°, no. ou n.): sem ele, a
// palavra seguinte (ou o que vem depois de "do/da") era lida como órgão em qualquer caixa.
for (const text of [
  'a resolução dos 12 problemas',
  'imagem com resolução mínima 300 dpi e resolução nominal 1920 px',
  'resolução da equipe 2',
  'resolução espacial 30 m do sensor',
  'a resolução 2 da equipe técnica',
  'Resolução no 307/2002 do CONAMA',
  // Órgão em caixa mista ou minúscula continua exigindo o sinal de número.
  'Resolução Conama 307/2002',
  'Resolução conama 307/2002',
  'Resolução 307/2002 do Conama',
  'Resolução 307/2002 do conama',
  'Resolução CONAMAx 307',
  'Resolução 307 do CONAMAx',
  // Sigla de uma letra só não é sigla.
  'Resolução A 307',
]) {
  test(`resolução sem sinal de número não vira citação: ${text}`, () => {
    assert.deepEqual(keys(text), []);
  });
}

test('extractCitations com resolução sem sinal de número roda em tempo linear numa linha de 200 KB', () => {
  const chunk = `Resolução ${'n'.repeat(40)} 1.2.3.4.5.6.7.8.9 do ${'x'.repeat(40)} resolução nº 1 da resolução no ${'1.'.repeat(30)} `;
  const repeated = chunk.repeat(Math.ceil((200 * 1024) / chunk.length));
  // Sigla gigante sem sinal de número depois, e número gigante sem "do/da" depois.
  for (const text of [
    repeated,
    `Resolução ${'A'.repeat(205_000)} 1`,
    `Resolução nº ${'1.'.repeat(103_000)}x`,
    // Sigla gigante que não termina em espaço, número gigante sem órgão, e órgão gigante depois do
    // número que falha a borda no fim: formas sem sinal de número.
    `Resolução ${'A'.repeat(205_000)}x 1`,
    `Resolução ${'1.'.repeat(103_000)}x`,
    `Resolução 1 do ${'A'.repeat(205_000)}x`,
    `Resolução ${'A/'.repeat(103_000)}`,
    'Resolução CONAMA '.repeat(13_000),
  ]) {
    const start = process.hrtime.bigint();
    extractCitations([text]);
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
    assert.ok(elapsedMs < 100, `esperava menos de 100 ms, levou ${elapsedMs} ms`);
  }
});

test('a linha da citação é a linha do arquivo', () => {
  assert.deepEqual(extractCitations(['sem norma', '', 'Veja a NR-18.']), [{ key: 'NR-18', line: 3 }]);
});

test('NORMA: corpo com forma curta e título com forma completa casam pela mesma chave canônica', () => {
  const skillLines = ['Ver a NBR 6118.'];
  const normsLines = [
    '## ABNT NBR-6118:2014',
    '- Título: Projeto de estruturas de concreto',
    '- Ano: 2014',
    '- Fonte: https://www.abntcatalogo.com.br/',
  ];
  assert.deepEqual(checkNorms('skills/area/exemplo', skillLines, normsLines), []);
});

test('NORMA: todas as formas novas de citação do corpo casam com entradas em normas.md', () => {
  const skillLines = [
    'NBR-6118 e ABNT NBR-6118:2014.',
    'Lei Federal nº 8.666/1993.',
    'Lei Estadual nº 8.666/1993.',
    'Lei Municipal nº 8.666/1993.',
    'Lei Complementar nº 123/2006.',
    'Leis 8.666/1993 e 14.133/2021.',
    'Leis 8.666/1993, 10.520/2002 e 14.133/2021.',
    'Lei n. 8.666/93.',
    'Decreto Federal nº 7.983/2013.',
    'Decreto Estadual nº 7.983/2013.',
    'Resolução nº 307/2002 do CONAMA.',
    'Resolução nº 1.025/2009 do CONFEA.',
    'Resolução Conama nº 307/2002.',
  ];
  const headings = [
    'NBR 6118',
    'Lei 8666',
    'Lei Complementar 123',
    'Lei 14133',
    'Lei 10520',
    'Decreto 7983',
    // Resolução, também no heading, só vira chave com o sinal de número.
    'Resolução CONAMA nº 307/2002',
    'Resolução CONFEA nº 1.025/2009',
  ];
  const normsLines = headings.flatMap((heading) => [
    `## ${heading}`,
    '- Título: Título de teste',
    '- Ano: 2024',
    '- Fonte: https://exemplo.gov.br',
  ]);
  assert.deepEqual(checkNorms('skills/area/exemplo', skillLines, normsLines), []);
});

// Consequência do sinal de número obrigatório para órgão em caixa mista: o heading sem ele não gera
// chave, e a citação do corpo é acusada (fail-closed), em vez de a entrada valer para qualquer frase.
test('NORMA: heading de Resolução com órgão em caixa mista e sem sinal de número não cobre a citação do corpo', () => {
  const normsLines = ['## Resolução Conama 307', '- Título: Título de teste', '- Ano: 2002', '- Fonte: https://exemplo.gov.br'];
  assert.deepEqual(
    checkNorms('skills/area/exemplo', ['Resolução CONAMA nº 307/2002.'], normsLines).map((finding) => finding.message),
    ['citação "Resolução CONAMA 307" sem entrada em references/normas.md'],
  );
});

// Com a sigla em maiúsculas, o heading sem sinal gera a mesma chave da citação com sinal.
test('NORMA: heading "Resolução CONAMA 307/2002" cobre "Resolução CONAMA nº 307/2002" e "Resolução 307/2002 do CONAMA"', () => {
  const normsLines = ['## Resolução CONAMA 307/2002', '- Título: Gestão dos resíduos da construção civil', '- Ano: 2002', '- Fonte: https://conama.mma.gov.br/'];
  const skillLines = ['Resolução CONAMA nº 307/2002.', 'Resolução 307/2002 do CONAMA.', 'Resolução CONAMA 307/2002.'];
  assert.deepEqual(checkNorms('skills/area/exemplo', skillLines, normsLines), []);
});

test('extractCitations não sofre backtracking catastrófico numa linha de 200 KB', () => {
  const chunk =
    'Lei Federal n. 8.666/1993 e 14.133 Decreto Estadual no 7.983 do CONFEA Resolucao CAU/BR nao 91 ' +
    'ABNT NBR-6118 NR-99 Leis 8, 10 nbr9050 resolucao de 2019 do conselho ';
  let text = '';
  while (Buffer.byteLength(text, 'utf8') < 200 * 1024) {
    text += chunk;
  }
  const start = process.hrtime.bigint();
  extractCitations([text]);
  const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
  assert.ok(elapsedMs < 50, `esperava menos de 50 ms, levou ${elapsedMs} ms`);
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

test('normas.md: aceita marcador "*" e "+", negrito com ":" dentro ou fora, e nome sem acento/maiúsculo', () => {
  const entries = parseNormsFile([
    '## Lei 14.133/2021',
    '* **Título:** Lei de Licitações e Contratos Administrativos',
    '+ **Ano**: 2021',
    '- fonte: https://www.planalto.gov.br/',
  ]);
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.fields.get('Título')?.value, 'Lei de Licitações e Contratos Administrativos');
  assert.equal(entries[0]?.fields.get('Ano')?.value, '2021');
  assert.equal(entries[0]?.fields.get('Fonte')?.value, 'https://www.planalto.gov.br/');
});

test('normas.md: TITULO maiúsculo e sem acento também vale', () => {
  const entries = parseNormsFile(['## Lei 14.133/2021', '- TITULO: Lei de Licitações']);
  assert.equal(entries[0]?.fields.get('Título')?.value, 'Lei de Licitações');
});
