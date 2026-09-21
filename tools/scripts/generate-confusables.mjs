// Gera tools/src/confusables.ts a partir do confusables.txt do Unicode Technical Standard #39
// (Unicode Security Mechanisms). Rode da raiz do repositório:
//
//   node tools/scripts/generate-confusables.mjs
//
// Reproduzível: baixa a versão fixada abaixo (não a "latest"), confere a linha "# Version:" e o
// SHA-256 do arquivo, e falha se qualquer um deles divergir. Para trocar de versão, atualize
// VERSION e SHA256 num PR, rode o script e commite a tabela gerada. A tabela gerada não baixa nada
// em tempo de execução.
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const VERSION = '18.0.0';
const SOURCE_URL = `https://www.unicode.org/Public/${VERSION}/security/confusables.txt`;
const SHA256 = '6ed3ee967c9dfdf6677d563c9985182fbc50a2efb7d6059cd57b2e2ce18f5b92';
const OUTPUT = fileURLToPath(new URL('../src/confusables.ts', import.meta.url));

// Unicode License v3, como publicada em https://www.unicode.org/license.txt. Ela vale para os Data
// Files do Unicode (https://www.unicode.org/terms_of_use.html) e pede que este aviso acompanhe toda
// cópia: vai inteiro no cabeçalho do arquivo gerado.
const LICENSE = `UNICODE LICENSE V3

COPYRIGHT AND PERMISSION NOTICE

Copyright © 1991-2026 Unicode, Inc.

NOTICE TO USER: Carefully read the following legal agreement. BY
DOWNLOADING, INSTALLING, COPYING OR OTHERWISE USING DATA FILES, AND/OR
SOFTWARE, YOU UNEQUIVOCALLY ACCEPT, AND AGREE TO BE BOUND BY, ALL OF THE
TERMS AND CONDITIONS OF THIS AGREEMENT. IF YOU DO NOT AGREE, DO NOT
DOWNLOAD, INSTALL, COPY, DISTRIBUTE OR USE THE DATA FILES OR SOFTWARE.

Permission is hereby granted, free of charge, to any person obtaining a
copy of data files and any associated documentation (the "Data Files") or
software and any associated documentation (the "Software") to deal in the
Data Files or Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, and/or sell
copies of the Data Files or Software, and to permit persons to whom the
Data Files or Software are furnished to do so, provided that either (a)
this copyright and permission notice appear with all copies of the Data
Files or Software, or (b) this copyright and permission notice appear in
associated Documentation.

THE DATA FILES AND SOFTWARE ARE PROVIDED "AS IS", WITHOUT WARRANTY OF ANY
KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT OF
THIRD PARTY RIGHTS.

IN NO EVENT SHALL THE COPYRIGHT HOLDER OR HOLDERS INCLUDED IN THIS NOTICE
BE LIABLE FOR ANY CLAIM, OR ANY SPECIAL INDIRECT OR CONSEQUENTIAL DAMAGES,
OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS,
WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION,
ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THE DATA
FILES OR SOFTWARE.

Except as contained in this notice, the name of a copyright holder shall
not be used in advertising or otherwise to promote the sale, use or other
dealings in these Data Files or Software without prior written
authorization of the copyright holder.`;

const response = await fetch(SOURCE_URL);
if (!response.ok) {
  throw new Error(`falha ao baixar ${SOURCE_URL}: HTTP ${response.status}`);
}
const bytes = Buffer.from(await response.arrayBuffer());
const sha256 = createHash('sha256').update(bytes).digest('hex');
if (sha256 !== SHA256) {
  throw new Error(`SHA-256 de ${SOURCE_URL} diverge: esperado ${SHA256}, obtido ${sha256}`);
}
const source = bytes.toString('utf8');
const version = /^# Version: (\S+)$/m.exec(source)?.[1];
if (version !== VERSION) {
  throw new Error(`versão de confusables.txt diverge: esperado ${VERSION}, obtido ${version ?? '(sem linha "# Version:")'}`);
}
const date = /^# Date: (.+)$/m.exec(source)?.[1] ?? '(sem data)';

