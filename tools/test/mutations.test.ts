// Sub-condições de cada regra, cada uma numa cópia temporária do caso válido com uma única
// mudança. O conjunto de códigos acusados tem de ser exatamente o esperado.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { AGENCIA_TERMS } from '../src/constants.js';
import { validateSkillsRoot, type RuleCode } from '../src/validate.js';
import {
  appendLine,
  codesOf,
  copyValidCase,
  cpfWithDv,
  makeTempDir,
  maskCpf,
  removeTempDirs,
  replaceInFile,
} from './helpers.js';

after(removeTempDirs);

interface Case {
  root: string;
  skill: string;
}

type Mutation = (c: Case) => Promise<void>;

const skillMd = (c: Case): string => join(c.skill, 'SKILL.md');
const entrada = (c: Case): string => join(c.skill, 'fixtures', 'entrada.csv');
const normas = (c: Case): string => join(c.skill, 'references', 'normas.md');

const NAME_LINE = 'name: exemplo-valido\n';
const DESCRIPTION_LINE =
  'description: Skill sintética do teste do validador do obraforge. Confere se uma lista de siglas de obra traz sigla, significado e norma de origem em toda linha, sem sigla repetida. Não faz parte do catálogo.\n';
const METADATA_BLOCK = 'metadata:\n  obraforge-area: "contexto"\n  obraforge-fase: "1"\n  obraforge-versao: "1.0.0"\n';
const AVISO_LINE =
  '> **Aviso:** esta skill não substitui o responsável técnico. O resultado deve ser conferido e assumido por profissional habilitado, com ART ou RRT quando exigido.';
const RESPONDER = 'Não reescreva a lista.\n';

const CPF = cpfWithDv('390533447');
// O mesmo CPF com o último dígito verificador trocado.
const CPF_WRONG_DV = `${CPF.slice(0, 10)}${(Number(CPF.at(-1)) + 1) % 10}`;

const editSkill = (from: string, to: string): Mutation => (c) => replaceInFile(skillMd(c), from, to);
const addToSkillBody = (line: string): Mutation => (c) => replaceInFile(skillMd(c), RESPONDER, `${RESPONDER}${line}\n`);
const addToFrontmatter = (line: string): Mutation => editSkill(NAME_LINE, `${NAME_LINE}${line}`);
const writeInSkill = (path: string, content: string | Buffer): Mutation => async (c) => {
  await mkdir(join(c.skill, path, '..'), { recursive: true });
  await writeFile(join(c.skill, path), content);
};

