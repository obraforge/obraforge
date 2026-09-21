// Regra AGENCIA: skill não referencia hook, setting, permissão do agente nem comando de rede, e
// não usa a sintaxe de execução de shell do agente.
import { AGENCIA_SHELLS, AGENCIA_TERMS, AGENCIA_TERMS_EXCEPT_UPPERCASE } from '../constants.js';
import type { Finding } from '../findings.js';
import type { FrontmatterData } from '../frontmatter.js';
import { decodeHtmlEntities, normalizeLine, removeHtmlComments, skeleton, splitLines } from '../text.js';

const WORD_CHAR = /[\p{L}\p{N}_]/u;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

// Borda de palavra Unicode só do lado em que o termo começa ou termina em letra ou dígito:
// "hook" não casa com "webhook", e "fetch(" casa seja o que vier depois do parêntese. O espaço
// de um termo de duas palavras ("git clone") casa com qualquer sequência de espaços ou TAB, e
// também com nenhuma: "git" + U+200B + "clone" vira "gitclone" depois da normalização.
function termSource(term: string): string {
  const before = WORD_CHAR.test(term.at(0) ?? '') ? '(?<![\\p{L}\\p{N}_])' : '';
  const after = WORD_CHAR.test(term.at(-1) ?? '') ? '(?![\\p{L}\\p{N}_])' : '';
  const body = term.split(' ').map(escapeRegExp).join('\\s*');
  return `${before}${body}${after}`;
}

const TERMS = [...AGENCIA_TERMS, ...AGENCIA_TERMS_EXCEPT_UPPERCASE];

// Todos os termos numa alternância só: ela casa se e só se algum termo casa. A linha sem termo
// nenhum (quase todas) é conferida numa passada, e cada termo só é testado sozinho, para montar o
// rótulo do achado, quando a alternância casa.
const ANY_TERM = new RegExp(TERMS.map(termSource).join('|'), 'iu');

// A sigla toda em maiúsculas ("SCP", "RCP"), como palavra inteira, vira "###" antes da varredura,
// e o termo em qualquer outra grafia continua casando. No esqueleto, todo confundível trocado vira
// minúscula, então só o "SCP" que já era ASCII maiúsculo no texto original ganha a isenção: "SϹP"
// (U+03F9) vira "ScP" no esqueleto e é acusado.
const UPPERCASE_ACRONYM = new RegExp(
  `(?<![\\p{L}\\p{N}_])(?:${AGENCIA_TERMS_EXCEPT_UPPERCASE.map((term) => escapeRegExp(term.toUpperCase())).join('|')})(?![\\p{L}\\p{N}_])`,
  'gu',
);

function maskUppercaseAcronyms(line: string): string {
  return line.replace(UPPERCASE_ACRONYM, (acronym) => '#'.repeat(acronym.length));
}

