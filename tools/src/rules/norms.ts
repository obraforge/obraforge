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
// Sinal de número opcional: "nº", "n°", "n.º", "n.o", "n." ou "no", em qualquer combinação de
// ponto e espaço entre as partes. O caractere ordinal em si (º/°/o/O) também é opcional, para
// aceitar "n." sozinho (ex.: "Lei n. 8.666/93").
const NUMERO_SIGN = '(?:[nN]\\.?\\s?(?:[º°oO]\\.?)?\\s*)?';
const NUMBER = '(\\d+(?:\\.\\d+)*)';
// Qualificador opcional entre a família e o número ("Lei Federal nº...", "Decreto Estadual nº...").
const QUALIFIER = '(?:\\s+(?:federal|estadual|municipal))?';
// Item de uma lista de leis: número + ano opcional ("8.666/1993"), sem consumir o ano como se
// fosse outro número da lista.
const LAW_LIST_ITEM = `${NUMBER}(?:\\/\\d{2,4})?`;
// Órgão/sigla de resolução: ao menos 3 caracteres (letras e dígitos), com barra opcional
// ("CAU/BR"). O piso de 3 caracteres é o que separa uma sigla real de uma preposição comum
// ("de", "do", "da") ficando logo depois de "Resolução" ou de "do/da", para "resolução de 2019
// do conselho" não virar citação.
const ORG = '([A-Za-z][A-Za-z0-9]{2,}(?:\\/[A-Za-z]+)?)';
const RESOLUTION_KEYWORD = '[Rr][Ee][Ss][Oo][Ll][Uu][ÇçCc][ÃãAa][Oo]';
// Sinal de número de Resolução: "nº", "n.º", "n°", "no." ou "n.". Com órgão em caixa mista ou
// minúscula ele é obrigatório: sem ele, a palavra seguinte a "resolução" ("resolução nominal 1920
// px") ou a que vem depois de "do/da" ("resolução 2 da equipe") era lida como órgão. "no" sem
// ponto não vale: é a preposição.
const RESOLUTION_NUMERO_SIGN = '[nN](?:\\.?\\s?[º°]|[oO]\\.|\\.)\\s*';
// Sigla só com maiúsculas (2 ou mais letras, com barra interna, como "CAU/BR"): dispensa o sinal de
// número ("Resolução CONAMA 307/2002", "Resolução 273/2000 do CONAMA").
const UPPERCASE_ORG = '([A-Z]{2,}(?:\\/[A-Z]+)?)';

