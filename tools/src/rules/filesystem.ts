// Regras sobre a árvore de arquivos: ESTRUTURA (arquivos obrigatórios), SCRIPTS e LINK.
import { CODE_EXTENSIONS, PROJECT_PHASE } from '../constants.js';
import type { Finding } from '../findings.js';
import { extensionOf, type Entry } from '../tree.js';

// LINK vale para a árvore inteira da raiz: um link ou executável fora de uma pasta de skill
// também não é seguido nem aceito.
export function checkLinks(entries: readonly Entry[]): Finding[] {
  const findings: Finding[] = [];
  for (const entry of entries) {
    if (entry.kind === 'symlink') {
      findings.push({ code: 'LINK', file: entry.path, message: 'link simbólico (não é seguido nem aceito)' });
    } else if (entry.kind === 'other') {
      findings.push({ code: 'LINK', file: entry.path, message: 'entrada que não é arquivo regular nem pasta' });
    } else if (entry.kind === 'file' && entry.executable) {
      findings.push({ code: 'LINK', file: entry.path, message: 'arquivo com permissão de execução' });
    }
  }
  return findings;
}

// Caractere invisível, de controle, de formatação ou bidirecional no nome esconde o que o arquivo
// é: "y.sh" seguido de U+200B não tem a extensão .sh que a regra SCRIPTS procura. Espaço que não é
// o ASCII (\p{Zs} menos U+0020: U+00A0, U+202F, U+3000...) parece espaço comum e entra no mesmo
// grupo.
const INVISIBLE_IN_NAME = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}]|(?! )\p{Zs}/u;

// `entries`: conteúdo da pasta da skill, com caminho relativo a ela.
export function checkStructure(skillDir: string, entries: ReadonlyMap<string, Entry>): Finding[] {
  const isFile = (path: string): boolean => entries.get(path)?.kind === 'file';
  const missing: string[] = [];
  if (!isFile('SKILL.md')) {
    missing.push('SKILL.md');
  }
  const hasEntrada = [...entries.values()].some(
    (entry) => entry.kind === 'file' && /^fixtures\/entrada\.[^/]+$/.test(entry.path),
  );
  if (!hasEntrada) {
    missing.push('fixtures/entrada.*');
  }
  if (!isFile('fixtures/esperado.md')) {
    missing.push('fixtures/esperado.md');
  }
  if (!isFile('references/normas.md')) {
    missing.push('references/normas.md');
  }
  const findings: Finding[] = missing.map((path) => ({ code: 'ESTRUTURA', file: skillDir, message: `falta ${path}` }));
  // Arquivo ou pasta oculto (nome começando com ".") some da listagem comum e da revisão do PR, e o
  // nome com caractere invisível engana quem revisa. Cada nome é conferido na própria entrada, então
  // a pasta é acusada uma vez; o que está dentro dela continua sendo varrido.
  for (const entry of entries.values()) {
    const name = entry.path.split('/').at(-1) ?? '';
    if (name.startsWith('.')) {
      findings.push({ code: 'ESTRUTURA', file: `${skillDir}/${entry.path}`, message: 'arquivo oculto dentro da skill' });
    }
    if (INVISIBLE_IN_NAME.test(name)) {
      findings.push({ code: 'ESTRUTURA', file: `${skillDir}/${entry.path}`, message: 'nome de arquivo com caractere invisível' });
    }
  }
  return findings;
}

// Antes da fase 3 não entra código na skill: nem a pasta scripts/ nem arquivo com extensão de
// código em qualquer outra pasta.
export function checkScripts(skillDir: string, entries: ReadonlyMap<string, Entry>): Finding[] {
  if (PROJECT_PHASE >= 3) {
    return [];
  }
  const findings: Finding[] = [];
  if (entries.has('scripts')) {
    findings.push({
      code: 'SCRIPTS',
      file: `${skillDir}/scripts`,
      message: `scripts/ não é permitido antes da fase 3 (fase atual do projeto: ${PROJECT_PHASE})`,
    });
  }
  for (const entry of entries.values()) {
    const extension = extensionOf(entry.path);
    if (entry.kind === 'file' && CODE_EXTENSIONS.includes(extension)) {
      findings.push({
        code: 'SCRIPTS',
        file: `${skillDir}/${entry.path}`,
        message: `arquivo de código (${extension}) não é permitido antes da fase 3 (fase atual do projeto: ${PROJECT_PHASE})`,
      });
    }
  }
  return findings;
}
