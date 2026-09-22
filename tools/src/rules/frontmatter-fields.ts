// Regras sobre os campos do frontmatter: NOME, DESCRICAO e METADATA (que também cobre license e
// compatibility).
import { AREAS } from '../areas.js';
import type { Finding } from '../findings.js';
import { isPlainObject, ownValue, type FrontmatterData } from '../frontmatter.js';

interface Context {
  file: string;
  area: string;
  folder: string;
  lineOfKey: (path: readonly string[]) => number | undefined;
}

const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const NAME_MAX = 64;
const DESCRIPTION_MAX = 1024;
const COMPATIBILITY_MAX = 500;

// Regex oficial do SemVer 2.0.0 (semver.org, versão com grupos numerados para JavaScript).
const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
// Teto de tamanho antes da regex, para limitar o custo do retrocesso dela (o pacote semver do
// npm usa o mesmo teto).
const SEMVER_MAX = 256;

const PHASES = ['1', '2', '3', '4'];
const METADATA_KEYS = ['obraforge-area', 'obraforge-fase', 'obraforge-versao'] as const;
// Estado da skill (ADR-0007): as duas chaves só aparecem em skill depreciada. Publicada é o padrão,
// sem campo; retirada é a pasta removida e o nome em skills/retiradas.txt.
const STATE_KEYS = ['obraforge-estado', 'obraforge-motivo'] as const;
const ALLOWED_METADATA_KEYS: readonly string[] = [...METADATA_KEYS, ...STATE_KEYS];
const DEPRECATED = 'depreciada';
const REASON_MAX = 500;

export function checkName(data: FrontmatterData, retired: ReadonlySet<string>, ctx: Context): Finding[] {
  const finding = (message: string): Finding => ({ code: 'NOME', file: ctx.file, line: ctx.lineOfKey(['name']), message });
  const name = ownValue(data, 'name');
  if (typeof name !== 'string') {
    return [finding('name ausente ou não é texto')];
  }
  if (name.length < 1 || name.length > NAME_MAX) {
    return [finding(`name deve ter de 1 a ${NAME_MAX} caracteres`)];
  }
  if (!NAME_PATTERN.test(name)) {
    return [finding('name fora da regra do padrão: só a-z, 0-9 e hífen, sem hífen no início, no fim ou duplicado')];
  }
  const findings: Finding[] = [];
  if (name !== ctx.folder) {
    findings.push(finding(`name "${name}" difere do nome da pasta`));
  }
  if (retired.has(name)) {
    findings.push(finding(`name "${name}" está em skills/retiradas.txt: nome de skill retirada não é reaproveitado`));
  }
  return findings;
}

export function checkDescription(data: FrontmatterData, ctx: Context): Finding[] {
  const finding = (message: string): Finding => ({
    code: 'DESCRICAO',
    file: ctx.file,
    line: ctx.lineOfKey(['description']),
    message,
  });
  const description = ownValue(data, 'description');
  if (description === undefined) {
    return [finding('description ausente')];
  }
  if (description === null || (typeof description === 'string' && description.trim() === '')) {
    return [finding('description vazia')];
  }
  if (typeof description !== 'string') {
    return [finding('description deve ser texto')];
  }
  // Conta code points, não unidades UTF-16.
  const length = [...description].length;
  if (length > DESCRIPTION_MAX) {
    return [finding(`description com ${length} caracteres (máximo ${DESCRIPTION_MAX})`)];
  }
  return [];
}

