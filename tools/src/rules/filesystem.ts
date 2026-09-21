// Regras sobre a árvore de arquivos: ESTRUTURA (arquivos obrigatórios), SCRIPTS e LINK.
import { PROJECT_PHASE } from '../constants.js';
import type { Finding } from '../findings.js';
import type { Entry } from '../tree.js';

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
  return missing.map((path) => ({ code: 'ESTRUTURA', file: skillDir, message: `falta ${path}` }));
}

export function checkScripts(skillDir: string, entries: ReadonlyMap<string, Entry>): Finding[] {
  if (PROJECT_PHASE >= 3 || !entries.has('scripts')) {
    return [];
  }
  return [
    {
      code: 'SCRIPTS',
      file: `${skillDir}/scripts`,
      message: `scripts/ não é permitido antes da fase 3 (fase atual do projeto: ${PROJECT_PHASE})`,
    },
  ];
}
