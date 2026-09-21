// Regra AGENCIA: skill não referencia hook, setting, permissão do agente nem comando de rede.
import { AGENCIA_TERMS } from '../constants.js';
import type { Finding } from '../findings.js';
import type { FrontmatterData } from '../frontmatter.js';
import { scanLines } from '../text.js';

const WORD_CHAR = /[\p{L}\p{N}_]/u;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

// Borda de palavra Unicode só do lado em que o termo começa ou termina em letra ou dígito:
// "hook" não casa com "webhook", e "fetch(" casa seja o que vier depois do parêntese.
function termPattern(term: string): RegExp {
  const before = WORD_CHAR.test(term.at(0) ?? '') ? '(?<![\\p{L}\\p{N}_])' : '';
  const after = WORD_CHAR.test(term.at(-1) ?? '') ? '(?![\\p{L}\\p{N}_])' : '';
  return new RegExp(`${before}${escapeRegExp(term)}${after}`, 'iu');
}

const PATTERNS = AGENCIA_TERMS.map((term) => ({ term, pattern: termPattern(term) }));

// `file`: caminho relativo à raiz; `text`: conteúdo de um arquivo de texto da skill.
export function scanAgency(file: string, text: string): Finding[] {
  const findings: Finding[] = [];
  scanLines(text).forEach((line, index) => {
    const terms = PATTERNS.filter(({ pattern }) => pattern.test(line)).map(({ term }) => `"${term}"`);
    if (terms.length > 0) {
      findings.push({ code: 'AGENCIA', file, line: index + 1, message: `referência proibida: ${terms.join(', ')}` });
    }
  });
  return findings;
}

// A chave allowed-tools também é procurada no frontmatter já interpretado, porque uma chave
// entre aspas com escape YAML ("allowed\x2Dtools") não aparece como texto na varredura.
export function checkAllowedToolsKey(
  file: string,
  data: FrontmatterData,
  keyLine: number | undefined,
  textFindings: readonly Finding[],
): Finding[] {
  if (!Object.hasOwn(data, 'allowed-tools')) {
    return [];
  }
  if (textFindings.some((finding) => finding.file === file && finding.line === keyLine)) {
    return [];
  }
  return [{ code: 'AGENCIA', file, line: keyLine, message: 'frontmatter com a chave allowed-tools' }];
}
