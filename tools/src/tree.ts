import { constants } from 'node:fs';
import { lstat, open, readdir } from 'node:fs/promises';
import { join } from 'node:path';

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

const BINARY_PROBE_BYTES = 8192;

// Lê um arquivo regular como texto UTF-8. Devolve null quando o arquivo é binário (byte NUL nos
// primeiros 8 KB). O_NOFOLLOW e o fstat garantem que o que foi aberto é o arquivo, não um link.
export async function readText(path: string): Promise<string | null> {
  const handle = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const stats = await handle.stat();
    if (!stats.isFile()) {
      throw new Error(`não é arquivo regular: ${path}`);
    }
    const bytes = await handle.readFile();
    if (bytes.subarray(0, BINARY_PROBE_BYTES).includes(0)) {
      return null;
    }
    return bytes.toString('utf8');
  } finally {
    await handle.close();
  }
}