const cases: Array<[string, RuleCode[], Mutation]> = [
  // ESTRUTURA
  ['sem a pasta fixtures/', ['ESTRUTURA'], (c) => rm(join(c.skill, 'fixtures'), { recursive: true })],
  ['sem fixtures/entrada.*', ['ESTRUTURA'], (c) => rm(entrada(c))],
  ['fixtures/entrada sem extensão', ['ESTRUTURA'], async (c) => {
    await rm(entrada(c));
    await writeFile(join(c.skill, 'fixtures', 'entrada'), 'sigla;significado\n');
  }],
  ['sem SKILL.md', ['ESTRUTURA'], (c) => rm(skillMd(c))],
  ['skill.md em minúsculas no lugar de SKILL.md', ['ESTRUTURA'], async (c) => {
    await rm(skillMd(c));
    await writeInSkill('skill.md', 'x\n')(c);
  }],
  ['sem references/normas.md', ['ESTRUTURA'], (c) => rm(normas(c))],
  ['normas.md binário', ['ESTRUTURA'], (c) => writeFile(normas(c), Buffer.from([0x00, 0x01, 0x02]))],
  ['SKILL.md binário', ['ESTRUTURA'], (c) => writeFile(skillMd(c), Buffer.from([0x2d, 0x2d, 0x2d, 0x0a, 0x00]))],
  ['SKILL.md sem frontmatter', ['ESTRUTURA'], editSkill(`---\n${NAME_LINE}${DESCRIPTION_LINE}${METADATA_BLOCK}---\n`, '')],
  ['frontmatter sem a linha de fechamento', ['ESTRUTURA'], editSkill(`${METADATA_BLOCK}---\n`, METADATA_BLOCK)],
  ['frontmatter com YAML inválido', ['ESTRUTURA'], editSkill(NAME_LINE, 'name: [exemplo-valido\n')],
  ['frontmatter com tag customizada', ['ESTRUTURA'], editSkill(NAME_LINE, 'name: !js exemplo-valido\n')],
  ['frontmatter com tag do YAML 1.1 (!!binary)', ['ESTRUTURA'], editSkill(NAME_LINE, 'name: !!binary ZXhlbXBsbw==\n')],
  ['frontmatter com alias', ['ESTRUTURA'], editSkill(NAME_LINE, 'name: &nome exemplo-valido\napelido: *nome\n')],
  ['frontmatter com chave duplicada', ['ESTRUTURA'], editSkill(NAME_LINE, `${NAME_LINE}name: outro-nome\n`)],
  ['frontmatter que é lista, não mapa', ['ESTRUTURA'], editSkill(`${NAME_LINE}${DESCRIPTION_LINE}${METADATA_BLOCK}`, '- a\n- b\n')],
  ['arquivo solto na pasta de área', ['ESTRUTURA'], (c) => writeFile(join(c.root, 'contexto', 'solto.md'), 'x\n')],

  // NOME
  ['name ausente', ['NOME'], editSkill(NAME_LINE, '')],
  ['name que não é texto', ['NOME'], editSkill(NAME_LINE, 'name: 42\n')],
  ['name com hífen duplicado', ['NOME'], editSkill(NAME_LINE, 'name: exemplo--valido\n')],
  ['name com maiúscula', ['NOME'], editSkill(NAME_LINE, 'name: Exemplo-valido\n')],
  ['name com hífen no fim', ['NOME'], editSkill(NAME_LINE, 'name: exemplo-valido-\n')],
  ['name com 65 caracteres', ['NOME'], editSkill(NAME_LINE, `name: ${'a'.repeat(65)}\n`)],
  ['name em retiradas.txt', ['NOME'], (c) => writeFile(join(c.root, 'retiradas.txt'), '# retiradas\n\nexemplo-valido\n')],
  ['name comentado em retiradas.txt não conta', [], (c) => writeFile(join(c.root, 'retiradas.txt'), '# exemplo-valido\n')],

  // DESCRICAO
  ['description ausente', ['DESCRICAO'], editSkill(DESCRIPTION_LINE, '')],
  ['description só com espaços', ['DESCRICAO'], editSkill(DESCRIPTION_LINE, 'description: "   "\n')],
  ['description que não é texto', ['DESCRICAO'], editSkill(DESCRIPTION_LINE, 'description: 42\n')],
  // 1024 code points de emoji são 2048 unidades UTF-16: conta code point.
  ['description com 1024 caracteres', [], editSkill(DESCRIPTION_LINE, `description: ${'🏗'.repeat(1024)}\n`)],
  ['description com 1025 caracteres', ['DESCRICAO'], editSkill(DESCRIPTION_LINE, `description: ${'🏗'.repeat(1025)}\n`)],

  // METADATA
  ['metadata ausente', ['METADATA'], editSkill(METADATA_BLOCK, '')],
  ['obraforge-fase sem aspas', ['METADATA'], editSkill('obraforge-fase: "1"', 'obraforge-fase: 1')],
  ['chave extra do metadata que não é texto', ['METADATA'], editSkill(METADATA_BLOCK, `${METADATA_BLOCK}  outra: 5\n`)],
  ['falta obraforge-versao', ['METADATA'], editSkill('  obraforge-versao: "1.0.0"\n', '')],
  ['área fora da lista fechada', ['METADATA'], editSkill('obraforge-area: "contexto"', 'obraforge-area: "marketing"')],
  ['área diferente da pasta pai', ['METADATA'], editSkill('obraforge-area: "contexto"', 'obraforge-area: "orcamento"')],
  ['fase 0', ['METADATA'], editSkill('obraforge-fase: "1"', 'obraforge-fase: "0"')],
  ['versão com dois números', ['METADATA'], editSkill('obraforge-versao: "1.0.0"', 'obraforge-versao: "1.0"')],
  ['versão com zero à esquerda', ['METADATA'], editSkill('obraforge-versao: "1.0.0"', 'obraforge-versao: "01.0.0"')],
  ['versão com pré-release e build', [], editSkill('obraforge-versao: "1.0.0"', 'obraforge-versao: "1.0.0-rc.1+build.5"')],

  // NORMA
  ['entrada de normas.md sem Fonte', ['NORMA'], (c) => replaceInFile(normas(c), '- Fonte: https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm\n', '')],
  ['entrada de normas.md com Título vazio', ['NORMA'], (c) => replaceInFile(normas(c), '- Título: Lei de Licitações e Contratos Administrativos', '- Título:')],
  ['entrada de normas.md com Ano de 2 dígitos', ['NORMA'], (c) => replaceInFile(normas(c), '- Ano: 2021', '- Ano: 21')],
  ['citação "Lei 14133" casa com a entrada "Lei 14.133/2021"', [], addToSkillBody('Veja também a Lei 14133.')],
  ['citação "NR 18" casa com a entrada "NR-18"', [], addToSkillBody('Confira a NR 18.')],
  ['citação de NBR sem entrada', ['NORMA'], addToSkillBody('Confira a ABNT NBR 15575-1:2021.')],
  ['citação de Resolução sem entrada', ['NORMA'], addToSkillBody('Siga a Resolução CONAMA nº 307/2002.')],
  ['citação de Decreto sem entrada', ['NORMA'], addToSkillBody('Siga o Decreto nº 11.246/2022.')],
  ['citação no frontmatter também conta', ['NORMA'], editSkill('Não faz parte do catálogo.', 'Segue a NR-35.')],

  // AVISO
  ['aviso com espaço antes e depois', [], editSkill(AVISO_LINE, `   ${AVISO_LINE}   `)],
  ['aviso com uma palavra trocada', ['AVISO'], editSkill(AVISO_LINE, AVISO_LINE.replace('habilitado', 'qualificado'))],

  // AGENCIA: arquivos além do SKILL.md, borda de palavra e evasão por Unicode
  ['curl em fixtures/esperado.md', ['AGENCIA'], (c) => appendLine(join(c.skill, 'fixtures', 'esperado.md'), 'Rode curl antes.')],
  ['wget em references/', ['AGENCIA'], writeInSkill('references/tabela.md', 'Baixe com wget.\n')],
  ['hook em assets/', ['AGENCIA'], writeInSkill('assets/modelo.md', 'Instale o hook do agente.\n')],
  ['allowed-tools no frontmatter', ['AGENCIA'], editSkill(NAME_LINE, `${NAME_LINE}allowed-tools: Read\n`)],
  ['allowed-tools escrito com escape YAML', ['AGENCIA'], editSkill(NAME_LINE, `${NAME_LINE}"allowed\\x2Dtools": Read\n`)],
  ['Hooks com maiúscula', ['AGENCIA'], addToSkillBody('Hooks do agente.')],
  ['webhook não é hook', [], addToSkillBody('O sistema de obra avisa por webhook.')],
  ['fetch( no meio do código', ['AGENCIA'], addToSkillBody('`await fetch("https://exemplo")`')],
  ['curl partido por espaço de largura zero', ['AGENCIA'], addToSkillBody('Rode cu\u200brl antes.')],
  ['curl em letras de largura total', ['AGENCIA'], addToSkillBody('Rode ｃｕｒｌ antes.')],

  // AGENCIA: sintaxe de execução de shell do Claude Code (roda antes de o modelo ler a skill)
  ['!` no início da linha', ['AGENCIA'], addToSkillBody('!`date`')],
  ['!` no meio da linha', ['AGENCIA'], addToSkillBody('Data de hoje: !`date`')],
  ['!` colado em outro caractere', ['AGENCIA'], addToSkillBody('DATA=!`date`')],
  ['!` em fixtures/esperado.md', ['AGENCIA'], (c) => appendLine(join(c.skill, 'fixtures', 'esperado.md'), '- Versão: !`date`')],
  ['bloco ```! em references/', ['AGENCIA'], writeInSkill('references/ambiente.md', '# Ambiente\n\n```!\ndate\n```\n')],
  ['bloco ``` ! com espaço', ['AGENCIA'], writeInSkill('references/ambiente.md', '# Ambiente\n\n``` !\ndate\n```\n')],
  ['bloco ~~~!', ['AGENCIA'], writeInSkill('references/ambiente.md', '# Ambiente\n\n~~~!\ndate\n~~~\n')],
  ['bloco ~~~ ! com espaço', ['AGENCIA'], writeInSkill('references/ambiente.md', '# Ambiente\n\n~~~ !\ndate\n~~~\n')],
  ['bloco ````! com recuo e quatro crases', ['AGENCIA'], addToSkillBody('   ````!\n   date\n   ````')],
  ['exclamação seguida de espaço e crase não é execução', [], addToSkillBody('Atenção! `Sigla` repetida é erro.')],
  ['bloco de código comum não é execução', [], writeInSkill('references/modelo.md', '# Modelo\n\n```text\nsigla;significado\n```\n')],

  // DADO-PESSOAL: o que é fictício não é acusado
  ['CPF de dígito repetido', [], (c) => appendLine(entrada(c), 'XPT;teste;;;111.111.111-11')],
  ['CPF sem máscara com DV válido', ['DADO-PESSOAL'], (c) => appendLine(entrada(c), `XPT;teste;;;${CPF}`)],
  ['CPF com DV inválido', [], (c) => appendLine(entrada(c), `XPT;teste;;;${maskCpf(CPF_WRONG_DV)}`)],
  ['e-mail em subdomínio de example.org', [], (c) => appendLine(entrada(c), 'XPT;teste;;;obra@sub.example.org')],
  ['e-mail em example.com.invalid não é example.com', ['DADO-PESSOAL'], (c) => appendLine(entrada(c), 'XPT;teste;;;obra@example.com.invalid')],
  ['versão de pacote com arroba não é e-mail', [], (c) => appendLine(entrada(c), 'XPT;teste;;;obraforge@0.0.1')],
  ['telefone fictício de 8 dígitos', [], (c) => appendLine(entrada(c), 'XPT;teste;;;(00) 0000-0000')],
  ['telefone com +55', ['DADO-PESSOAL'], (c) => appendLine(entrada(c), 'XPT;teste;;;+55 10 90000-0001')],
  ['número sem DDD não é telefone', [], (c) => appendLine(entrada(c), 'XPT;teste;;;90000-0001')],
  // Limitação conhecida: arquivo binário (byte NUL nos primeiros 8 KB) não é escaneado.
  ['conteúdo de arquivo binário não é escaneado', [], writeInSkill('assets/planilha.bin', Buffer.concat([Buffer.from([0]), Buffer.from('curl fulano@obraforge.invalid\n')]))],

  // LINK
  ['link para pasta de fora não é seguido', ['LINK'], async (c) => {
    const outside = await makeTempDir();
    await writeFile(join(outside, 'fora.md'), 'Rode curl. fulano@obraforge.invalid\n');
    await symlink(outside, join(c.skill, 'assets'));
  }],
  ['link na pasta de área', ['LINK'], async (c) => symlink(await makeTempDir(), join(c.root, 'orcamento'))],
  ['link no lugar de retiradas.txt', ['LINK'], (c) => symlink('contexto/exemplo-valido/SKILL.md', join(c.root, 'retiradas.txt'))],
  ['FIFO não é lido', ['LINK'], async (c) => {
    execFileSync('mkfifo', [join(c.skill, 'fixtures', 'fila')]);
  }],
];

