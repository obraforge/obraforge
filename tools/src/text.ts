import { CONFUSABLES } from './confusables.js';

export function splitLines(text: string): string[] {
  return text.split(/\r\n|\r|\n/);
}

// Caracteres que partiriam um termo proibido sem mudar o que o agente lê: formatação invisível
// (\p{Cf}: espaço de largura zero, hífen condicional, controles de direção), separador de linha e
// de parágrafo (U+2028, U+2029), controles C0 e C1 menos o TAB (NEL, VT, FF...), os
// default-ignorable (U+034F, seletores de variação, preenchimentos Hangul e afins), os de uso
// privado (\p{Co}, sem glifo padrão) e os não-caracteres (U+FDD0 a U+FDEF e os dois últimos de
// cada plano, U+FFFE, U+FFFF, U+1FFFE...).
const INVISIBLE = /[\p{Cf}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}\p{Co}\p{Noncharacter_Code_Point}]|(?!\t)\p{Cc}/gu;

// Forma de uma linha usada nas varreduras de AGENCIA e DADO-PESSOAL: NFKC (letra e dígito de
// largura total viram ASCII) e sem os caracteres de INVISIBLE, tirados depois do NFKC (que leva
// U+3164 e U+FFA0 a U+1160).
export function normalizeLine(line: string): string {
  return line.normalize('NFKC').replace(INVISIBLE, '');
}

// Só \r e \n quebram linha, então o número da linha se mantém.
export function scanLines(text: string): string[] {
  return splitLines(text).map(normalizeLine);
}

const NON_ASCII = /[^\x00-\x7F]/gu;

function replaceConfusables(text: string): string {
  return text.replace(NON_ASCII, (char) => CONFUSABLES.get(char.codePointAt(0) ?? 0) ?? char);
}

// Esqueleto (UTS #39) restrito ao que a tabela de confundíveis leva a uma letra ou dígito ASCII:
// cada caractere fora do ASCII que está em CONFUSABLES vira o protótipo, sempre em minúscula ("ϲ"
// U+03F2 vira "c", "ѕ" U+0455 vira "s"); o ASCII fica como está, inclusive a caixa. A troca vem
// antes e depois do NFKC: antes, porque o NFKC apaga o confundível de alguns caracteres ("ϲ" vira
// "ς", U+03C2); depois, porque ele cria o de outros (U+1FBE vira "ι", U+03B9). Um caractere da
// tabela entra e um sai, então a borda de palavra se mantém; o custo é linear.
export function skeleton(text: string): string {
  return replaceConfusables(replaceConfusables(text).normalize('NFKC'));
}

// Entidade HTML numérica, decimal ou hexadecimal (o ";" é opcional, como no HTML), ou nomeada entre
// as comuns. Cada quantificador é seguido de algo opcional ou fixo, sem retrocesso quadrático.
const HTML_ENTITY = /&(?:#(\d+);?|#[xX]([0-9a-fA-F]+);?|(nbsp|amp|lt|gt|quot);)/g;
const NAMED_ENTITIES: Readonly<Record<string, string>> = { nbsp: '\u00A0', amp: '&', lt: '<', gt: '>', quot: '"' };

// Decodifica as entidades HTML de uma linha numa passada só ("&amp;#117;" vira "&#117;", não "u").
// Entidade fora do Unicode ou de meio de par substituto fica como está.
export function decodeHtmlEntities(line: string): string {
  if (!line.includes('&')) {
    return line;
  }
  return line.replace(HTML_ENTITY, (entity: string, decimal?: string, hex?: string, name?: string) => {
    if (name !== undefined) {
      return NAMED_ENTITIES[name] ?? entity;
    }
    const codePoint = decimal !== undefined ? Number.parseInt(decimal, 10) : Number.parseInt(hex ?? '', 16);
    const valid = codePoint <= 0x10ffff && !(codePoint >= 0xd800 && codePoint <= 0xdfff);
    return valid ? String.fromCodePoint(codePoint) : entity;
  });
}

// Tira os comentários HTML contidos na linha: de "<!--" até o primeiro "-->" depois dele ("<!-->"
// e "<!--->" também fecham, como no HTML). Comentário que atravessa linhas não é tirado. A busca é
// feita com indexOf, sem regex: um "<!--" sem fechamento encerra a busca, em vez de ela recomeçar
// de cada abertura seguinte, então o custo é linear.
export function removeHtmlComments(line: string): string {
  let result = '';
  let position = 0;
  for (;;) {
    const open = line.indexOf('<!--', position);
    const close = open === -1 ? -1 : line.indexOf('-->', open + 2);
    if (close === -1) {
      break;
    }
    result += line.slice(position, open);
    position = close + 3;
  }
  return position === 0 ? line : result + line.slice(position);
}