// Shell seguido, na mesma linha lógica (a continuação com barra invertida junta linhas; ver
// continuationGroups), de uma opção com "c" (-c, -lc, -ec...) que começa a até
// SHELL_OPTION_WINDOW caracteres do fim do nome, mesmo depois de outras opções e argumentos
// ("bash -o pipefail -c x"). A opção começa depois de espaço, para "pré-cadastro" não contar, e
// pode vir entre aspas ("-c", '-c') ou na forma $'-c' do bash. Os nomes de shell e as opções são
// achados cada um numa passada só, e o par é conferido depois: com a janela de 200 caracteres,
// reler a opção a partir de cada nome de shell da janela custaria dezenas de passadas por linha.
// As letras da opção são capturadas de uma vez (lookahead com retrorreferência, sem retrocesso),
// então uma opção gigante que falha a borda de palavra no fim é lida uma vez só.
const SHELL_OPTION_WINDOW = 200;
const SHELL_NAME = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${AGENCIA_SHELLS.join('|')})(?![\\p{L}\\p{N}_])`, 'giu');
const SHELL_OPTION = /\s(?:\$?["'])?-(?=([a-z]+))\1(?![\p{L}\p{N}_])/giu;

function hasShellWithCommand(line: string): boolean {
  const shellEnds = [...line.matchAll(SHELL_NAME)].map((match) => match.index + match[0].length);
  let nearest = -1;
  for (const option of line.matchAll(SHELL_OPTION)) {
    if (!(option[1] ?? '').toLowerCase().includes('c')) {
      continue;
    }
    // O espaço antes da opção está em option.index; vale o fim de nome de shell mais próximo antes dele.
    while (nearest + 1 < shellEnds.length && (shellEnds[nearest + 1] ?? Infinity) <= option.index) {
      nearest++;
    }
    const shellEnd = shellEnds[nearest];
    if (shellEnd !== undefined && option.index - shellEnd < SHELL_OPTION_WINDOW) {
      return true;
    }
  }
  return false;
}

interface Check {
  label: string;
  test: (line: string) => boolean;
}

const regexCheck = (label: string, pattern: RegExp): Check => ({ label, test: (line) => pattern.test(line) });

// Os TERMS.length primeiros são os termos, na ordem da lista; a ordem é a dos rótulos no achado.
const PATTERNS: Check[] = [
  ...TERMS.map((term) => regexCheck(`"${term}"`, new RegExp(termSource(term), 'iu'))),
  { label: 'shell com -c (execução de comando)', test: hasShellWithCommand },
  // Sintaxe de execução de shell do Claude Code: o comando roda antes de o modelo ler a skill.
  // O Claude Code só reconhece !` no início da linha ou depois de espaço; aqui vale em qualquer
  // posição. O bloco cercado vale com qualquer recuo e com espaço antes do !.
  regexCheck('"!`" (execução de shell)', /!`/u),
  regexCheck('bloco cercado com "!" (execução de shell)', /(?:`{3,}|~{3,})[ \t]*!/u),
];

// Homóglifo: palavra (sequência de letras, marcas e dígitos) com letra latina e letra cirílica ao
// mesmo tempo. O esqueleto já acusa o homóglifo que forma um termo da lista ("сurl" com U+0441);
// esta regra fica porque acusa também a palavra misturada que não forma termo nenhum (um domínio,
// um comando que a lista ainda não tem), sem uso legítimo em texto de obra. O grego fica de fora:
// σ, φ, Δ e γ aparecem colados a letra latina em fórmula de engenharia ("γc", "Δt"). A linha sem
// cirílico sai com uma passada; na que tem, cada palavra é achada uma vez e cada alfabeto é
// procurado nela uma vez, então o custo é linear.
const WORD = /[\p{L}\p{M}\p{N}]+/gu;
const LATIN = /\p{Script=Latin}/u;
const CYRILLIC = /\p{Script=Cyrillic}/u;
const HOMOGLYPH_MESSAGE = 'palavra mistura alfabetos latino e cirílico (possível homóglifo)';

function mixesLatinAndCyrillic(line: string): boolean {
  if (!CYRILLIC.test(line)) {
    return false;
  }
  for (const [word] of line.matchAll(WORD)) {
    if (LATIN.test(word) && CYRILLIC.test(word)) {
      return true;
    }
  }
  return false;
}

// Continuação de linha: a linha que termina em "\" é juntada com a seguinte, sem a barra (como o
// shell faz: "bash \" e "-c id" em linhas seguidas são "bash -c id"). A cadeia inteira vira uma
// linha lógica, com o número da primeira linha física. Os grupos são decididos na forma
// normalizada e valem igual para o esqueleto. Cada linha física entra em um só grupo, então o custo
// é linear.
function continuationGroups(lines: readonly string[]): Array<[number, number]> {
  const groups: Array<[number, number]> = [];
  let first = 0;
  lines.forEach((text, index) => {
    if (!text.endsWith('\\') || index + 1 === lines.length) {
      groups.push([first, index]);
      first = index + 1;
    }
  });
  return groups;
}

function joinGroup(lines: readonly string[], [first, last]: [number, number]): string {
  const parts: string[] = [];
  for (let index = first; index <= last; index++) {
    const text = lines[index] ?? '';
    parts.push(index < last && text.endsWith('\\') ? text.slice(0, -1) : text);
  }
  return parts.join('');
}

