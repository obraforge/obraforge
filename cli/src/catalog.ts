import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sanitize } from './sanitize.js';

// Compilado em dist/src/catalog.js: ../../ é a raiz do pacote, no repositório (depois do prepack) e
// no tarball instalado; lá ficam catalog.json e skills/. Mesmo padrão de dist/src/version.js.
const CATALOG_JSON = new URL('../../catalog.json', import.meta.url);
export const PACKAGE_ROOT = fileURLToPath(new URL('../../', import.meta.url));

export type SkillState = 'publicada' | 'depreciada';

export interface CatalogSkill {
  readonly name: string;
  readonly area: string;
  readonly phase: number;
  readonly version: string;
  readonly state: SkillState;
  readonly deprecationReason?: string;
  readonly description: string;
  readonly path: string;
  readonly sha256: string;
}

export interface Catalog {
  readonly version: string;
  readonly retired: readonly string[];
  readonly skills: readonly CatalogSkill[];
}

export class CatalogReadError extends Error {}

function describe(url: URL): string {
  return url.protocol === 'file:' ? url.pathname : url.toString();
}

const SHA256 = /^[0-9a-f]{64}$/;

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

  const top = isObject(parsed) ? parsed : undefined;
  const skills = top?.['skills'];
  if (!Array.isArray(skills)) {
    throw new CatalogReadError(`catálogo em formato inesperado, sem a lista "skills": ${describe(catalogJson)}`);
  }
  const retired = top?.['retired'];
  if (!Array.isArray(retired) || !retired.every((name) => typeof name === 'string')) {
    throw new CatalogReadError(`catálogo em formato inesperado, sem a lista "retired": ${describe(catalogJson)}`);
  }
  const version = top?.['version'];

  // Fail-closed: uma entrada incompleta ou com estado desconhecido invalida o catálogo inteiro,
  // em vez de a skill ser tratada como publicada.
  const checked = skills.map((skill, index) => {
    if (!isValidSkill(skill)) {
      throw new CatalogReadError(`catálogo em formato inesperado na skill ${index + 1}: ${describe(catalogJson)}`);
    }
    return skill;
  });
  return { version: typeof version === 'string' ? version : '', retired, skills: checked };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidSkill(value: unknown): value is CatalogSkill {
  if (!isObject(value)) {
    return false;
  }
  const strings = ['name', 'area', 'version', 'description', 'path', 'sha256'].every((key) => typeof value[key] === 'string');
  if (!strings || typeof value['phase'] !== 'number' || !SHA256.test(value['sha256'] as string)) {
    return false;
  }
  if (value['state'] === 'publicada') {
    return true;
  }
  return value['state'] === 'depreciada' && typeof value['deprecationReason'] === 'string';
}

function text(value: unknown): string {
  return sanitize(typeof value === 'string' ? value : String(value ?? ''));
}

export function formatSkillLine(skill: CatalogSkill): string {
  const state = skill.state === 'depreciada' ? ', depreciada' : '';
  return `${text(skill.name)} (${text(skill.area)}, fase ${text(skill.phase)}, v${text(skill.version)}${state}) — ${text(skill.description)}`;
}

export function formatSkillList(skills: readonly CatalogSkill[]): string {
  if (skills.length === 0) {
    return 'Nenhuma skill publicada nesta versão.';
  }
  return skills.map(formatSkillLine).join('\n');
}

// Sem acento e sem diferença de caixa: "Orçamento" acha "orcamento".
export function fold(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}
