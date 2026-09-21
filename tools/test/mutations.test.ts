// Sub-condições de cada regra, cada uma numa cópia temporária do caso válido com uma única
// mudança. O conjunto de códigos acusados tem de ser exatamente o esperado.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, rm, symlink, writeFile } from 'node:fs/promises';
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

for (const term of AGENCIA_TERMS) {
  test(`AGENCIA acusa o termo ${term}`, async () => {
    const c = await copyValidCase();
    await addToSkillBody(`Exemplo: ${term.toUpperCase()} aqui.`)(c);
    assert.deepEqual(await codesOf(c.root), ['AGENCIA']);
  });
}

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