for (const [name, expected, mutate] of cases) {
  test(name, async () => {
    const c = await copyValidCase();
    await mutate(c);
    assert.deepEqual(await codesOf(c.root), expected);
  });
}

// SCRIPTS: arquivo com extensão de código em qualquer pasta da skill, não só em scripts/. A lista
// é repetida aqui de propósito, à parte da constante do validador.
const CODE_EXTENSIONS = [
  '.sh', '.bash', '.zsh', '.ps1', '.psm1', '.bat', '.cmd', '.py', '.js', '.mjs', '.cjs', '.ts', '.rb', '.pl',
  '.php', '.exe', '.dll', '.so', '.dylib', '.jar', '.vbs', '.applescript',
];

for (const extension of CODE_EXTENSIONS) {
  test(`SCRIPTS acusa assets/ferramenta${extension}`, async () => {
    const c = await copyValidCase();
    await writeInSkill(`assets/ferramenta${extension}`, 'x\n')(c);
    assert.deepEqual(await codesOf(c.root), ['SCRIPTS']);
  });
}

const scriptFileCases: Array<[string, RuleCode[], Mutation]> = [
  ['arquivo de código na raiz da skill', ['SCRIPTS'], writeInSkill('rodar.sh', 'x\n')],
  ['arquivo de código em fixtures/', ['SCRIPTS'], writeInSkill('fixtures/gerar.py', 'x\n')],
  ['extensão de código em maiúsculas', ['SCRIPTS'], writeInSkill('references/rodar.PS1', 'x\n')],
  ['extensão de código com ponto final', ['SCRIPTS'], writeInSkill('assets/rodar.sh.', 'x\n')],
  ['extensão de texto depois da de código não é código', [], writeInSkill('assets/rodar.sh.md', '# Nota\n')],
];

