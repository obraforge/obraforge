// skills/retiradas.txt: lista append-only dos nomes de skill retirada (um por linha; "#" abre
// comentário). O validador a usa para recusar nome reaproveitado; o gerador do catálogo a publica
// em "retired", para a CLI recusar a instalação (ADR-0007).
import { join } from 'node:path';
import { splitLines } from './text.js';
import { readText, type Entry } from './tree.js';

export const RETIRED_FILE = 'retiradas.txt';

export async function readRetired(root: string, entries: readonly Entry[]): Promise<Set<string>> {
  const entry = entries.find((item) => item.path === RETIRED_FILE);
  // Ausente é lista vazia; link simbólico já é acusado por LINK e não é lido.
  if (entry === undefined || entry.kind === 'symlink') {
    return new Set();
  }
  if (entry.kind !== 'file') {
    throw new Error(`${RETIRED_FILE} não é arquivo regular`);
  }
  const text = await readText(join(root, RETIRED_FILE));
  if (text === null) {
    throw new Error(`${RETIRED_FILE} não é arquivo de texto`);
  }
  const names = splitLines(text)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'));
  return new Set(names);
}