// license e compatibility são opcionais no padrão Agent Skills. Quando aparecem, são texto não
// vazio; compatibility tem no máximo 500 caracteres (code points).
export function checkOptionalFields(data: FrontmatterData, ctx: Context): Finding[] {
  const findings: Finding[] = [];
  for (const key of ['license', 'compatibility']) {
    if (!Object.hasOwn(data, key)) {
      continue;
    }
    const value = ownValue(data, key);
    const finding = (message: string): void => {
      findings.push({ code: 'METADATA', file: ctx.file, line: ctx.lineOfKey([key]), message });
    };
    if (typeof value !== 'string' || value.trim() === '') {
      finding(`${key} deve ser texto não vazio`);
    } else if (key === 'compatibility' && [...value].length > COMPATIBILITY_MAX) {
      finding(`compatibility com ${[...value].length} caracteres (máximo ${COMPATIBILITY_MAX})`);
    }
  }
  return findings;
}

export function checkMetadata(data: FrontmatterData, ctx: Context): Finding[] {
  const metadata = ownValue(data, 'metadata');
  if (!isPlainObject(metadata)) {
    return [{ code: 'METADATA', file: ctx.file, line: ctx.lineOfKey(['metadata']), message: 'metadata ausente ou não é mapa' }];
  }
  const findings: Finding[] = [];
  const finding = (key: string, message: string): void => {
    findings.push({ code: 'METADATA', file: ctx.file, line: ctx.lineOfKey(['metadata', key]) ?? ctx.lineOfKey(['metadata']), message });
  };

  // O padrão Agent Skills define metadata como mapa de texto para texto: vale para toda chave.
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value !== 'string') {
      finding(key, `metadata.${key} deve ser texto (entre aspas)`);
    }
  }
  for (const key of METADATA_KEYS) {
    if (!Object.hasOwn(metadata, key)) {
      finding(key, `falta metadata.${key}`);
    }
  }
  // Lista branca: o metadata só leva os campos do obraforge.
  for (const key of Object.keys(metadata)) {
    if (!ALLOWED_METADATA_KEYS.includes(key)) {
      finding(
        key,
        `metadata.${key} fora da lista (só obraforge-area, obraforge-fase, obraforge-versao, obraforge-estado e obraforge-motivo)`,
      );
    }
  }

  const area = ownValue(metadata, 'obraforge-area');
  if (typeof area === 'string') {
    if (!(AREAS as readonly string[]).includes(area)) {
      finding('obraforge-area', 'obraforge-area fora da lista fechada de áreas');
    } else if (area !== ctx.area) {
      finding('obraforge-area', `obraforge-area "${area}" difere da pasta de área`);
    }
  }
  const phase = ownValue(metadata, 'obraforge-fase');
  if (typeof phase === 'string' && !PHASES.includes(phase)) {
    finding('obraforge-fase', 'obraforge-fase deve ser "1", "2", "3" ou "4"');
  }
  const version = ownValue(metadata, 'obraforge-versao');
  if (typeof version === 'string' && (version.length > SEMVER_MAX || !SEMVER_PATTERN.test(version))) {
    finding('obraforge-versao', 'obraforge-versao fora do SemVer 2.0.0');
  }

  const hasState = Object.hasOwn(metadata, 'obraforge-estado');
  const hasReason = Object.hasOwn(metadata, 'obraforge-motivo');
  const state = ownValue(metadata, 'obraforge-estado');
  if (typeof state === 'string' && state !== DEPRECATED) {
    finding('obraforge-estado', 'obraforge-estado só aceita "depreciada" (publicada é o padrão, sem o campo)');
  }
  if (hasState && !hasReason) {
    finding('obraforge-estado', 'skill depreciada sem metadata.obraforge-motivo');
  }
  if (hasReason && !hasState) {
    finding('obraforge-motivo', 'obraforge-motivo sem obraforge-estado: o motivo só existe em skill depreciada');
  }
  const reason = ownValue(metadata, 'obraforge-motivo');
  if (typeof reason === 'string') {
    if (reason.trim() === '') {
      finding('obraforge-motivo', 'obraforge-motivo vazio');
    } else if ([...reason].length > REASON_MAX) {
      finding('obraforge-motivo', `obraforge-motivo com ${[...reason].length} caracteres (máximo ${REASON_MAX})`);
    }
  }
  return findings;
}
