// Texto do catalog.json embutido (name, area, description de cada skill) vem de PR de terceiro
// e vai direto para o terminal do usuário. Remove caracteres de controle C0 e DEL, C1, os de
// formatação Unicode (inclusive sobrescrita bidirecional, como U+202E) e separador de linha ou
// parágrafo. O ESC (0x1b) que inicia uma sequência ANSI está em C0, então removê-lo já neutraliza
// a sequência inteira (o resto vira texto literal inofensivo).
export function sanitize(text: string): string {
  return text.replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, '');
}