// Variantes do texto antes da normalização, linha a linha: como está, com as entidades HTML
// decodificadas ("c&#117;rl", "cu&#8203;rl"), sem os comentários HTML contidos na linha
// ("cu<!-- -->rl"), e com as duas coisas. O texto como está continua varrido: o comentário, que
// some na visualização do markdown, pode esconder um termo ("<!-- rode curl -->"). Variante igual a
// uma anterior não é varrida de novo, então o arquivo sem "&" e sem "<!--" é varrido uma vez.
function textVariants(raws: readonly string[]): Array<readonly string[]> {
  const decoded = raws.map(decodeHtmlEntities);
  const candidates = [raws, decoded, raws.map(removeHtmlComments), decoded.map(removeHtmlComments)];
  const variants: Array<readonly string[]> = [];
  for (const candidate of candidates) {
    if (!variants.some((variant) => variant.every((line, index) => line === candidate[index]))) {
      variants.push(candidate);
    }
  }
  return variants;
}

// `file`: caminho relativo à raiz; `text`: conteúdo de um arquivo de texto da skill. Cada variante
// (textVariants) é varrida na forma normalizada (normalizeLine), então a palavra partida por
// caractere invisível também é conferida inteira, e de novo no esqueleto (text.ts), que troca cada
// homóglifo da tabela do Unicode pela letra ASCII que ele imita: "ϲurl" (U+03F2) casa com "curl".
// As duas formas passam pela junção das linhas continuadas com barra invertida. Os achados de todas
// as variantes são reunidos por linha: um achado de termos e um de mistura de alfabetos, no máximo.
export function scanAgency(file: string, text: string): Finding[] {
  const hits = new Map<number, { checks: Set<number>; homoglyph: boolean }>();
  for (const raws of textVariants(splitLines(text))) {
    const normalized = raws.map(normalizeLine);
    const skeletons = raws.map((raw) => normalizeLine(skeleton(raw)));
    for (const group of continuationGroups(normalized)) {
      const line = group[0] + 1;
      const joined = joinGroup(normalized, group);
      const masked = maskUppercaseAcronyms(joined);
      const skeletonLine = maskUppercaseAcronyms(joinGroup(skeletons, group));
      const hit = hits.get(line) ?? { checks: new Set<number>(), homoglyph: false };
      for (const scanned of skeletonLine === masked ? [masked] : [masked, skeletonLine]) {
        const hasTerm = ANY_TERM.test(scanned);
        PATTERNS.forEach((check, index) => {
          if (!hit.checks.has(index) && (hasTerm || index >= TERMS.length) && check.test(scanned)) {
            hit.checks.add(index);
          }
        });
      }
      hit.homoglyph ||= mixesLatinAndCyrillic(joined);
      if (hit.checks.size > 0 || hit.homoglyph) {
        hits.set(line, hit);
      }
    }
  }
  const findings: Finding[] = [];
  for (const [line, { checks, homoglyph }] of [...hits].sort(([a], [b]) => a - b)) {
    if (checks.size > 0) {
      const labels = [...checks].sort((a, b) => a - b).map((index) => PATTERNS[index]?.label);
      findings.push({ code: 'AGENCIA', file, line, message: `referência proibida: ${labels.join(', ')}` });
    }
    if (homoglyph) {
      findings.push({ code: 'AGENCIA', file, line, message: HOMOGLYPH_MESSAGE });
    }
  }
  return findings;
}

// Lista branca das chaves de topo do frontmatter: só as do padrão Agent Skills. As chaves próprias
// do Claude Code (hooks, shell, model, context, paths...) mudam o que o agente faz ou quando a
// skill carrega; allowed-tools, que dá permissão de ferramenta, fica de fora pela regra 4 do
// AGENTS.md. Qualquer outra chave também é recusada.
const FRONTMATTER_KEYS: readonly string[] = ['name', 'description', 'license', 'compatibility', 'metadata'];

// A conferência é feita no frontmatter já interpretado, porque uma chave entre aspas com escape
// YAML ("allowed\x2Dtools") não aparece como texto na varredura.
export function checkFrontmatterKeys(
  file: string,
  data: FrontmatterData,
  lineOfKey: (path: readonly string[]) => number | undefined,
): Finding[] {
  return Object.keys(data)
    .filter((key) => !FRONTMATTER_KEYS.includes(key))
    .map((key) => ({
      code: 'AGENCIA',
      file,
      line: lineOfKey([key]),
      message: `chave de frontmatter fora do padrão Agent Skills: ${key}`,
    }));
}
