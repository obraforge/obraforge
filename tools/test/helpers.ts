import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSkillsRoot, type RuleCode } from '../src/validate.js';

// Os testes rodam de dist/test/; os casos ficam no fonte, em tools/test/casos/.
export const CASES_DIR = fileURLToPath(new URL('../../test/casos/', import.meta.url));
export const VALID_CASE = join(CASES_DIR, 'valida');
export const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
// A skill do caso válido, relativa à raiz do caso.
export const SKILL = 'contexto/exemplo-valido';

const tempDirs: string[] = [];

export async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'obraforge-validador-'));
  tempDirs.push(dir);
  return dir;
}

export async function removeTempDirs(): Promise<void> {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
}

// Cópia temporária do caso válido. `root` é a raiz de skills; `skill`, a pasta da skill.
export async function copyValidCase(): Promise<{ root: string; skill: string }> {
  const root = join(await makeTempDir(), 'skills');
  await cp(VALID_CASE, root, { recursive: true });
  return { root, skill: join(root, SKILL) };
}

export async function codesOf(root: string): Promise<RuleCode[]> {
  const findings = await validateSkillsRoot(root);
  return [...new Set(findings.map((finding) => finding.code))].sort();
}

export async function replaceInFile(path: string, from: string, to: string): Promise<void> {
  const text = await readFile(path, 'utf8');
  if (!text.includes(from)) {
    throw new Error(`trecho não encontrado em ${path}: ${from}`);
  }
  await writeFile(path, text.replace(from, to));
}

export async function appendLine(path: string, line: string): Promise<void> {
  await writeFile(path, `${await readFile(path, 'utf8')}${line}\n`);
}

// Geradores de CPF e CNPJ com dígito verificador válido, escritos à parte da implementação em
// src/br-documents.ts (tabela de pesos explícita), para os testes não validarem o código com ele
// mesmo. O número só existe em memória e em pasta temporária: nunca num arquivo versionado.
function mod11(values: readonly number[], weights: readonly number[]): number {
  const sum = values.reduce((total, value, index) => total + value * (weights[index] ?? 0), 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export function cpfWithDv(base9: string): string {
  const values = [...base9].map(Number);
  const first = mod11(values, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = mod11([...values, first], [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return `${base9}${first}${second}`;
}

export function cnpjWithDv(base12: string): string {
  const values = [...base12].map((char) => char.charCodeAt(0) - 48);
  const first = mod11(values, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = mod11([...values, first], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return `${base12}${first}${second}`;
}

export const maskCpf = (cpf: string): string => `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;

export const maskCnpj = (cnpj: string): string =>
  `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
