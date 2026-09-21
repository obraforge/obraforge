import {
  isMap,
  isScalar,
  LineCounter,
  parseDocument,
  type Document,
  type DocumentOptions,
  type ParseOptions,
  type SchemaOptions,
} from 'yaml';

export type FrontmatterData = Record<string, unknown>;

export type Frontmatter =
  | {
      ok: true;
      data: FrontmatterData;
      body: string[];
      // Linha (no arquivo) da chave indicada, ex.: ['metadata', 'obraforge-area'].
      lineOfKey: (path: readonly string[]) => number | undefined;
    }
  | { ok: false; message: string; line?: number; body: string[] };

const DELIMITER = /^---[ \t]*$/;

// Opções do parser: schema core do YAML 1.2, sem tags customizadas nem as tags conhecidas do
// YAML 1.1 (!!binary, !!set, !!timestamp...), sem merge key e com chave duplicada como erro.
// Tag não resolvida vira aviso do parser, e aviso aqui também recusa o frontmatter.
const PARSE_OPTIONS: ParseOptions & DocumentOptions & SchemaOptions = {
  version: '1.2',
  schema: 'core',
  customTags: [],
  resolveKnownTags: false,
  merge: false,
  uniqueKeys: true,
  strict: true,
};

// Frontmatter de skill não precisa de alias; recusar todos elimina a expansão de alias.
const MAX_ALIAS_COUNT = 0;

export function parseFrontmatter(lines: readonly string[]): Frontmatter {
  if (lines.length === 0 || !DELIMITER.test(lines[0] ?? '')) {
    return { ok: false, message: 'SKILL.md não começa com frontmatter (a primeira linha deve ser ---)', line: 1, body: [...lines] };
  }
  const closing = lines.findIndex((line, index) => index > 0 && DELIMITER.test(line));
  if (closing === -1) {
    return { ok: false, message: 'frontmatter sem a linha --- de fechamento', line: 1, body: [...lines] };
  }
  const body = lines.slice(closing + 1);
  // O YAML começa na linha 2 do arquivo.
  const toFileLine = (yamlLine: number): number => yamlLine + 1;

  const lineCounter = new LineCounter();
  const doc = parseDocument(lines.slice(1, closing).join('\n'), { ...PARSE_OPTIONS, lineCounter });
  const problem = doc.errors[0] ?? doc.warnings[0];
  if (problem !== undefined) {
    return {
      ok: false,
      message: `frontmatter com YAML inválido (${problem.code})`,
      line: toFileLine(lineCounter.linePos(problem.pos[0]).line),
      body,
    };
  }
  if (!isMap(doc.contents)) {
    return { ok: false, message: 'o frontmatter deve ser um mapa YAML (chave: valor)', line: 1, body };
  }
  let data: unknown;
  try {
    data = doc.toJS({ maxAliasCount: MAX_ALIAS_COUNT });
  } catch {
    return { ok: false, message: 'frontmatter com alias YAML, que não é aceito', line: 1, body };
  }
  if (!isPlainObject(data)) {
    return { ok: false, message: 'o frontmatter deve ser um mapa YAML (chave: valor)', line: 1, body };
  }
  return {
    ok: true,
    data,
    body,
    lineOfKey: (path) => {
      const offset = keyOffset(doc, path);
      return offset === undefined ? undefined : toFileLine(lineCounter.linePos(offset).line);
    },
  };
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function ownValue(data: Record<string, unknown>, key: string): unknown {
  return Object.hasOwn(data, key) ? data[key] : undefined;
}

function keyOffset(doc: Document, path: readonly string[]): number | undefined {
  let node: unknown = doc.contents;
  let offset: number | undefined;
  for (const segment of path) {
    if (!isMap(node)) {
      return undefined;
    }
    const pair = node.items.find((item) => isScalar(item.key) && String(item.key.value) === segment);
    if (pair === undefined || !isScalar(pair.key) || pair.key.range === undefined || pair.key.range === null) {
      return undefined;
    }
    offset = pair.key.range[0];
    node = pair.value;
  }
  return offset;
}
