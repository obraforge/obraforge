// Dados do site, lidos no build do catalog.json e dos arquivos das skills da mesma revisão
// (Plataforma · Dashboard — Spec §3: fonte única, nada digitado à mão sobre skill).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Raiz do repositório: o build roda em dashboard/. O teste troca a raiz por um catálogo de mentira.
const ROOT = process.env.OBRAFORGE_ROOT ?? join(process.cwd(), '..');

export const REPO_URL = 'https://github.com/obraforge/obraforge';

export interface Skill {
  readonly name: string;
  readonly area: string;
  readonly phase: number;
  readonly version: string;
  readonly state: 'publicada' | 'depreciada';
  readonly deprecationReason?: string;
  readonly description: string;
  readonly path: string;
  readonly sha256: string;
}

export interface Catalog {
  readonly version: string;
  readonly skills: readonly Skill[];
}

export interface Norma {
  readonly key: string;
  readonly title: string;
  readonly year: string;
  readonly source: string;
}

let cached: Catalog | undefined;

export function catalog(): Catalog {
  cached ??= JSON.parse(readFileSync(join(ROOT, 'catalog.json'), 'utf8')) as Catalog;
  return cached;
}

export function areasWithSkills(): string[] {
  return [...new Set(catalog().skills.map((skill) => skill.area))];
}

function skillFile(skill: Skill, relative: string): string {
  return readFileSync(join(ROOT, skill.path, relative), 'utf8');
}

// Corpo do SKILL.md, sem o frontmatter (os dados dele já estão no catálogo).
export function skillBody(skill: Skill): string {
  const text = skillFile(skill, 'SKILL.md').replace(/^﻿/, '');
  const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n/.exec(text);
  return match ? text.slice(match[0].length) : text;
}

export function expected(skill: Skill): string {
  return skillFile(skill, 'fixtures/esperado.md');
}

// Entradas "## <norma>" de references/normas.md, com Título, Ano e Fonte (formato da D-011).
export function normas(skill: Skill): Norma[] {
  const entries: Norma[] = [];
  let current: { key: string; fields: Record<string, string> } | undefined;
  const flush = (): void => {
    if (current) {
      entries.push({ key: current.key, title: current.fields['Título'] ?? '', year: current.fields['Ano'] ?? '', source: current.fields['Fonte'] ?? '' });
    }
  };
  for (const line of skillFile(skill, 'references/normas.md').split(/\r?\n/)) {
    const heading = /^##\s+(.+)$/.exec(line);
    if (heading) {
      flush();
      current = { key: (heading[1] ?? '').trim(), fields: {} };
      continue;
    }
    const field = /^-\s+(Título|Ano|Fonte):\s*(.+)$/.exec(line);
    if (field && current) {
      current.fields[field[1] ?? ''] = (field[2] ?? '').trim();
    }
  }
  flush();
  return entries;
}

// Nome do arquivo de entrada da fixture (o validador garante um fixtures/entrada.*).
export function fixtureInput(skill: Skill): string {
  return readdirSync(join(ROOT, skill.path, 'fixtures')).find((file) => file.startsWith('entrada.')) ?? '';
}

// Primeira frase da descrição, para os resumos.
export function firstSentence(text: string): string {
  const match = /^(.+?[.!?])(\s|$)/.exec(text);
  return match?.[1] ?? text;
}

export const TOOLS = [
  { id: 'claude', label: 'Claude Code' },
  { id: 'codex', label: 'Codex' },
  { id: 'gemini', label: 'Gemini CLI' },
  { id: 'agents', label: 'Outro agente compatível' },
] as const;

// O comando exibido é o que a CLI aceita (Dashboard §11, critério 2); o teste roda cada um.
export function installCommand(skill: Skill, tool: string): string {
  return `npx obraforge@latest add ${skill.name} --for ${tool}`;
}
