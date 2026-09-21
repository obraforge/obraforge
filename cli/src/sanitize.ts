// Texto do catalog.json embutido (name, area, description de cada skill) vem de PR de terceiro
// e vai direto para o terminal do usuário. Quebra de linha/parágrafo, tab e os demais espaços de
// controle (LF, CR, TAB, VT, FF, NEL, LS, PS) viram um espaço - para frases de uma description
// multilinha não colarem sem separador - e espaços em sequência colapsam em um só, com trim no
// resultado. O resto do controle C0 e DEL, C1 e a formatação Unicode (inclusive sobrescrita
// bidirecional, como U+202E) continuam removidos. O ESC (0x1b) que inicia uma sequência ANSI está
// em C0, então removê-lo já neutraliza a sequência inteira (o resto vira texto literal inofensivo).
// Os pontos de código são montados em runtime (em vez de \uXXXX literal no fonte) porque LS/PS
// (U+2028/U+2029) são terminadores de linha para o próprio parser JS.
const LINE_BREAK_AND_CONTROL_CODEPOINTS = [0x0a, 0x0d, 0x09, 0x0b, 0x0c, 0x85, 0x2028, 0x2029];
const LINE_BREAK_AND_CONTROL_SPACE = new RegExp(
  `[${LINE_BREAK_AND_CONTROL_CODEPOINTS.map((codePoint) => String.fromCodePoint(codePoint)).join('')}]`,
  'g',
);

export function sanitize(text: string): string {
  return text
    .replace(LINE_BREAK_AND_CONTROL_SPACE, ' ')
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, '')
    .replace(/ {2,}/g, ' ')
    .trim();
}
