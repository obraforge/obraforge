import { readFileSync } from 'node:fs';
import { sanitize } from './sanitize.js';

// Compilado em dist/src/catalog.js: ../../catalog.json é a raiz do pacote, no repositório (depois
// do prepack) e no tarball instalado. Mesmo padrão de dist/src/version.js.
const CATALOG_JSON = new URL('../../catalog.json', import.meta.url);

export interface CatalogSkill {
  readonly name: string;
  readonly area: string;
  readonly description: string;
}

export interface Catalog {
  readonly skills: readonly CatalogSkill[];
}

export class CatalogReadError extends Error {}

function describe(url: URL): string {
  return url.protocol === 'file:' ? url.pathname : url.toString();
}

export function readCatalog(catalogJson: URL = CATALOG_JSON): Catalog {
  let raw: string;
  try {
    raw = readFileSync(catalogJson, 'utf8');
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error);
    throw new CatalogReadError(`catálogo não encontrado ou sem permissão de leitura: ${describe(catalogJson)} (${cause})`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new CatalogReadError(`catálogo com JSON inválido: ${describe(catalogJson)}`);
  }

  const skills = typeof parsed === 'object' && parsed !== null ? (parsed as { skills?: unknown }).skills : undefined;
  if (!Array.isArray(skills)) {
    throw new CatalogReadError(`catálogo em formato inesperado, sem a lista "skills": ${describe(catalogJson)}`);
  }

  return { skills: skills as CatalogSkill[] };
}

function text(value: unknown): string {
  return sanitize(typeof value === 'string' ? value : String(value ?? ''));
}

export function formatSkillLine(skill: CatalogSkill): string {
  return `${text(skill.name)} (${text(skill.area)}) — ${text(skill.description)}`;
}

export function formatSkillList(catalog: Catalog): string {
  if (catalog.skills.length === 0) {
    return 'Nenhuma skill publicada nesta versão.';
  }
  return catalog.skills.map(formatSkillLine).join('\n');
}