for (const [name, expected, mutate] of scriptFileCases) {
  test(name, async () => {
    const c = await copyValidCase();
    await mutate(c);
    assert.deepEqual(await codesOf(c.root), expected);
  });
}

test('SCRIPTS aponta o arquivo de código', async () => {
  const c = await copyValidCase();
  await writeInSkill('assets/ferramenta.py', 'x\n')(c);
  const findings = await validateSkillsRoot(c.root);
  assert.deepEqual(findings.map((finding) => [finding.code, finding.file]), [['SCRIPTS', 'contexto/exemplo-valido/assets/ferramenta.py']]);
});

// Termos da ampliação da AGENCIA, repetidos aqui à parte da constante do validador. Cada um vai
// em minúsculas; o laço sobre AGENCIA_TERMS, mais abaixo, confere em maiúsculas.
const NETWORK_AND_EXECUTION_TERMS = [
  'WebFetch', 'WebSearch', 'Invoke-RestMethod', 'iwr', 'irm', 'certutil', 'netcat', 'ncat', 'scp', 'sftp', 'rsync',
  'ssh', 'telnet', 'git clone', 'npx', 'pip install', 'npm install', 'bash -c', 'sh -c', 'pwsh',
];
const AGENT_CONFIG_TERMS = [
  'settings.local.json', 'CLAUDE.md', 'AGENTS.md', '.mcp.json', 'mcpServers', 'PreToolUse', 'PostToolUse',
  'UserPromptSubmit', 'SessionStart',
];

for (const term of [...NETWORK_AND_EXECUTION_TERMS, ...AGENT_CONFIG_TERMS]) {
  test(`AGENCIA acusa o termo novo ${term}`, async () => {
    const c = await copyValidCase();
    await addToSkillBody(`Exemplo: ${term.toLowerCase()} aqui.`)(c);
    assert.deepEqual(await codesOf(c.root), ['AGENCIA']);
  });
}

// Falso positivo: frase legítima de obra que tem de continuar sem achado. "NC" (não conformidade)
// fica fora da lista de propósito; o termo novo não casa dentro de outra palavra.
const legitimatePhrases: Array<[string, string]> = [
  ['NC de checklist de obra', 'Registre a NC no checklist e feche a NC antes da medição.'],
  ['registro de não conformidade (NC)', 'Abra o registro de não conformidade (NC) e anexe a foto.'],
  ['NCs no plural', 'As NCs abertas entram no plano de ação da obra.'],
  ['Lei de Hooke', 'A Lei de Hooke relaciona tensão e deformação no regime elástico.'],
  ['irm dentro de palavra', 'Confirme a firma reconhecida no contrato de empreitada.'],
  ['ncat dentro de palavra', 'Concatene as colunas de sigla e significado.'],
];

for (const [name, phrase] of legitimatePhrases) {
  test(`AGENCIA não acusa frase legítima: ${name}`, async () => {
    const c = await copyValidCase();
    await addToSkillBody(phrase)(c);
    assert.deepEqual(await codesOf(c.root), []);
  });
}

