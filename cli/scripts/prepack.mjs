#!/usr/bin/env node
// Roda no hook `prepack` do npm (npm pack e npm publish), antes do tarball ser montado. O
// catalog.json, skills/, README.md e LICENSE vivem na raiz do monorepo, mas o pack do workspace
// `cli` só leva o que está dentro de `cli/`. Este script apaga e recopia esses quatro itens da
// raiz para dentro de `cli/`; as cópias ficam no .gitignore da raiz.
//
// JS puro, sem dependência (a CLI não pode ganhar dependência de build por causa de um script
// interno de empacotamento).
//
// Fail-closed: recusa (código != 0) se encontrar link simbólico ou arquivo especial dentro de
// skills/, para nunca empacotar algo de fora da árvore do repositório.
import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cliDir = dirname(dirname(fileURLToPath(import.meta.url)));
const rootDir = dirname(cliDir);

const ITEMS = ['catalog.json', 'skills', 'README.md', 'LICENSE'];

function assertOnlyRegularFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`link simbólico não pode ser empacotado: ${full}`);
    }
    if (entry.isDirectory()) {
      assertOnlyRegularFiles(full);
      continue;
    }
    if (!entry.isFile()) {
      throw new Error(`arquivo especial não pode ser empacotado: ${full}`);
    }
  }
}

function main() {
  const skillsRoot = join(rootDir, 'skills');
  if (existsSync(skillsRoot)) {
    assertOnlyRegularFiles(skillsRoot);
  }

  for (const item of ITEMS) {
    const src = join(rootDir, item);
    const dest = join(cliDir, item);
    if (!existsSync(src)) {
      throw new Error(`item ausente na raiz do repositório: ${src}`);
    }
    rmSync(dest, { recursive: true, force: true });
    cpSync(src, dest, { recursive: true, dereference: false });
  }

  // stderr, não stdout: `npm pack --json`/`npm publish --json` deixam o stdout só para a saída
  // máquina-legível, e ferramentas (inclusive o teste da lista branca) esperam JSON puro ali.
  console.error('prepack: catalog.json, skills/, README.md e LICENSE copiados de volta para cli/.');
}

try {
  main();
} catch (error) {
  console.error(`prepack falhou: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
