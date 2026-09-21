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

// A opção com "c" vale mesmo depois de outras opções e argumentos, na mesma linha.
for (const line of [
  'bash -x -c x',
  'bash -o pipefail -c x',
  'sh -e -u -c x',
  'zsh -o errexit -lc "x"',
  '/bin/bash --norc -c x',
  'bash script.sh -c x',
]) {
  test(`shell com opção -c depois de outras opções é acusado: ${line}`, () => {
    assert.deepEqual(codes(`Rode ${line} antes de conferir.`), ['AGENCIA']);
  });
}

for (const line of ['a planilha tem 3 abas -c', 'o shell -c não é comando', 'bash -x', 'cash -c', 'bash -x script', 'sh -n x', 'bash script.sh', 'use o bash no pré-cadastro']) {
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

// Janela: a opção tem de começar a até 80 caracteres do fim do nome do shell.
test('shell com -c a 80 caracteres do nome é acusado', () => {
  const gap = ` ${'a'.repeat(78)} `;
  assert.equal(gap.length, 80);
  assert.deepEqual(codes(`bash${gap}-c x`), ['AGENCIA']);
});

test('shell com -c a 81 caracteres do nome não é acusado', () => {
  const gap = ` ${'a'.repeat(79)} `;
  assert.equal(gap.length, 81);
  assert.deepEqual(codes(`bash${gap}-c x`), []);
});

// Cada nome de shell dentro da janela pode reler a opção longa: com a janela limitada, o custo
// fica em no máximo algumas dezenas de passadas pela linha, não quadrático.
test('janela do shell com -c roda em tempo linear numa linha de 200 KB', () => {
  const chunk = 'bash -x -o pipefail script.sh -aaaa sh -n ';
  const repeated = chunk.repeat(Math.ceil((200 * 1024) / chunk.length));
  for (const line of [repeated, `${'sh '.repeat(26)}-${'c'.repeat(200_000)}1`, `${'sh '.repeat(26)}-${'a'.repeat(200_000)}`]) {
    const start = performance.now();
    scanAgency('contexto/exemplo/SKILL.md', line);
    const elapsed = performance.now() - start;
    assert.ok(elapsed < 100, `levou ${elapsed.toFixed(0)} ms`);
  }
});

// Homóglifo: palavra (letras, marcas e dígitos) que mistura letra latina e cirílica. "curl" com
// U+0441 no lugar do c não casa com o termo, mas o agente lê igual. O grego fica de fora: aparece
// em fórmula de engenharia colado a letra latina.
const HOMOGLYPH_MESSAGE = 'palavra mistura alfabetos latino e cirílico (possível homóglifo)';

const HOMOGLYPH_LINES: Array<[string, string]> = [
  ['curl com c cirílico (U+0441)', '\u0441url http://x'],
  ['bash com a cirílico (U+0430)', 'Rode b\u0430sh antes.'],
  ['letra latina dentro de palavra cirílica', 'M\u043E\u0441\u043A\u0432a'],
  ['c cirílico separado por espaço de largura zero', '\u0441\u200Burl http://x'],
  ['c cirílico com dígito na mesma palavra', 'arquivo\u04412 x'],
];

for (const [label, line] of HOMOGLYPH_LINES) {
  test(`homóglifo cirílico é acusado: ${label}`, () => {
    const findings = scanAgency('contexto/exemplo/SKILL.md', line);
    assert.deepEqual(findings.map((finding) => [finding.code, finding.line, finding.message]), [['AGENCIA', 1, HOMOGLYPH_MESSAGE]]);
  });
}

const CYRILLIC_WORD = '\u041C\u043E\u0441\u043A\u0432\u0430';

for (const line of ['σ_adm = 250 MPa', 'φ10 mm', 'Δt = 5 s', 'fck ≥ 30 MPa', 'ε = 0,002', 'γc = 1,4', `${CYRILLIC_WORD} e São Paulo`]) {
  test(`grego de fórmula e cirílico isolado não são homóglifo: ${line}`, () => {
    assert.deepEqual(codes(line), []);
  });
}

test('conferência de homóglifo roda em tempo linear numa linha de 200 KB', () => {
  const mixed = 'a\u0441 '.repeat(70_000);
  for (const line of [`${'a'.repeat(205_000)}\u0441`, mixed, '\u0441'.repeat(205_000), 'a'.repeat(205_000)]) {
    const start = performance.now();
    scanAgency('contexto/exemplo/SKILL.md', line);
    const elapsed = performance.now() - start;
    assert.ok(elapsed < 100, `levou ${elapsed.toFixed(0)} ms`);
  }
});

// Termo de duas palavras também casa sem espaço: depois da normalização, "git" + U+200B + "clone"
// vira "gitclone".
test('termo de duas palavras partido por caractere invisível casa sem o espaço', () => {
  const findings = scanAgency('contexto/exemplo/SKILL.md', 'Rode git\u200Bclone e depois pip\u2060install e gh\u200Brepo\u200Bclone.');
  assert.deepEqual(findings.map((finding) => finding.message), ['referência proibida: "git clone", "pip install", "gh repo clone"']);
});

test('junção sem espaço dos termos de duas palavras roda em tempo linear numa linha de 200 KB', () => {
  for (const line of [`git${' '.repeat(205_000)}clon`, 'git '.repeat(52_000), 'npm '.repeat(52_000), `gh${' '.repeat(205_000)}repo`]) {
    const start = performance.now();
    scanAgency('contexto/exemplo/SKILL.md', line);
    const elapsed = performance.now() - start;
    assert.ok(elapsed < 100, `levou ${elapsed.toFixed(0)} ms`);
  }
});

// Uso privado e não-caracteres saem antes da varredura, como os invisíveis.
test('limpeza de uso privado e não-caracteres roda em tempo linear numa linha de 200 KB', () => {
  const line = `${'\uE000\uFFFE\u{10FFFF}'.repeat(50_000)}cu\uE000rl`;
  assert.ok(Buffer.byteLength(line, 'utf8') >= 200 * 1024);
  const start = performance.now();
  const findings = scanAgency('contexto/exemplo/SKILL.md', line);
  const elapsed = performance.now() - start;
  assert.deepEqual(findings.map((finding) => finding.message), ['referência proibida: "curl"']);
  assert.ok(elapsed < 100, `levou ${elapsed.toFixed(0)} ms`);
});