test('termo de duas palavras com espaço duplo ou TAB entre elas', async () => {
  const c = await copyValidCase();
  await addToSkillBody('Rode git  clone e depois pip\tinstall.')(c);
  const findings = await validateSkillsRoot(c.root);
  assert.deepEqual(
    findings.map((finding) => [finding.code, finding.message]),
    [['AGENCIA', 'referência proibida: "git clone", "pip install"']],
  );
});

// Caracteres invisíveis ou separadores que partiriam um termo sem mudar o que o agente lê. Os três
// últimos não estão na lista do pedido; são do mesmo grupo Unicode (Default_Ignorable_Code_Point).
const INVISIBLE_CHARS: Array<[string, string]> = [
  ['U+2028 (separador de linha)', '\u2028'],
  ['U+2029 (separador de parágrafo)', '\u2029'],
  ['U+0001', '\u0001'],
  ['U+0008 (backspace)', '\u0008'],
  ['U+000B (tabulação vertical)', '\u000B'],
  ['U+000C (avanço de página)', '\u000C'],
  ['U+001B (escape)', '\u001B'],
  ['U+007F (delete)', '\u007F'],
  ['U+0085 (NEL)', '\u0085'],
  ['U+009F', '\u009F'],
  ['U+034F (combining grapheme joiner)', '\u034F'],
  ['U+FE00 (seletor de variação 1)', '\uFE00'],
  ['U+FE0F (seletor de variação 16)', '\uFE0F'],
  ['U+115F (preenchimento Hangul)', '\u115F'],
  ['U+1160 (preenchimento Hangul)', '\u1160'],
  ['U+3164 (preenchimento Hangul)', '\u3164'],
  ['U+FFA0 (preenchimento Hangul de meia largura)', '\uFFA0'],
  ['U+E0100 (seletor de variação 17)', '\u{E0100}'],
  ['U+180B (seletor de variação mongol)', '\u180B'],
  ['U+17B4 (vogal khmer invisível)', '\u17B4'],
];

for (const [label, char] of INVISIBLE_CHARS) {
  test(`curl partido por ${label}`, async () => {
    const c = await copyValidCase();
    await addToSkillBody(`Rode cu${char}rl antes.`)(c);
    assert.deepEqual(await codesOf(c.root), ['AGENCIA']);
  });

  test(`CPF partido por ${label}`, async () => {
    const c = await copyValidCase();
    await appendLine(entrada(c), `XPT;teste;;;${CPF.slice(0, 5)}${char}${CPF.slice(5)}`);
    assert.deepEqual(await codesOf(c.root), ['DADO-PESSOAL']);
  });
}

test('TAB não é tirado: curl partido por TAB não é juntado', async () => {
  const c = await copyValidCase();
  await addToSkillBody('Rode cu\trl antes.')(c);
  assert.deepEqual(await codesOf(c.root), []);
});

test('separadores tirados da varredura não mudam o número da linha', async () => {
  const c = await copyValidCase();
  await addToSkillBody('Separadores: a\u2028b\u2029c\u0085d\u000Be\u000Cf\nRode cu\u2028rl antes.')(c);
  const findings = await validateSkillsRoot(c.root);
  assert.deepEqual(findings.map((finding) => [finding.code, finding.line]), [['AGENCIA', 29]]);
});

// Arquivo com extensão de texto tem de ser UTF-8: UTF-16 (com ou sem BOM), byte NUL ou UTF-8
// inválido vira ESTRUTURA, em vez de o arquivo sair da varredura como binário.
const UTF8_MESSAGE = 'arquivo de texto precisa ser UTF-8';
const utf16le = (text: string): Buffer => Buffer.from(text, 'utf16le');
const TEXT_EXTENSIONS = ['.md', '.markdown', '.txt', '.csv', '.tsv', '.json', '.yaml', '.yml', '.xml', '.html', '.htm'];

for (const extension of TEXT_EXTENSIONS) {
  test(`UTF-16LE sem BOM em references/extra${extension}`, async () => {
    const c = await copyValidCase();
    await writeInSkill(`references/extra${extension}`, utf16le('Rode curl antes.\n'))(c);
    assert.deepEqual(await codesOf(c.root), ['ESTRUTURA']);
  });
}