// Cada linha de dado é "origem ; alvo ; MA # comentário": a origem é um code point e o alvo, o
// protótipo, uma sequência de code points. Fica só a entrada com origem fora do ASCII cujo
// protótipo, depois de NFKC e caixa baixa, é um único caractere ASCII [a-z0-9]. A origem ASCII
// ("1", "0", "I" e "|", que parecem "l" e "o") fica de fora: o texto ASCII já é varrido como é, e
// trocá-la estragaria extensão de arquivo legítima (".ps1" viraria ".psl").
const byPrototype = new Map();
let total = 0;
let kept = 0;
for (const rawLine of source.split('\n')) {
  const data = rawLine.replace(/#.*/, '').trim();
  if (data === '') {
    continue;
  }
  total++;
  const [origin = '', target = ''] = data.split(';').map((field) => field.trim());
  const originCodePoints = origin.split(/\s+/).map((hex) => Number.parseInt(hex, 16));
  if (originCodePoints.length !== 1) {
    throw new Error(`origem com mais de um code point: ${rawLine}`);
  }
  const [codePoint] = originCodePoints;
  const prototype = String.fromCodePoint(...target.split(/\s+/).map((hex) => Number.parseInt(hex, 16)))
    .normalize('NFKC')
    .toLowerCase();
  if (codePoint < 0x80 || !/^[a-z0-9]$/.test(prototype)) {
    continue;
  }
  kept++;
  byPrototype.set(prototype, [...(byPrototype.get(prototype) ?? []), codePoint]);
}

const hex = (codePoint) => `0x${codePoint.toString(16).toUpperCase().padStart(4, '0')}`;
const entries = [...byPrototype.keys()].sort().map((prototype) => {
  const codePoints = byPrototype.get(prototype).sort((a, b) => a - b).map(hex);
  const lines = [];
  let current = `  '${prototype}': [`;
  for (const [index, item] of codePoints.entries()) {
    const piece = `${item}${index === codePoints.length - 1 ? '],' : ','}`;
    if (current.length + 1 + piece.length > 100) {
      lines.push(current);
      current = `    ${piece}`;
    } else {
      current += current.endsWith('[') ? piece : ` ${piece}`;
    }
  }
  lines.push(current);
  return lines.join('\n');
});

const output = `// Gerado por tools/scripts/generate-confusables.mjs. Não edite à mão: para regenerar, rode
// \`node tools/scripts/generate-confusables.mjs\` na raiz do repositório.
//
// Fonte: confusables.txt do Unicode Technical Standard #39 (Unicode Security Mechanisms),
// versão ${VERSION}, de ${date}.
// ${SOURCE_URL}
// SHA-256 do arquivo de origem: ${sha256}
// © 2026 Unicode®, Inc. Unicode and the Unicode Logo are registered trademarks of Unicode, Inc.
// in the U.S. and other countries.
//
// Filtro: das ${total} entradas do arquivo, ficam as ${kept} cuja origem está fora do ASCII e cujo
// protótipo, depois de NFKC e caixa baixa, é um único caractere ASCII [a-z0-9].
//
// Licença do dado de origem (reproduzida como ela exige):
//
${LICENSE.split('\n').map((line) => (line === '' ? '//' : `// ${line}`)).join('\n')}

export const CONFUSABLES_VERSION = '${VERSION}';

// Protótipo ASCII → code points que o Unicode dá como confundíveis com ele.
const PROTOTYPES: Readonly<Record<string, readonly number[]>> = {
${entries.join('\n')}
};

// Code point → protótipo ASCII (uma letra minúscula ou um dígito).
export const CONFUSABLES: ReadonlyMap<number, string> = new Map(
  Object.entries(PROTOTYPES).flatMap(([prototype, codePoints]) =>
    codePoints.map((codePoint) => [codePoint, prototype] as const),
  ),
);
`;

await writeFile(OUTPUT, output);
console.log(`confusables.ts gerado: versão ${VERSION}, ${kept} de ${total} entradas, ${Buffer.byteLength(output)} bytes`);
