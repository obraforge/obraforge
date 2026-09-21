export function splitLines(text: string): string[] {
  return text.split(/\r\n|\r|\n/);
}

// Forma usada nas varreduras de AGENCIA e DADO-PESSOAL: NFKC (letra e dígito de largura total
// viram ASCII) e sem caracteres de formatação invisíveis (\p{Cf}: espaço de largura zero, hífen
// condicional, controles de direção), que poderiam partir um termo proibido sem mudar o que o
// agente lê. Não mexe em quebra de linha, então o número da linha se mantém.
export function scanLines(text: string): string[] {
  return splitLines(text).map((line) => line.normalize('NFKC').replace(/\p{Cf}/gu, ''));
}
