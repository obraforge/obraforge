// Manifesto do marketplace de plugins do Claude Code (item P1 do plano da fase 1), gerado do
// catalog.json e nunca editado à mão (Publicação e Plugin — Spec §9). Um plugin por skill, com a
// skill na raiz do plugin e sem plugin.json ("strict": false). A fonte fica fixada na tag da
// release: o plugin instala da release, como a CLI, e nunca da main. Formato conferido na
// documentação oficial em 21/09/2026 (code.claude.com/docs/en/plugin-marketplaces e
// /plugins-reference).
import type { Catalog } from './catalog.js';

export const REPO_GIT_URL = 'https://github.com/obraforge/obraforge.git';

export interface MarketplacePlugin {
  name: string;
  description: string;
  version: string;
  source: { source: 'git-subdir'; url: string; path: string; ref: string };
  strict: false;
}

export interface Marketplace {
  name: string;
  owner: { name: string };
  description: string;
  plugins: MarketplacePlugin[];
}

export function buildMarketplace(catalog: Catalog): Marketplace {
  return {
    name: 'obraforge',
    owner: { name: 'obraforge' },
    description: 'Catálogo aberto de Agent Skills para arquitetura, engenharia e construção no Brasil. Cada plugin é uma skill, instalada da release do obraforge.',
    plugins: catalog.skills.map((skill) => ({
      name: skill.name,
      description: skill.state === 'depreciada' ? `Depreciada: ${skill.deprecationReason ?? ''} ${skill.description}` : skill.description,
      version: skill.version,
      source: { source: 'git-subdir', url: REPO_GIT_URL, path: skill.path, ref: `v${catalog.version}` },
      strict: false,
    })),
  };
}

export function formatMarketplaceJson(marketplace: Marketplace): string {
  return `${JSON.stringify(marketplace, null, 2)}\n`;
}