const encodingCases: Array<[string, RuleCode[], Mutation]> = [
  ['UTF-16LE com BOM', ['ESTRUTURA'], writeInSkill('references/extra.md', Buffer.concat([Buffer.from([0xff, 0xfe]), utf16le('Rode curl antes.\n')]))],
  // Só ideogramas: nenhum byte NUL, então só o BOM (ou o UTF-8 inválido) denuncia.
  ['UTF-16LE com BOM e sem byte NUL', ['ESTRUTURA'], writeInSkill('references/extra.md', Buffer.concat([Buffer.from([0xff, 0xfe]), utf16le('工程\n')]))],
  ['UTF-16BE com BOM', ['ESTRUTURA'], writeInSkill('references/extra.md', Buffer.concat([Buffer.from([0xfe, 0xff]), utf16le('Rode curl antes.\n').swap16()]))],
  ['UTF-8 inválido sem byte NUL', ['ESTRUTURA'], writeInSkill('references/extra.md', Buffer.concat([Buffer.from('Rode '), Buffer.from([0xc3, 0x28]), Buffer.from(' antes.\n')]))],
  ['byte NUL depois dos primeiros 8 KB', ['ESTRUTURA'], writeInSkill('references/extra.md', `${'a'.repeat(9000)}\n\0Rode curl antes.\n`)],
  ['extensão de texto em maiúsculas', ['ESTRUTURA'], writeInSkill('references/EXTRA.MD', utf16le('Rode curl antes.\n'))],
  ['fixtures/entrada.csv em UTF-16LE', ['ESTRUTURA'], (c) => writeFile(entrada(c), utf16le('sigla;significado;norma\nNR;Norma Regulamentadora;NR-18\n'))],
  // Limitação registrada: binário de outra extensão continua sem varredura.
  ['.xlsx com UTF-16 não é varrido', [], writeInSkill('assets/modelo.xlsx', utf16le('Rode curl antes.\n'))],
  ['.pdf com UTF-16 não é varrido', [], writeInSkill('assets/manual.pdf', utf16le('Rode curl antes.\n'))],
  ['.png com UTF-16 não é varrido', [], writeInSkill('assets/foto.png', utf16le('Rode curl antes.\n'))],
];

for (const [name, expected, mutate] of encodingCases) {
  test(name, async () => {
    const c = await copyValidCase();
    await mutate(c);
    assert.deepEqual(await codesOf(c.root), expected);
  });
}

test('arquivo de texto que não é UTF-8 aponta o arquivo e a mensagem', async () => {
  const c = await copyValidCase();
  await writeInSkill('references/extra.md', utf16le('Rode curl antes.\n'))(c);
  const findings = await validateSkillsRoot(c.root);
  assert.deepEqual(
    findings.map((finding) => [finding.code, finding.file, finding.message]),
    [['ESTRUTURA', 'contexto/exemplo-valido/references/extra.md', UTF8_MESSAGE]],
  );
});

test('SKILL.md em UTF-16LE gera um único achado, o de UTF-8', async () => {
  const c = await copyValidCase();
  await writeFile(skillMd(c), utf16le(await readFile(skillMd(c), 'utf8')));
  const findings = await validateSkillsRoot(c.root);
  assert.deepEqual(
    findings.map((finding) => [finding.code, finding.file, finding.message]),
    [['ESTRUTURA', 'contexto/exemplo-valido/SKILL.md', UTF8_MESSAGE]],
  );
});

// Tetos de tamanho, verificados antes do parse do YAML e da varredura. O tamanho do frontmatter é
// o do YAML entre as linhas ---, em bytes UTF-8.
const FRONTMATTER_MAX = 16 * 1024;
const TEXT_FILE_MAX = 1024 * 1024;
const FRONTMATTER_BASE = Buffer.byteLength(`${NAME_LINE}${DESCRIPTION_LINE}${METADATA_BLOCK}`);
// Uma linha license que deixa o YAML com `size` bytes: o YAML é a base menos o \n final, mais a linha.
const frontmatterOfSize = (size: number): Mutation => addToFrontmatter(`license: ${'a'.repeat(size - FRONTMATTER_BASE - 'license: '.length)}\n`);

const sizeCases: Array<[string, RuleCode[], Mutation]> = [
  ['frontmatter com 16 KiB', [], frontmatterOfSize(FRONTMATTER_MAX)],
  ['frontmatter com 16 KiB e 1 byte', ['ESTRUTURA'], frontmatterOfSize(FRONTMATTER_MAX + 1)],
  ['arquivo de texto com 1 MiB', [], writeInSkill('references/grande.md', 'x\n'.repeat(TEXT_FILE_MAX / 2))],
  ['arquivo de texto com 1 MiB e 1 byte', ['ESTRUTURA'], writeInSkill('references/grande.md', `${'x\n'.repeat(TEXT_FILE_MAX / 2)}x`)],
  ['arquivo de outra extensão, sem byte NUL, com mais de 1 MiB', ['ESTRUTURA'], writeInSkill('assets/dados.dat', 'x\n'.repeat(TEXT_FILE_MAX / 2 + 1))],
  ['binário com mais de 1 MiB não é varrido', [], writeInSkill('assets/dados.bin', Buffer.concat([Buffer.from([0]), Buffer.alloc(TEXT_FILE_MAX, 0x61)]))],
];

for (const [name, expected, mutate] of sizeCases) {
  test(name, async () => {
    const c = await copyValidCase();
    await mutate(c);
    assert.deepEqual(await codesOf(c.root), expected);
  });
}

test('SKILL.md com mais de 1 MiB gera um único achado, o do teto', async () => {
  const c = await copyValidCase();
  await appendLine(skillMd(c), 'x\n'.repeat(TEXT_FILE_MAX / 2));
  const findings = await validateSkillsRoot(c.root);
  assert.deepEqual(
    findings.map((finding) => [finding.code, finding.file, finding.message]),
    [['ESTRUTURA', 'contexto/exemplo-valido/SKILL.md', 'arquivo de texto com mais de 1 MiB (1048576 bytes)']],
  );
});

