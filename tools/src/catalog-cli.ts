// Uso: node catalog-cli.js [--verificar] [raiz-das-skills] [saida] [pacote-cli]
// Padrões: raiz-das-skills=skills, saida=catalog.json, pacote-cli=cli/package.json.
// Sem --verificar: gera e escreve o catálogo em `saida`.
// Com --verificar: regenera em memória e compara byte a byte com `saida`, sem escrever nada.
// Código de saída: 0 sucesso; 1 catálogo desatualizado/ausente (--verificar) ou skill que não
// pôde ser catalogada; 2 uso errado ou erro inesperado.
import { readFile, writeFile } from 'node:fs/promises';
import { buildCatalog, CatalogBuildError, diffLines, formatCatalogJson } from './catalog.js';
import { sanitize } from './report.js';

interface Args {
  verificar: boolean;
  raiz: string;
  saida: string;
  pacoteCli: string;
}

function parseArgs(argv: readonly string[]): Args | undefined {
  const verificar = argv.includes('--verificar');
  const positional = argv.filter((arg) => arg !== '--verificar');
  if (positional.length > 3) {
    return undefined;
  }
  const [raiz = 'skills', saida = 'catalog.json', pacoteCli = 'cli/package.json'] = positional;
  return { verificar, raiz, saida, pacoteCli };
}

function isEnoent(error: unknown): boolean {
  return error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT';
}

async function readExisting(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (isEnoent(error)) {
      return null;
    }
    throw error;
  }
}

async function main(argv: readonly string[]): Promise<number> {
  const args = parseArgs(argv);
  if (args === undefined) {
    console.error('Uso: catalog-cli [--verificar] [raiz-das-skills] [saida] [pacote-cli]');
    return 2;
  }

  let catalog;
  try {
    catalog = await buildCatalog(args.raiz, args.pacoteCli);
  } catch (error) {
    if (error instanceof CatalogBuildError) {
      console.error(`Gerador do catálogo: ${sanitize(error.message)}`);
      return 1;
    }
    throw error;
  }
  const json = formatCatalogJson(catalog);

  if (args.verificar) {
    const existing = await readExisting(args.saida);
    if (existing === json) {
      console.log(`Catálogo: ${args.saida} está atualizado (${catalog.skills.length} skill(s)).`);
      return 0;
    }
    if (existing === null) {
      console.error(`Catálogo: ${args.saida} não existe. Rode \`npm run catalogo\` para gerá-lo.`);
    } else {
      console.error(`Catálogo: ${args.saida} desatualizado. Rode \`npm run catalogo\` para regenerá-lo.`);
    }
    for (const line of diffLines(existing, json)) {
      console.error(sanitize(line));
    }
    return 1;
  }

  await writeFile(args.saida, json);
  console.log(`Catálogo: ${args.saida} gerado com ${catalog.skills.length} skill(s).`);
  return 0;
}

main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    // Fail-closed: qualquer erro inesperado termina com código diferente de zero.
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Erro inesperado no gerador do catálogo: ${sanitize(message)}`);
    process.exitCode = 2;
  },
);
