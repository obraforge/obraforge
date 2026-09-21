export function splitLines(text: string): string[] {
  return text.split(/\r\n|\r|\n/);
}

// Caracteres que partiriam um termo proibido sem mudar o que o agente lê: formatação invisível
// (\p{Cf}: espaço de largura zero, hífen condicional, controles de direção), separador de linha e
// de parágrafo (U+2028, U+2029), controles C0 e C1 menos o TAB (NEL, VT, FF...) e os
// default-ignorable (U+034F, seletores de variação, preenchimentos Hangul e afins).
const INVISIBLE = /[\p{Cf}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}]|(?!\t)\p{Cc}/gu;

// Forma usada nas varreduras de AGENCIA e DADO-PESSOAL: NFKC (letra e dígito de largura total
// viram ASCII) e sem os caracteres de INVISIBLE, tirados depois do NFKC (que leva U+3164 e U+FFA0
// a U+1160). Só \r e \n quebram linha, então o número da linha se mantém.
export function scanLines(text: string): string[] {
  return splitLines(text).map((line) => line.normalize('NFKC').replace(INVISIBLE, ''));
}