test('frontmatter de 50 mil chaves sai em menos de 1 s, com ESTRUTURA', async () => {
  const c = await copyValidCase();
  const keys = Array.from({ length: 50_000 }, (_, index) => `k${index}: v\n`).join('');
  await editSkill(NAME_LINE, `${NAME_LINE}${keys}`)(c);
  const start = performance.now();
  const findings = await validateSkillsRoot(c.root);
  const elapsed = performance.now() - start;
  assert.ok(elapsed < 1000, `levou ${Math.round(elapsed)} ms`);
  assert.deepEqual(
    findings.map((finding) => [finding.code, finding.file, finding.message]),
    [['ESTRUTURA', 'contexto/exemplo-valido/SKILL.md', 'frontmatter com mais de 16 KiB (16384 bytes)']],
  );
});

// BOM UTF-8 no início de arquivo de texto sai antes de ler o frontmatter e de varrer.
const BOM = '\uFEFF';
const prependToFile = (path: (c: Case) => string, prefix: string): Mutation => async (c) => {
  await writeFile(path(c), `${prefix}${await readFile(path(c), 'utf8')}`);
};
const NORMS_TOP = '# Referências normativas\n\n';

const bomCases: Array<[string, RuleCode[], Mutation]> = [
  ['SKILL.md com BOM UTF-8 passa igual ao sem BOM', [], prependToFile(skillMd, BOM)],
  // Controle do caso seguinte: sem o título de topo, a entrada ## NR-18 fica na primeira linha.
  ['normas.md sem o título de topo', [], (c) => replaceInFile(normas(c), NORMS_TOP, '')],
  ['normas.md com BOM e a entrada na primeira linha', [], async (c) => {
    await replaceInFile(normas(c), NORMS_TOP, '');
    await prependToFile(normas, BOM)(c);
  }],
];

for (const [name, expected, mutate] of bomCases) {
  test(name, async () => {
    const c = await copyValidCase();
    await mutate(c);
    assert.deepEqual(await codesOf(c.root), expected);
  });
}

test('SKILL.md com BOM: achado do frontmatter aponta a linha certa', async () => {
  const c = await copyValidCase();
  await editSkill(NAME_LINE, 'name: Exemplo-valido\n')(c);
  await prependToFile(skillMd, BOM)(c);
  const findings = await validateSkillsRoot(c.root);
  assert.deepEqual(findings.map((finding) => [finding.code, finding.line]), [['NOME', 2]]);
});

// Arquivo ou pasta oculto (nome começando com ".") dentro da skill vira ESTRUTURA. O conteúdo
// continua varrido.
const HIDDEN_MESSAGE = 'arquivo oculto dentro da skill';

const hiddenCases: Array<[string, Mutation, Array<[RuleCode, string]>]> = [
  ['.DS_Store na raiz da skill', writeInSkill('.DS_Store', Buffer.from([0, 0, 0, 1, 0x42, 0x75, 0x64, 0x31])), [
    ['ESTRUTURA', 'contexto/exemplo-valido/.DS_Store'],
  ]],
  ['arquivo oculto em references/', writeInSkill('references/.instrucoes.md', 'Siga o procedimento.\n'), [
    ['ESTRUTURA', 'contexto/exemplo-valido/references/.instrucoes.md'],
  ]],
  ['pasta oculta: um achado, na pasta', writeInSkill('assets/.oculta/nota.md', 'Nota.\n'), [
    ['ESTRUTURA', 'contexto/exemplo-valido/assets/.oculta'],
  ]],
];

for (const [name, mutate, expected] of hiddenCases) {
  test(name, async () => {
    const c = await copyValidCase();
    await mutate(c);
    const findings = await validateSkillsRoot(c.root);
    assert.deepEqual(
      findings.map((finding) => [finding.code, finding.file, finding.message]),
      expected.map(([code, file]) => [code, file, HIDDEN_MESSAGE]),
    );
  });
}

test('conteúdo de arquivo oculto continua varrido', async () => {
  const c = await copyValidCase();
  await writeInSkill('references/.instrucoes.md', 'Rode curl antes.\n')(c);
  assert.deepEqual(await codesOf(c.root), ['AGENCIA', 'ESTRUTURA']);
});

for (const term of AGENCIA_TERMS) {
  test(`AGENCIA acusa o termo ${term}`, async () => {
    const c = await copyValidCase();
    await addToSkillBody(`Exemplo: ${term.toUpperCase()} aqui.`)(c);
    assert.deepEqual(await codesOf(c.root), ['AGENCIA']);
  });
}

// Lista branca do frontmatter: no topo, só as chaves do padrão Agent Skills. As chaves próprias
// do Claude Code (e qualquer outra) viram AGENCIA, com um único achado na linha da chave.
const FOREIGN_KEYS = [
  'allowed-tools', 'hooks', 'disallowed-tools', 'shell', 'model', 'context', 'agent', 'paths', 'effort',
  'user-invocable', 'disable-model-invocation', 'when_to_use', 'arguments', 'argument-hint', 'background',
  '__proto__', 'Name',
];

