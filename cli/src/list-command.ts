import { CatalogReadError, formatSkillList, readCatalog } from './catalog.js';
import { EXIT_ENVIRONMENT_ERROR, EXIT_SUCCESS } from './exit-codes.js';

export interface CommandResult {
  readonly code: number;
  readonly stdout?: string;
  readonly stderr?: string;
}

// Separado de main.ts para ser testável com um catálogo de exemplo em diretório temporário, sem
// passar pelo parseArgs.
export function listCommand(catalogJson?: URL): CommandResult {
  try {
    const catalog = readCatalog(catalogJson);
    return { code: EXIT_SUCCESS, stdout: formatSkillList(catalog) };
  } catch (error) {
    if (error instanceof CatalogReadError) {
      return { code: EXIT_ENVIRONMENT_ERROR, stderr: `Erro de ambiente: ${error.message}` };
    }
    throw error;
  }
}
