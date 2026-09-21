import { constants } from 'node:fs';
import { lstat, open, readdir, type FileHandle } from 'node:fs/promises';
import { join } from 'node:path';
import { skeleton } from './text.js';

export type EntryKind = 'file' | 'dir' | 'symlink' | 'other';

export interface Entry {
  // Caminho relativo à raiz percorrida, em formato POSIX.
  path: string;
  kind: EntryKind;
  executable: boolean;
}

// Percorre a árvore sem nunca seguir link simbólico: o tipo vem do lstat, e só pasta de verdade
// é aberta. Os caminhos são montados com os nomes devolvidos pelo readdir, então nunca saem da raiz.
export async function walkTree(root: string): Promise<Entry[]> {
  const entries: Entry[] = [];
  const pending: string[] = [''];
  for (let dir = pending.pop(); dir !== undefined; dir = pending.pop()) {
    const names = await readdir(join(root, dir));
    for (const name of names) {
      const path = dir === '' ? name : `${dir}/${name}`;
      const stats = await lstat(join(root, path));
      if (stats.isSymbolicLink()) {
        entries.push({ path, kind: 'symlink', executable: false });
      } else if (stats.isDirectory()) {
        entries.push({ path, kind: 'dir', executable: false });
        pending.push(path);
      } else if (stats.isFile()) {
        entries.push({ path, kind: 'file', executable: (stats.mode & 0o111) !== 0 });
      } else {
        entries.push({ path, kind: 'other', executable: false });
      }
    }
  }
  return entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

// Extensão em minúsculas do último segmento do caminho, com o ponto (".sh"); "" quando não há.
// É calculada sobre o esqueleto do nome (text.ts, que inclui o NFKC), para o homóglifo não
// esconder a extensão: "rodar.ѕh" (U+0455) e "rodar.ｓｈ" têm a extensão ".sh". Ponto e espaço no
// fim do nome saem antes, porque o Windows os descarta ("rodar.sh." vira "rodar.sh").
export function extensionOf(path: string): string {
  const name = skeleton(path.split('/').at(-1) ?? '').replace(/[. ]+$/, '');
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot).toLowerCase();
}

const BINARY_PROBE_BYTES = 8192;

// Abre um arquivo regular e passa o handle e o tamanho a `use`. O_NOFOLLOW e o fstat garantem que
// o que foi aberto é o arquivo, não um link simbólico apontando para outro lugar.
async function withRegularFile<T>(path: string, use: (handle: FileHandle, size: number) => Promise<T>): Promise<T> {
  const handle = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const stats = await handle.stat();
    if (!stats.isFile()) {
      throw new Error(`não é arquivo regular: ${path}`);
    }
    return await use(handle, stats.size);
  } finally {
    await handle.close();
  }
}

// Lê os bytes crus de um arquivo regular.
export async function readBytes(path: string): Promise<Buffer> {
  return withRegularFile(path, (handle) => handle.readFile());
}

export type SkillFileContent =
  | { kind: 'text'; text: string }
  // Extensão da lista de binários, dentro do teto: fica fora da varredura, sem ser lido.
  | { kind: 'binary' }
  // Fora da lista de binários, com byte NUL, BOM UTF-16 ou UTF-8 inválido.
  | { kind: 'not-utf8' }
  // Passa de `maxBytes`.
  | { kind: 'too-large' };

const UTF8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

// Lê um arquivo de uma skill. Arquivo da lista de binários (`binary`) não é lido: só o tamanho é
// conferido contra `maxBytes`. Qualquer outro arquivo, com qualquer extensão ou sem extensão, tem
// de ser UTF-8 válido, sem byte NUL em nenhuma posição e sem BOM UTF-16; senão é 'not-utf8', e não
// binário, para não sair da varredura calado. O tamanho vem do fstat, então o arquivo acima do teto
// não chega a ser lido.
export async function readSkillFile(
  path: string,
  { binary, maxBytes }: { binary: boolean; maxBytes: number },
): Promise<SkillFileContent> {
  const bytes = await withRegularFile(path, async (handle, size) => {
    if (size > maxBytes) {
      return 'too-large' as const;
    }
    return binary ? ('binary' as const) : handle.readFile();
  });
  if (bytes === 'too-large' || bytes === 'binary') {
    return { kind: bytes };
  }
  // O arquivo pode ter crescido entre o fstat e a leitura.
  if (bytes.length > maxBytes) {
    return { kind: 'too-large' };
  }
  const utf16Bom = bytes.length >= 2 && ((bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff));
  if (utf16Bom || bytes.includes(0)) {
    return { kind: 'not-utf8' };
  }
  try {
    return { kind: 'text', text: withoutBom(UTF8.decode(bytes)) };
  } catch {
    return { kind: 'not-utf8' };
  }
}

// O BOM UTF-8 no início sai antes de ler o frontmatter e de varrer: um SKILL.md com BOM vale o
// mesmo que sem. Só o primeiro sai; um segundo BOM continua no texto.
function withoutBom(text: string): string {
  return text.startsWith('\uFEFF') ? text.slice(1) : text;
}

// Lê um arquivo regular como texto UTF-8. Devolve null quando o arquivo é binário (byte NUL nos
// primeiros 8 KB).
export async function readText(path: string): Promise<string | null> {
  const bytes = await readBytes(path);
  if (bytes.subarray(0, BINARY_PROBE_BYTES).includes(0)) {
    return null;
  }
  return bytes.toString('utf8');
}
