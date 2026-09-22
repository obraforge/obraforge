import { CatalogReadError, fold, formatSkillLine, formatSkillList, readCatalog, type Catalog } from './catalog.js';
import { EXIT_ENVIRONMENT_ERROR, EXIT_SUCCESS } from './exit-codes.js';
import { sanitize } from './sanitize.js';

export interface CommandResult {
  readonly code: number;
  readonly stdout?: string;
  readonly stderr?: string;
}

export interface ListFilters {
  readonly area?: string;
  readonly phase?: number;
}

// Separado de main.ts para ser testável com um catálogo de exemplo em diretório temporário, sem
// passar pelo parseArgs.
export function listCommand(catalogJson?: URL, filters: ListFilters = {}): CommandResult {
  return withCatalog(catalogJson, (catalog) => {
    const skills = catalog.skills.filter(
      (skill) => (filters.area === undefined || skill.area === filters.area) && (filters.phase === undefined || skill.phase === filters.phase),
    );
    if (skills.length === 0 && catalog.skills.length > 0) {
      return { code: EXIT_SUCCESS, stdout: 'Nenhuma skill com esses filtros nesta versão.' };
    }
    return { code: EXIT_SUCCESS, stdout: formatSkillList(skills) };
  });
}

// Procura o termo em nome, descrição e área (Plataforma · CLI — Spec §4).
export function searchCommand(term: string, catalogJson?: URL): CommandResult {
  return withCatalog(catalogJson, (catalog) => {
    const needle = fold(term.trim());
    const found = catalog.skills.filter((skill) => [skill.name, skill.description, skill.area].some((field) => fold(field).includes(needle)));
    if (found.length === 0) {
      return { code: EXIT_SUCCESS, stdout: `Nenhuma skill encontrada para "${sanitize(term)}".` };
    }
    return { code: EXIT_SUCCESS, stdout: found.map(formatSkillLine).join('\n') };
  });
}

export function withCatalog(catalogJson: URL | undefined, use: (catalog: Catalog) => CommandResult): CommandResult {
  let catalog: Catalog;
  try {
    catalog = readCatalog(catalogJson);
  } catch (error) {
    if (error instanceof CatalogReadError) {
      return { code: EXIT_ENVIRONMENT_ERROR, stderr: `Erro de ambiente: ${error.message}` };
    }
    throw error;
  }
  return use(catalog);
}
