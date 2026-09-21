// Regra AGENCIA: skill não referencia hook, setting, permissão do agente nem comando de rede, e
// não usa a sintaxe de execução de shell do agente.
import { AGENCIA_CASE_SENSITIVE_TERMS, AGENCIA_SHELLS, AGENCIA_TERMS } from '../constants.js';
import type { Finding } from '../findings.js';
import type { FrontmatterData } from '../frontmatter.js';
import { scanLines } from '../text.js';

const WORD_CHAR = /[\p{L}\p{N}_]/u;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

// Borda de palavra Unicode só do lado em que o termo começa ou termina em letra ou dígito:
// "hook" não casa com "webhook", e "fetch(" casa seja o que vier depois do parêntese. O espaço
// de um termo de duas palavras ("git clone") casa com qualquer sequência de espaços ou TAB, e
// também com nenhuma: "git" + U+200B + "clone" vira "gitclone" depois da normalização.
function termPattern(term: string, flags = 'iu'): RegExp {
  const before = WORD_CHAR.test(term.at(0) ?? '') ? '(?<![\\p{L}\\p{N}_])' : '';
  const after = WORD_CHAR.test(term.at(-1) ?? '') ? '(?![\\p{L}\\p{N}_])' : '';
  const body = term.split(' ').map(escapeRegExp).join('\\s*');
  return new RegExp(`${before}${body}${after}`, flags);
}

// Shell seguido, na mesma linha, de uma opção com "c" (-c, -lc, -ec...) que começa a até
// SHELL_OPTION_WINDOW caracteres do fim do nome, mesmo depois de outras opções e argumentos
// ("bash -o pipefail -c x"). A opção começa depois de espaço, para "pré-cadastro" não contar. A
// janela limita quantos nomes de shell podem reler a mesma opção longa, o que mantém o custo
// linear. O lookahead confere que a opção tem um "c" e as letras são consumidas uma vez só: a
// forma -[a-z]*c[a-z]* com borda de palavra no fim era quadrática numa opção longa.
const SHELL_OPTION_WINDOW = 80;
const SHELL_WITH_COMMAND = new RegExp(
  `(?<![\\p{L}\\p{N}_])(?:${AGENCIA_SHELLS.join('|')})(?![\\p{L}\\p{N}_]).{0,${SHELL_OPTION_WINDOW - 1}}?\\s-(?=[a-z]*c)[a-z]+(?![\\p{L}\\p{N}_])`,
  'iu',
);

const PATTERNS = [
  ...AGENCIA_TERMS.map((term) => ({ label: `"${term}"`, pattern: termPattern(term) })),
  ...AGENCIA_CASE_SENSITIVE_TERMS.map((term) => ({ label: `"${term}"`, pattern: termPattern(term, 'u') })),
  { label: 'shell com -c (execução de comando)', pattern: SHELL_WITH_COMMAND },
  // Sintaxe de execução de shell do Claude Code: o comando roda antes de o modelo ler a skill.
  // O Claude Code só reconhece !` no início da linha ou depois de espaço; aqui vale em qualquer
  // posição. O bloco cercado vale com qualquer recuo e com espaço antes do !.
  { label: '"!`" (execução de shell)', pattern: /!`/u },
  { label: 'bloco cercado com "!" (execução de shell)', pattern: /(?:`{3,}|~{3,})[ \t]*!/u },
];

// Homóglifo: palavra (sequência de letras, marcas e dígitos) com letra latina e letra cirílica ao
// mesmo tempo. Um "c" cirílico (U+0441) no lugar do latino tira "curl" da lista acima sem mudar o
// que o agente lê. O grego fica de fora: σ, φ, Δ e γ aparecem colados a letra latina em fórmula de
// engenharia ("γc", "Δt"). A linha sem cirílico sai com uma passada; na que tem, cada palavra é
// achada uma vez e cada alfabeto é procurado nela uma vez, então o custo é linear.
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

// `file`: caminho relativo à raiz; `text`: conteúdo de um arquivo de texto da skill. A varredura
// é feita no texto normalizado (scanLines), então a palavra partida por caractere invisível
// também é conferida inteira.
export function scanAgency(file: string, text: string): Finding[] {
  const findings: Finding[] = [];
  scanLines(text).forEach((line, index) => {
    const terms = PATTERNS.filter(({ pattern }) => pattern.test(line)).map(({ label }) => label);
    if (terms.length > 0) {
      findings.push({ code: 'AGENCIA', file, line: index + 1, message: `referência proibida: ${terms.join(', ')}` });
    }
    if (mixesLatinAndCyrillic(line)) {
      findings.push({ code: 'AGENCIA', file, line: index + 1, message: HOMOGLYPH_MESSAGE });
    }
  });
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
