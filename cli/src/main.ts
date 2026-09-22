import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';
import { addCommand, type AddResult } from './add-command.js';
import { CatalogReadError, PACKAGE_ROOT, readCatalog, type Catalog } from './catalog.js';
import { EXIT_ENVIRONMENT_ERROR, EXIT_SUCCESS, EXIT_USAGE_ERROR } from './exit-codes.js';
import { interactive, prompterFor, type Io } from './interactive.js';
import { listCommand, searchCommand, type CommandResult } from './list-command.js';
import { isTool, TOOLS } from './targets.js';
import { readVersion } from './version.js';

export const USAGE = `Uso: obraforge [comando] [opções]

Sem comando, num terminal, abre o modo interativo (área, skill e ferramenta).

Comandos:
  list [--area <área>] [--fase <n>]   Lista as skills do catálogo desta versão.
  search <termo>                      Procura em nome, descrição e área.
  add <skill...> [--for <ferramenta>] Confere o hash e instala a skill na pasta do agente.
      --for     ${TOOLS.join(', ')} (sem --for, detecta pela pasta atual)
      --yes     Confirma sem perguntar: skill depreciada e substituição com --force.
      --force   Substitui uma cópia local diferente da do catálogo.

Opções:
  --version  Mostra a versão instalada.
  --help     Mostra esta ajuda.

Para usar a versão mais recente: npx obraforge@latest`;

// Dependências do ambiente, trocáveis no teste. Sem io, não há terminal interativo.
export interface RunEnv {
  readonly cwd: string;
  readonly catalogJson?: URL;
  readonly packageRoot: string;
  readonly io?: Io;
}

// Ponto único de despacho de argumentos, testável sem passar pelo processo real (sem tocar em
// process.argv/process.exit). bin.ts liga isto ao processo.
export async function run(argv: readonly string[], env?: RunEnv): Promise<number> {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv as string[],
      options: {
        version: { type: 'boolean' },
        help: { type: 'boolean' },
        for: { type: 'string' },
        yes: { type: 'boolean' },
        force: { type: 'boolean' },
        area: { type: 'string' },
        fase: { type: 'string' },
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

  const [command, ...rest] = positionals;
  const usage = (message: string): number => {
    console.error(message);
    console.error(USAGE);
    return EXIT_USAGE_ERROR;
  };
  const onlyOptions = (allowed: readonly string[]): string | undefined =>
    Object.keys(values).find((key) => !allowed.includes(key) && values[key as keyof typeof values] !== undefined);

  if (command === undefined) {
    const extra = onlyOptions([]);
    if (extra !== undefined) {
      return usage(`Opção --${extra} precisa de um comando.`);
    }
    return withIo(env, async (io, runEnv) => {
      if (io === undefined) {
        console.error('Sem terminal interativo: diga o comando. Exemplo: obraforge add <skill> --for claude');
        console.error(USAGE);
        return EXIT_USAGE_ERROR;
      }
      return withCatalogOrExit(runEnv, async (catalog) => print(await interactive(io, catalog, runEnv.cwd, runEnv.packageRoot)));
    });
  }

  if (command === 'list') {
    const extra = onlyOptions(['area', 'fase']);
    if (rest.length > 0 || extra !== undefined) {
      return usage(`Argumento inesperado para "list": ${rest.length > 0 ? rest.join(' ') : `--${extra}`}`);
    }
    let phase: number | undefined;
    if (values.fase !== undefined) {
      if (!/^[1-9]\d*$/.test(values.fase)) {
        return usage(`--fase deve ser um número inteiro, como 1: "${values.fase}"`);
      }
      phase = Number(values.fase);
    }
    return printCommand(listCommand(env?.catalogJson, { ...(values.area === undefined ? {} : { area: values.area }), ...(phase === undefined ? {} : { phase }) }));
  }

  if (command === 'search') {
    const extra = onlyOptions([]);
    if (rest.length === 0 || extra !== undefined) {
      return usage(extra !== undefined ? `Opção --${extra} não se aplica a "search".` : '"search" precisa de um termo. Exemplo: obraforge search edital');
    }
    return printCommand(searchCommand(rest.join(' '), env?.catalogJson));
  }

  if (command === 'add') {
    const extra = onlyOptions(['for', 'yes', 'force']);
    if (rest.length === 0 || extra !== undefined) {
      return usage(extra !== undefined ? `Opção --${extra} não se aplica a "add".` : '"add" precisa do nome de pelo menos uma skill.');
    }
    const tool = values.for;
    if (tool !== undefined && !isTool(tool)) {
      return usage(`--for aceita: ${TOOLS.join(', ')}. Recebido: "${tool}".`);
    }
    return withIo(env, (io, runEnv) =>
      withCatalogOrExit(runEnv, async (catalog) =>
        print(
          await addCommand({
            names: rest,
            ...(tool === undefined ? {} : { tool }),
            yes: values.yes === true,
            force: values.force === true,
            cwd: runEnv.cwd,
            catalog,
            packageRoot: runEnv.packageRoot,
            ...(io === undefined ? {} : { prompter: prompterFor(io) }),
          }),
        ),
      ),
    );
  }

  return usage(`Comando desconhecido: ${command}`);
}

function printCommand(result: CommandResult): number {
  if (result.stdout !== undefined) {
    console.log(result.stdout);
  }
  if (result.stderr !== undefined) {
    console.error(result.stderr);
  }
  return result.code;
}

function print(result: AddResult): number {
  for (const line of result.stdout) {
    console.log(line);
  }
  for (const line of result.stderr) {
    console.error(line);
  }
  return result.code;
}

async function withCatalogOrExit(env: RunEnv, use: (catalog: Catalog) => Promise<number>): Promise<number> {
  let catalog: Catalog;
  try {
    catalog = readCatalog(env.catalogJson);
  } catch (error) {
    if (error instanceof CatalogReadError) {
      console.error(`Erro de ambiente: ${error.message}`);
      return EXIT_ENVIRONMENT_ERROR;
    }
    throw error;
  }
  return use(catalog);
}

// No processo real, o terminal interativo existe só quando entrada e saída são TTY; o readline é
// aberto aqui e fechado ao fim do comando. No teste, o env traz (ou não) um io simulado.
async function withIo(env: RunEnv | undefined, use: (io: Io | undefined, env: RunEnv) => Promise<number>): Promise<number> {
  if (env !== undefined) {
    return cancellable(() => use(env.io, env));
  }
  const runEnv: RunEnv = { cwd: process.cwd(), packageRoot: PACKAGE_ROOT };
  if (process.stdin.isTTY !== true || process.stdout.isTTY !== true) {
    return use(undefined, runEnv);
  }
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await cancellable(() => use({ question: (text) => readline.question(text), write: (text) => console.log(text) }, runEnv));
  } finally {
    readline.close();
  }
}

// Ctrl+D numa pergunta: o readline rejeita com AbortError. Toda pergunta vem antes de qualquer
// gravação, então cancelar ali nunca deixa nada pela metade.
async function cancellable(use: () => Promise<number>): Promise<number> {
  try {
    return await use();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Cancelado. Nada foi instalado.');
      return EXIT_USAGE_ERROR;
    }
    throw error;
  }
}
