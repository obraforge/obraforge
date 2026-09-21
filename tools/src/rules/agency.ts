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
// de um termo de duas palavras ("git clone") casa com qualquer sequência de espaços ou TAB.
function termPattern(term: string, flags = 'iu'): RegExp {
  const before = WORD_CHAR.test(term.at(0) ?? '') ? '(?<![\\p{L}\\p{N}_])' : '';
  const after = WORD_CHAR.test(term.at(-1) ?? '') ? '(?![\\p{L}\\p{N}_])' : '';
  const body = term.split(' ').map(escapeRegExp).join('\\s+');
  return new RegExp(`${before}${body}${after}`, flags);
}

// O lookahead confere que a opção tem um "c" e as letras são consumidas uma vez só: a forma
// -[a-z]*c[a-z]* com borda de palavra no fim era quadrática numa opção longa.
const SHELL_WITH_COMMAND = new RegExp(
  `(?<![\\p{L}\\p{N}_])(?:${AGENCIA_SHELLS.join('|')})\\s+-(?=[a-z]*c)[a-z]+(?![\\p{L}\\p{N}_])`,
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

// `file`: caminho relativo à raiz; `text`: conteúdo de um arquivo de texto da skill.
export function scanAgency(file: string, text: string): Finding[] {
  const findings: Finding[] = [];
  scanLines(text).forEach((line, index) => {
    const terms = PATTERNS.filter(({ pattern }) => pattern.test(line)).map(({ label }) => label);
    if (terms.length > 0) {
      findings.push({ code: 'AGENCIA', file, line: index + 1, message: `referência proibida: ${terms.join(', ')}` });
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