// NR e NBR só em maiúsculas (evita "nr 12" como abreviação de número). Lei e Decreto sem
// diferenciar maiúsculas; a borda antes deles exclui o hífen, para "Decreto-Lei" não ser lido
// também como "Lei". Em Resolução, a palavra aceita qualquer caixa, e o órgão vem antes
// ("Resolução CONAMA nº...") ou depois ("Resolução nº... do CONAMA") do número: com o sinal de
// número, o órgão aceita qualquer caixa (CONAMA, Conama, CAU/BR); sem o sinal, só a sigla toda em
// maiúsculas vale.
const NR = new RegExp(`${BEFORE}NR\\s?[-–]?\\s?(\\d{1,2})(?!\\d)`, 'gu');
// "ABNT " é prefixo opcional; NBR aceita espaço ou hífen antes do número ("NBR-6118", "NBR 6118",
// "NBR9050").
const NBR = new RegExp(`${BEFORE}(?:ABNT\\s+)?NBR[\\s-]?(?:(ISO\\/IEC|ISO|IEC)[\\s-]?)?(\\d+(?:-\\d+)*)`, 'gu');
const LAW = new RegExp(
  `(?<![\\p{L}\\p{N}_-])(decreto-lei|decreto|lei\\s+complementar|lei)${QUALIFIER}\\s+${NUMERO_SIGN}${NUMBER}`,
  'giu',
);
// "Leis 8.666/1993 e 14.133/2021" ou "Leis 8.666/1993, 10.520/2002 e 14.133/2021": uma citação
// por número da lista, todas com a família "Lei".
const LAW_LIST = new RegExp(`${BEFORE}[Ll]eis\\s+${LAW_LIST_ITEM}(?:\\s*,\\s*${LAW_LIST_ITEM})*\\s+e\\s+${LAW_LIST_ITEM}`, 'gu');
const LAW_LIST_ITEM_PATTERN = new RegExp(LAW_LIST_ITEM, 'gu');
// Grupos: 1 = sigla em maiúsculas (sinal opcional), 2 = órgão em qualquer caixa (sinal
// obrigatório), 3 = número.
const RESOLUTION_ORG_FIRST = new RegExp(
  `${BEFORE}${RESOLUTION_KEYWORD}\\s+(?:${UPPERCASE_ORG}\\s+(?:${RESOLUTION_NUMERO_SIGN})?|${ORG}\\s+${RESOLUTION_NUMERO_SIGN})${NUMBER}`,
  'gu',
);
// Grupos: 1 = número e 2 = órgão em qualquer caixa (com sinal); 3 = número e 4 = sigla em
// maiúsculas (sem sinal), que termina em borda de palavra ("do CONAMAx" não vale).
const RESOLUTION_NUMBER_FIRST = new RegExp(
  `${BEFORE}${RESOLUTION_KEYWORD}\\s+(?:${RESOLUTION_NUMERO_SIGN}${NUMBER}(?:\\/\\d+)?\\s+(?:do|da)\\s+${ORG}|` +
    `${NUMBER}(?:\\/\\d+)?\\s+(?:do|da)\\s+${UPPERCASE_ORG}(?![\\p{L}\\p{N}_]))`,
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
    for (const match of text.matchAll(LAW_LIST)) {
      for (const item of match[0].matchAll(LAW_LIST_ITEM_PATTERN)) {
        citations.push({ key: `Lei ${canonicalNumber(item[1] ?? '')}`, line });
      }
    }
    for (const match of text.matchAll(RESOLUTION_ORG_FIRST)) {
      const org = match[1] ?? match[2] ?? '';
      citations.push({ key: `Resolução ${org.toUpperCase()} ${canonicalNumber(match[3] ?? '')}`, line });
    }
    for (const match of text.matchAll(RESOLUTION_NUMBER_FIRST)) {
      const org = match[2] ?? match[4] ?? '';
      citations.push({ key: `Resolução ${org.toUpperCase()} ${canonicalNumber(match[1] ?? match[3] ?? '')}`, line });
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
// Marcador de lista "-", "*" ou "+"; nome do campo em negrito com o ":" dentro ("**Título:**") ou
// fora ("**Título**:"), ou sem negrito ("Título:"). O nome em si só precisa ser letras: a caixa e
// o acento são normalizados depois por `canonicalFieldName`.
const FIELD = /^\s*[-*+]\s+(?:\*\*([\p{L}]+)\*\*\s*:|\*\*([\p{L}]+):\*\*|([\p{L}]+)\s*:)(.*)$/u;

// Normaliza o nome do campo (caixa e acento) para uma das três chaves aceitas, ou undefined se
// não for um dos três campos conhecidos. "Titulo" sem acento é aceito, assim como qualquer caixa.
function canonicalFieldName(raw: string): 'Título' | 'Ano' | 'Fonte' | undefined {
  const key = raw
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
  if (key === 'titulo') return 'Título';
  if (key === 'ano') return 'Ano';
  if (key === 'fonte') return 'Fonte';
  return undefined;
}

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
      const name = canonicalFieldName(field[1] ?? field[2] ?? field[3] ?? '');
      if (name !== undefined && !current.fields.has(name)) {
        current.fields.set(name, { value: (field[4] ?? '').trim(), line });
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
