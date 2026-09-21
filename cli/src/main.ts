import { parseArgs } from 'node:util';
import { EXIT_SUCCESS, EXIT_USAGE_ERROR } from './exit-codes.js';
import { listCommand } from './list-command.js';
import { readVersion } from './version.js';

export const USAGE = `Uso: obraforge <comando> [opções]

Comandos:
  list       Lista as skills publicadas no catálogo desta versão.

Opções:
  --version  Mostra a versão instalada.
  --help     Mostra esta ajuda.`;

// Ponto único de despacho de argumentos, testável sem passar pelo processo real (sem tocar em
// process.argv/process.exit). bin.ts liga isto ao processo.
export function run(argv: readonly string[]): number {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv as string[],
      options: {
        version: { type: 'boolean' },
        help: { type: 'boolean' },
      },
      allowPositionals: true,
      strict: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Opção desconhecida: ${message}`);
    console.error(USAGE);
    return EXIT_USAGE_ERROR;
  }

  const { values, positionals } = parsed;

  if (values.help === true) {
    console.log(USAGE);
    return EXIT_SUCCESS;
  }
  if (values.version === true) {
    console.log(readVersion());
    return EXIT_SUCCESS;
  }
  if (positionals.length === 0) {
    console.log(USAGE);
    return EXIT_SUCCESS;
  }

  const [command, ...rest] = positionals;
  if (command !== 'list') {
    console.error(`Comando desconhecido: ${command}`);
    console.error(USAGE);
    return EXIT_USAGE_ERROR;
  }
  if (rest.length > 0) {
    console.error(`Argumento inesperado para "list": ${rest.join(' ')}`);
    console.error(USAGE);
    return EXIT_USAGE_ERROR;
  }

  const result = listCommand();
  if (result.stdout !== undefined) {
    console.log(result.stdout);
  }
  if (result.stderr !== undefined) {
    console.error(result.stderr);
  }
  return result.code;
}
