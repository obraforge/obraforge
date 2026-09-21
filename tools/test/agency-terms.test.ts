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

// Só a grafia exatamente toda em maiúsculas (a sigla) fica isenta: num sistema de arquivos que não
// diferencia maiúsculas (macOS), "Scp", "sCp" e "Rcp" executam o comando.
for (const variant of ['Scp', 'sCp', 'SCp', 'scP', 'sCP', 'Rcp', 'rCp', 'RCp', 'rcP', 'rCP']) {
  test(`${variant} (grafia que não é a sigla toda em maiúsculas) é acusado`, () => {
    const findings = scanAgency('contexto/exemplo/SKILL.md', `Copie com ${variant} planilha.xlsx servidor:/obra`);
    assert.deepEqual(findings.map((finding) => finding.message), [`referência proibida: "${variant.toLowerCase()}"`]);
  });
}

test('SCP e RCP exatos continuam isentos na mesma linha em que outra grafia é acusada', () => {
  const findings = scanAgency('contexto/exemplo/SKILL.md', 'A SCP treinou RCP; depois rode Scp e Rcp.');
  assert.deepEqual(findings.map((finding) => finding.message), ['referência proibida: "scp", "rcp"']);
  assert.deepEqual(codes('A SCP treinou a brigada em RCP.'), []);
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

// Opção entre aspas ("-c", '-c') ou na forma $'-c' do bash também é a opção -c.
for (const line of ['bash "-c" "id"', "bash '-c' id", "bash $'-c' id", 'sh "-lc" x', 'bash -x "-c" id']) {
  test(`shell com opção -c entre aspas é acusado: ${line}`, () => {
    assert.deepEqual(codes(`Rode ${line} antes de conferir.`), ['AGENCIA']);
  });
}

// Shells da rodada 3.
for (const line of ['rbash -c x', 'mksh -c x', 'ash -c x', 'csh -c x', 'tcsh -c x', '/bin/ash -lc x']) {
  test(`shell novo com opção -c é acusado: ${line}`, () => {
    assert.deepEqual(codes(`Rode ${line} antes de conferir.`), ['AGENCIA']);
  });
}

for (const line of [
  'a planilha tem 3 abas -c',
  'o shell -c não é comando',
  'bash -x',
  'cash -c',
  'hash -c',
  'trash -c',
  'bash -x script',
  'sh -n x',
  'bash script.sh',
  'bash "-x" script.sh',
  'use o bash no pré-cadastro',
]) {
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

// Janela: a opção tem de começar a até 200 caracteres do fim do nome do shell.
test('shell com -c a 200 caracteres do nome é acusado', () => {
  const gap = ` ${'a'.repeat(198)} `;
  assert.equal(gap.length, 200);
  assert.deepEqual(codes(`bash${gap}-c x`), ['AGENCIA']);
});

test('shell com -c a 201 caracteres do nome não é acusado', () => {
  const gap = ` ${'a'.repeat(199)} `;
  assert.equal(gap.length, 201);
  assert.deepEqual(codes(`bash${gap}-c x`), []);
});

// Continuação de linha com barra invertida: a linha que termina em "\" é juntada com a seguinte
// (sem a barra, como o shell faz) para a varredura, e o achado aponta a primeira linha da junção.
const findingLines = (text: string): Array<[number, string]> =>
  scanAgency('contexto/exemplo/SKILL.md', text).map((finding) => [finding.line ?? 0, finding.message]);
const SHELL_LABEL = 'referência proibida: shell com -c (execução de comando)';

test('shell e -c em linhas juntadas por barra invertida são acusados na primeira linha', () => {
  assert.deepEqual(findingLines('Rode:\nbash \\\n-c "id"\nfim.'), [[2, SHELL_LABEL]]);
});

test('cadeia de continuações é juntada inteira e aponta a primeira linha', () => {
  assert.deepEqual(findingLines('bash \\\n  -x \\\n  -c id\nRode curl.'), [
    [1, SHELL_LABEL],
    [4, 'referência proibida: "curl"'],
  ]);
});

test('termo partido por continuação de linha também é juntado', () => {
  assert.deepEqual(findingLines('Baixe com cu\\\nrl e depois git \\\nclone.'), [[1, 'referência proibida: "curl", "git clone"']]);
});

for (const text of ['Primeira linha\\\nsegunda linha.', 'bash \\\nscript.sh', 'C:\\Obras\\\nPlanilhas', 'termina em barra \\']) {
  test(`continuação de linha sem termo não é acusada: ${JSON.stringify(text)}`, () => {
    assert.deepEqual(codes(text), []);
  });
}

test('continuação de linha roda em tempo linear em 200 KB', () => {
  // Muitas linhas curtas todas terminadas em barra (uma junção só, de 200 KB) e uma linha longa.
  const texts = [
    'bash -x \\\n'.repeat(21_000),
    `${'a'.repeat(205_000)} \\\n-c x`,
    `${'sh '.repeat(69_000)}\\\n-${'c'.repeat(100)}1`,
  ];
  for (const text of texts) {
    assert.ok(Buffer.byteLength(text, 'utf8') >= 200 * 1024);
    const start = performance.now();
    scanAgency('contexto/exemplo/SKILL.md', text);
    const elapsed = performance.now() - start;
    assert.ok(elapsed < 100, `levou ${elapsed.toFixed(0)} ms`);
  }
});

// Cada nome de shell dentro da janela pode reler a opção longa: com a janela limitada, o custo
// fica em no máximo algumas dezenas de passadas pela linha, não quadrático.
test('janela do shell com -c roda em tempo linear numa linha de 200 KB', () => {
  const chunk = 'bash -x -o pipefail script.sh -aaaa sh -n "-x" ';
  const repeated = chunk.repeat(Math.ceil((200 * 1024) / chunk.length));
  // Com a janela de 200 caracteres, até 67 nomes "sh " cabem antes da opção longa.
  for (const line of [
    repeated,
    `${'sh '.repeat(67)}-${'c'.repeat(200_000)}1`,
    `${'sh '.repeat(67)}-${'a'.repeat(200_000)}`,
    `${'sh '.repeat(67)}"-${'c'.repeat(200_000)}1`,
    `${'ash '.repeat(50)}$'-${'a'.repeat(200_000)}`,
  ]) {
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
  ['bash com a cirílico (U+0430)', 'Rode b\u0430sh antes.'],
  ['letra latina dentro de palavra cirílica', 'M\u043E\u0441\u043A\u0432a'],
  ['c cirílico com dígito na mesma palavra', 'arquivo\u04412 x'],
];

for (const [label, line] of HOMOGLYPH_LINES) {
  test(`homóglifo cirílico é acusado: ${label}`, () => {
    const findings = scanAgency('contexto/exemplo/SKILL.md', line);
    assert.deepEqual(findings.map((finding) => [finding.code, finding.line, finding.message]), [['AGENCIA', 1, HOMOGLYPH_MESSAGE]]);
  });
}

// Quando a palavra misturada é um termo da lista, o esqueleto também o acusa: dois achados na linha,
// o do termo e o da mistura de alfabetos.
for (const [label, line] of [
  ['curl com c cirílico (U+0441)', '\u0441url http://x'],
  ['c cirílico separado por espaço de largura zero', '\u0441\u200Burl http://x'],
]) {
  test(`homóglifo cirílico de termo da lista é acusado pelas duas regras: ${label}`, () => {
    const findings = scanAgency('contexto/exemplo/SKILL.md', line ?? '');
    assert.deepEqual(findings.map((finding) => [finding.code, finding.line, finding.message]), [
      ['AGENCIA', 1, 'referência proibida: "curl"'],
      ['AGENCIA', 1, HOMOGLYPH_MESSAGE],
    ]);
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

// Esqueleto (UTS #39): cada caractere da linha normalizada que a tabela de confundíveis do Unicode
// leva a uma letra ou dígito ASCII é trocado por ele, e os termos são comparados também contra esse
// texto. Pega homóglifo de qualquer alfabeto, inclusive latino (U+1D04, U+0261, U+0131), grego e
// armênio, que a regra de mistura latino/cirílico não vê.
const SKELETON_LINES: Array<[string, string, string]> = [
  ['c grego lunado (U+03F2)', 'Rode \u03F2url antes.', '"curl"'],
  ['u grego (U+03C5)', 'Rode c\u03C5rl antes.', '"curl"'],
  ['o grego (U+03BF)', 'Instale o h\u03BF\u03BFk do agente.', '"hook"'],
  ['g latino de script (U+0261)', 'Baixe com w\u0261et.', '"wget"'],
  ['i sem ponto (U+0131)', 'Rode p\u0131p install pacote.', '"pip install"'],
  ['C versalete latino (U+1D04)', 'Rode \u1D04url antes.', '"curl"'],
  ['h armênio (U+0570)', 'Acesse com ss\u0570 o servidor.', '"ssh"'],
  ['o armênio (U+0585)', 'Instale o h\u0585\u0585k do agente.', '"hook"'],
];

for (const [label, line, term] of SKELETON_LINES) {
  test(`homóglifo pelo esqueleto é acusado: ${label}`, () => {
    const findings = scanAgency('contexto/exemplo/SKILL.md', line);
    assert.deepEqual(findings.map((finding) => [finding.code, finding.line, finding.message]), [['AGENCIA', 1, `referência proibida: ${term}`]]);
  });
}

// A isenção de SCP e RCP olha o texto original: um confundível que só no esqueleto vira a sigla
// não é a sigla.
for (const [label, line, term] of [
  ['s versalete latino (U+A731) + CP', 'Copie com \uA731CP planilha.xlsx servidor:/obra', '"scp"'],
  ['S + C grego lunado maiúsculo (U+03F9) + P', 'Copie com S\u03F9P planilha.xlsx servidor:/obra', '"scp"'],
  ['R + C grego lunado maiúsculo (U+03F9) + P', 'Copie com R\u03F9P planilha.xlsx servidor:/obra', '"rcp"'],
] as const) {
  test(`sigla que só vira SCP ou RCP no esqueleto é acusada: ${label}`, () => {
    const findings = scanAgency('contexto/exemplo/SKILL.md', line);
    assert.deepEqual(findings.map((finding) => finding.message), [`referência proibida: ${term}`]);
  });
}

// Grego de fórmula de engenharia não vira termo no esqueleto.
for (const line of [
  'α = 0,85 e γf = 1,4',
  'ρ = 2500 kg/m³',
  'ν = 0,2 para o concreto',
  'τ_wd = 0,3 MPa',
  'λ ≤ 90 no pilar',
  'μ = 0,6 no atrito',
  'Σ Fy = 0',
  'A = π·d²/4',
  'vão de 3×4 m',
  '\u03BF coeficiente κ e o ângulo θ',
]) {
  test(`grego de fórmula não é acusado pelo esqueleto: ${line}`, () => {
    assert.deepEqual(codes(line), []);
  });
}

test('esqueleto roda em tempo linear numa linha de 200 KB', () => {
  // Confundíveis de vários alfabetos, colados e separados, e um termo só no fim.
  const chunk = '\u03F2\u03C5\u03BF\u0261\u0131\u1D04\u0570\u0585 ';
  const line = `${chunk.repeat(Math.ceil((200 * 1024) / Buffer.byteLength(chunk, 'utf8')))}\u03F2url`;
  assert.ok(Buffer.byteLength(line, 'utf8') >= 200 * 1024);
  for (const text of [line, '\u03BF'.repeat(205_000), `${'\u{1D41C}'.repeat(60_000)} h\u03BF\u03BFk`]) {
    const start = performance.now();
    scanAgency('contexto/exemplo/SKILL.md', text);
    const elapsed = performance.now() - start;
    assert.ok(elapsed < 100, `levou ${elapsed.toFixed(0)} ms`);
  }
  assert.deepEqual(scanAgency('contexto/exemplo/SKILL.md', line).map((finding) => finding.message), ['referência proibida: "curl"']);
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

// Ofuscação em markdown: antes da normalização, cada linha também é varrida com as entidades HTML
// decodificadas e sem os comentários HTML contidos nela. O texto como está continua varrido.
const OBFUSCATED_LINES: Array<[string, string, string]> = [
  ['comentário HTML no meio do termo', 'Rode cu<!-- -->rl antes.', '"curl"'],
  ['comentário HTML vazio "<!---->"', 'Rode cu<!---->rl antes.', '"curl"'],
  ['comentário HTML abreviado "<!-->"', 'Rode cu<!-->rl antes.', '"curl"'],
  ['entidade decimal de espaço de largura zero', 'Rode cu&#8203;rl antes.', '"curl"'],
  ['entidade hexadecimal de espaço de largura zero', 'Rode cu&#x200B;rl antes.', '"curl"'],
  ['entidade decimal de letra', 'Rode c&#117;rl antes.', '"curl"'],
  ['entidade hexadecimal de letra com X maiúsculo', 'Rode c&#X75;rl antes.', '"curl"'],
  ['entidade decimal sem ponto e vírgula, como o HTML aceita', 'Rode c&#117rl antes.', '"curl"'],
  ['entidade com zeros à esquerda', 'Rode c&#000117;rl antes.', '"curl"'],
  ['&nbsp; entre as palavras de um termo', 'Rode git&nbsp;clone antes.', '"git clone"'],
  ['entidade de homóglifo (U+03F2)', 'Rode &#1010;url antes.', '"curl"'],
  ['entidade e comentário juntos', 'Rode c&#117;<!-- x -->rl antes.', '"curl"'],
  ['comentário que esconde o termo na visualização', 'Tabela <!-- rode curl antes --> de siglas.', '"curl"'],
];

for (const [label, line, term] of OBFUSCATED_LINES) {
  test(`ofuscação em markdown é acusada: ${label}`, () => {
    assert.deepEqual(findingLines(`Linha de cima.\n${line}`), [[2, `referência proibida: ${term}`]]);
  });
}

for (const line of [
  'Construtora Silva &amp; Filhos',
  'se a &lt; b &amp;&amp; c &gt; d',
  '&quot;Obra&quot; e o &nbsp; do HTML',
  'Comentário <!-- revisar com o fiscal --> na planilha.',
  // Decodificação numa passada só: "&amp;#117;" vira "&#117;", que não é decodificado de novo.
  'Rode c&amp;#117;rl antes.',
  // Entidade fora do Unicode fica como está.
  'Rode c&#99999999999;rl antes.',
  // Comentário sem fechamento na linha não some.
  'Rode cu<!-- rl antes.',
]) {
  test(`entidade ou comentário sem termo não é acusado: ${line}`, () => {
    assert.deepEqual(codes(line), []);
  });
}

// Limitação aceita (registrada no relatório): termo partido por ênfase de markdown não é juntado.
test('termo partido por ênfase de markdown não é acusado (limitação aceita)', () => {
  assert.deepEqual(codes('Rode cu**rl** antes.'), []);
});

test('decodificação de entidade e remoção de comentário rodam em tempo linear numa linha de 200 KB', () => {
  const texts = [
    '<!--'.repeat(52_000),
    `${'<!-- x -->'.repeat(21_000)}cu<!-- -->rl`,
    '<!-- '.repeat(23_000) + ' -->'.repeat(23_000),
    `&#${'1'.repeat(205_000)}`,
    `&#x${'f'.repeat(205_000)}`,
    '&'.repeat(205_000),
    '&amp;'.repeat(41_000),
    `${'&#117;'.repeat(35_000)}c&#117;rl`,
    '&#8203;'.repeat(30_000),
  ];
  for (const text of texts) {
    assert.ok(Buffer.byteLength(text, 'utf8') >= 200 * 1024);
    const start = performance.now();
    scanAgency('contexto/exemplo/SKILL.md', text);
    const elapsed = performance.now() - start;
    assert.ok(elapsed < 100, `levou ${elapsed.toFixed(0)} ms`);
  }
});
