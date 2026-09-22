// Hash da pasta de uma skill, com o mesmo algoritmo do gerador do catálogo (tools/src/catalog.ts):
// todos os arquivos, sem arquivo ou pasta oculta, ordenados pelos bytes UTF-8 do caminho relativo
// POSIX em NFC; cada linha é "caminho\0sha256hex\n" dos bytes crus do arquivo; o hash da skill é o
// sha256 hex da concatenação das linhas. O teste skill-hash.test.ts confere este código contra o
// sha256 que o gerador gravou no catalog.json, skill por skill.
import { createHash } from 'node:crypto';
import { closeSync, constants, fstatSync, lstatSync, openSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// A pasta tem link simbólico ou arquivo especial: não é hasheada nem copiada.
export class SkillTreeError extends Error {}

export interface SkillFile {
  // Caminho relativo à pasta da skill, POSIX, em NFC: é o que entra no hash e o nome gravado na cópia.
  readonly path: string;
  // O mesmo caminho como o sistema de arquivos devolveu (pode estar em NFD), para ler o arquivo.
  readonly diskPath: string;
}

// Percorre sem seguir link simbólico. Nome oculto (começando com ".") fica de fora, como no
// gerador: o validador já recusa esse tipo de entrada, e o SO cria alguns sozinho (.DS_Store).
export function listSkillFiles(dir: string): SkillFile[] {
  const files: SkillFile[] = [];
  const pending: string[] = [''];
  for (let rel = pending.pop(); rel !== undefined; rel = pending.pop()) {
    for (const name of readdirSync(join(dir, rel))) {
      if (name.startsWith('.')) {
        continue;
      }
      const diskPath = rel === '' ? name : `${rel}/${name}`;
      const stats = lstatSync(join(dir, diskPath));
      if (stats.isDirectory()) {
        pending.push(diskPath);
      } else if (stats.isFile()) {
        files.push({ path: diskPath.normalize('NFC'), diskPath });
      } else {
        throw new SkillTreeError(`link simbólico ou arquivo especial dentro da skill: ${diskPath}`);
      }
    }
  }
  return files.sort((a, b) => Buffer.compare(Buffer.from(a.path, 'utf8'), Buffer.from(b.path, 'utf8')));
}

// Lê um arquivo regular sem seguir link simbólico (O_NOFOLLOW e fstat depois de abrir).
export function readRegularFile(path: string): Buffer {
  const fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    if (!fstatSync(fd).isFile()) {
      throw new SkillTreeError(`não é arquivo regular: ${path}`);
    }
    return readFileSync(fd);
  } finally {
    closeSync(fd);
  }
}

export function hashSkillFiles(dir: string, files: readonly SkillFile[]): string {
  const lines = files.map((file) => {
    const fileHash = createHash('sha256').update(readRegularFile(join(dir, file.diskPath))).digest('hex');
    return Buffer.from(`${file.path}\0${fileHash}\n`, 'utf8');
  });
  return createHash('sha256').update(Buffer.concat(lines)).digest('hex');
}

export function hashSkillDir(dir: string): { sha256: string; files: SkillFile[] } {
  const files = listSkillFiles(dir);
  return { sha256: hashSkillFiles(dir, files), files };
}