for (const key of FOREIGN_KEYS) {
  test(`chave de frontmatter fora do padrão: ${key}`, async () => {
    const c = await copyValidCase();
    await editSkill(NAME_LINE, `${NAME_LINE}${key}: valor\n`)(c);
    const findings = await validateSkillsRoot(c.root);
    assert.deepEqual(
      findings.map((finding) => [finding.code, finding.line, finding.message]),
      [['AGENCIA', 3, `chave de frontmatter fora do padrão Agent Skills: ${key}`]],
    );
  });
}

test('allowed-tools com escape YAML é acusado pela lista branca', async () => {
  const c = await copyValidCase();
  await editSkill(NAME_LINE, `${NAME_LINE}"allowed\\x2Dtools": Read\n`)(c);
  const findings = await validateSkillsRoot(c.root);
  assert.deepEqual(
    findings.map((finding) => [finding.code, finding.line, finding.message]),
    [['AGENCIA', 3, 'chave de frontmatter fora do padrão Agent Skills: allowed-tools']],
  );
});

test('allowed-tools com termo proibido no valor gera um único achado, o da lista branca', async () => {
  const c = await copyValidCase();
  await editSkill(NAME_LINE, `${NAME_LINE}allowed-tools: Bash(curl *)\n`)(c);
  const findings = await validateSkillsRoot(c.root);
  assert.deepEqual(
    findings.map((finding) => [finding.code, finding.line, finding.message]),
    [['AGENCIA', 3, 'chave de frontmatter fora do padrão Agent Skills: allowed-tools']],
  );
});

const LICENSE_LINE = 'license: MIT\n';
const COMPATIBILITY_LINE = 'compatibility: Qualquer agente compatível com o padrão Agent Skills.\n';

const frontmatterFieldCases: Array<[string, RuleCode[], Mutation]> = [
  ['license e compatibility válidos', [], addToFrontmatter(`${LICENSE_LINE}${COMPATIBILITY_LINE}`)],
  ['license que não é texto', ['METADATA'], addToFrontmatter('license: 42\n')],
  ['license vazia', ['METADATA'], addToFrontmatter('license: ""\n')],
  ['license só com espaços', ['METADATA'], addToFrontmatter('license: "   "\n')],
  ['license sem valor (nulo)', ['METADATA'], addToFrontmatter('license:\n')],
  ['license em lista', ['METADATA'], addToFrontmatter('license: [MIT]\n')],
  ['compatibility que não é texto', ['METADATA'], addToFrontmatter('compatibility: 5\n')],
  ['compatibility vazia', ['METADATA'], addToFrontmatter('compatibility: ""\n')],
  // 500 code points de emoji são 1000 unidades UTF-16: conta code point.
  ['compatibility com 500 caracteres', [], addToFrontmatter(`compatibility: ${'🏗'.repeat(500)}\n`)],
  ['compatibility com 501 caracteres', ['METADATA'], addToFrontmatter(`compatibility: ${'🏗'.repeat(501)}\n`)],
  ['chave extra de texto no metadata', ['METADATA'], editSkill(METADATA_BLOCK, `${METADATA_BLOCK}  outra: "x"\n`)],
  ['chave do Claude Code dentro do metadata', ['METADATA'], editSkill(METADATA_BLOCK, `${METADATA_BLOCK}  paths: "*.md"\n`)],
];

for (const [name, expected, mutate] of frontmatterFieldCases) {
  test(name, async () => {
    const c = await copyValidCase();
    await mutate(c);
    assert.deepEqual(await codesOf(c.root), expected);
  });
}

test('chave extra do metadata aponta a linha e o nome da chave', async () => {
  const c = await copyValidCase();
  await editSkill(METADATA_BLOCK, `${METADATA_BLOCK}  outra: "x"\n`)(c);
  const findings = await validateSkillsRoot(c.root);
  assert.deepEqual(
    findings.map((finding) => [finding.code, finding.line, finding.message]),
    [['METADATA', 8, 'metadata.outra fora da lista (só obraforge-area, obraforge-fase e obraforge-versao)']],
  );
});

test('allowed-tools no frontmatter gera um único achado', async () => {
  const c = await copyValidCase();
  await editSkill(NAME_LINE, `${NAME_LINE}allowed-tools: Read\n`)(c);
  const findings = await validateSkillsRoot(c.root);
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.line, 3);
});

test('achado aponta arquivo relativo à raiz e a linha', async () => {
  const c = await copyValidCase();
  await addToSkillBody('Rode curl antes.')(c);
  const [finding] = await validateSkillsRoot(c.root);
  assert.equal(finding?.file, 'contexto/exemplo-valido/SKILL.md');
  assert.equal(finding?.line, 28);
});

test('raiz que é link simbólico é recusada com erro', async () => {
  const dir = await makeTempDir();
  const c = await copyValidCase();
  await symlink(c.root, join(dir, 'skills'));
  await assert.rejects(validateSkillsRoot(join(dir, 'skills')), /não é uma pasta/);
  // Com barra final, o lstat seguiria o link se o caminho não fosse normalizado antes.
  await assert.rejects(validateSkillsRoot(`${join(dir, 'skills')}/`), /não é uma pasta/);
});

test('raiz inexistente é erro, não "nenhum achado"', async () => {
  const dir = await makeTempDir();
  await assert.rejects(validateSkillsRoot(join(dir, 'nao-existe')), /ENOENT/);
});
