// Regra NORMA: toda citação normativa do SKILL.md tem entrada em references/normas.md, e toda
// entrada tem Título, Ano (4 dígitos) e Fonte.
import type { Finding } from '../findings.js';

export interface Citation {
  // Chave canônica: família, órgão (resoluções) e número sem pontos nem zeros à esquerda.
  // O ano não entra, então "Lei nº 14.133/2021", "Lei 14.133/2021" e "Lei 14133" são a mesma.
  key: string;
  line: number;
}

const BEFORE = '(?<![\\p{L}\\p{N}_])';
const NUMERO_SIGN = '(?:[nN]\\s?\\.?\\s?[º°oO]\\.?\\s*)?';
const NUMBER = '(\\d+(?:\\.\\d+)*)';

// NR e NBR só em maiúsculas (evita "nr 12" como abreviação de número). Lei e Decreto sem
// diferenciar maiúsculas; a borda antes deles exclui o hífen, para "Decreto-Lei" não ser lido
// também como "Lei". Em Resolução, a palavra aceita qualquer caixa, mas o órgão é sigla em
// maiúsculas (CONAMA, CONFEA, CAU/BR), para "resolução de 2019" não virar citação.
const NR = new RegExp(`${BEFORE}NR\\s?[-–]?\\s?(\\d{1,2})(?!\\d)`, 'gu');
const NBR = new RegExp(`${BEFORE}NBR\\s?(?:(ISO\\/IEC|ISO|IEC)\\s?)?(\\d+(?:-\\d+)*)`, 'gu');
const LAW = new RegExp(
  `(?<![\\p{L}\\p{N}_-])(decreto-lei|decreto|lei\\s+complementar|lei)\\s+${NUMERO_SIGN}${NUMBER}`,
  'giu',
);
const RESOLUTION = new RegExp(
  `${BEFORE}[Rr][Ee][Ss][Oo][Ll][Uu][ÇçCc][ÃãAa][Oo]\\s+([A-Z][A-Z0-9]*(?:\\/[A-Z]+)?)\\s+${NUMERO_SIGN}${NUMBER}`,
  'gu',
);

const LAW_FAMILIES: Record<string, string> = {
  'decreto-lei': 'Decreto-Lei',
  decreto: 'Decreto',
  'lei complementar': 'Lei Complementar',
  lei: 'Lei',
};

function stripZeros(digits: string): string {
  return digits.replace(/^0+(?=\d)/, '');
}

function canonicalNumber(raw: string): string {
  return stripZeros(raw.replaceAll('.', ''));
}

export function extractCitations(lines: readonly string[]): Citation[] {
  const citations: Citation[] = [];
  lines.forEach((text, index) => {
    const line = index + 1;
    for (const match of text.matchAll(NR)) {
      citations.push({ key: `NR-${stripZeros(match[1] ?? '')}`, line });
    }
    for (const match of text.matchAll(NBR)) {
      const prefix = match[1] === undefined ? '' : `${match[1]} `;
      const number = (match[2] ?? '').split('-').map(stripZeros).join('-');
      citations.push({ key: `NBR ${prefix}${number}`, line });
    }
    for (const match of text.matchAll(LAW)) {
      const family = LAW_FAMILIES[(match[1] ?? '').toLowerCase().replace(/\s+/g, ' ')] ?? 'Lei';
      citations.push({ key: `${family} ${canonicalNumber(match[2] ?? '')}`, line });
    }
    for (const match of text.matchAll(RESOLUTION)) {
      citations.push({ key: `Resolução ${(match[1] ?? '').toUpperCase()} ${canonicalNumber(match[2] ?? '')}`, line });
    }
  });
  return citations;
}

interface NormEntry {
  line: number;
  keys: string[];
  fields: Map<string, { value: string; line: number }>;
}

const ENTRY_HEADING = /^##\s+(.*)$/;
const TOP_HEADING = /^#\s/;
const FIELD = /^\s*-\s+(Título|Ano|Fonte)\s*:(.*)$/;

export function parseNormsFile(lines: readonly string[]): NormEntry[] {
  const entries: NormEntry[] = [];
  let current: NormEntry | undefined;
  lines.forEach((text, index) => {
    const line = index + 1;
    const heading = ENTRY_HEADING.exec(text);
    if (heading !== null) {
      current = { line, keys: extractCitations([heading[1] ?? '']).map((c) => c.key), fields: new Map() };
      entries.push(current);
      return;
    }
    if (TOP_HEADING.test(text)) {
      current = undefined;
      return;
    }
    const field = current === undefined ? null : FIELD.exec(text);
    if (current !== undefined && field !== null) {
      const name = field[1] ?? '';
      if (!current.fields.has(name)) {
        current.fields.set(name, { value: (field[2] ?? '').trim(), line });
      }
    }
  });
  return entries;
}

export function checkNorms(skillDir: string, skillLines: readonly string[], normsLines: readonly string[]): Finding[] {
  const skillFile = `${skillDir}/SKILL.md`;
  const normsFile = `${skillDir}/references/normas.md`;
  const findings: Finding[] = [];
  const entries = parseNormsFile(normsLines);
  const known = new Set(entries.flatMap((entry) => entry.keys));

  const reported = new Set<string>();
  for (const citation of extractCitations(skillLines)) {
    if (!known.has(citation.key) && !reported.has(citation.key)) {
      reported.add(citation.key);
      findings.push({
        code: 'NORMA',
        file: skillFile,
        line: citation.line,
        message: `citação "${citation.key}" sem entrada em references/normas.md`,
      });
    }
  }

  for (const entry of entries) {
    for (const name of ['Título', 'Ano', 'Fonte']) {
      const field = entry.fields.get(name);
      if (field === undefined || field.value === '') {
        findings.push({ code: 'NORMA', file: normsFile, line: entry.line, message: `entrada sem "- ${name}:" preenchido` });
      } else if (name === 'Ano' && !/^\d{4}$/.test(field.value)) {
        findings.push({ code: 'NORMA', file: normsFile, line: field.line, message: '"- Ano:" deve ter 4 dígitos' });
      }
    }
  }
  return findings;
}
