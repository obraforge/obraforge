import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Catalog, CatalogSkillEntry } from '../src/catalog.js';
import { buildMarketplace, formatMarketplaceJson } from '../src/marketplace.js';

function skill(name: string, extra: Partial<CatalogSkillEntry> = {}): CatalogSkillEntry {
  return {
    name,
    area: 'contexto',
    phase: 1,
    version: '1.2.0',
    state: 'publicada',
    description: `Skill ${name}.`,
    references: [],
    path: `skills/contexto/${name}`,
    sha256: 'a'.repeat(64),
    ...extra,
  };
}

const catalog: Catalog = {
  version: '0.3.0',
  areas: ['contexto'],
  retired: ['skill-velha'],
  skills: [skill('skill-um'), skill('skill-dois', { state: 'depreciada', deprecationReason: 'Norma revogada.' })],
};

test('um plugin por skill, fixado na tag da versão do catálogo, sem plugin.json (strict: false)', () => {
  const marketplace = buildMarketplace(catalog);
  assert.equal(marketplace.name, 'obraforge');
  assert.deepEqual(marketplace.owner, { name: 'obraforge' });
  assert.ok(marketplace.description.length > 0);
  assert.deepEqual(marketplace.plugins[0], {
    name: 'skill-um',
    description: 'Skill skill-um.',
    version: '1.2.0',
    source: { source: 'git-subdir', url: 'https://github.com/obraforge/obraforge.git', path: 'skills/contexto/skill-um', ref: 'v0.3.0' },
    strict: false,
  });
});

test('skill depreciada entra com o motivo na descrição; retirada não entra', () => {
  const marketplace = buildMarketplace(catalog);
  assert.deepEqual(
    marketplace.plugins.map((plugin) => plugin.name),
    ['skill-um', 'skill-dois'],
  );
  assert.equal(marketplace.plugins[1]?.description, 'Depreciada: Norma revogada. Skill skill-dois.');
});

test('o manifesto lista exatamente as skills do catálogo (Publicação §11, critério 5)', () => {
  const marketplace = buildMarketplace(catalog);
  assert.deepEqual(
    marketplace.plugins.map((plugin) => plugin.source.path),
    catalog.skills.map((entry) => entry.path),
  );
});

test('formatMarketplaceJson é determinístico e termina com um "\\n"', () => {
  const first = formatMarketplaceJson(buildMarketplace(catalog));
  assert.equal(first, formatMarketplaceJson(buildMarketplace(catalog)));
  assert.ok(first.endsWith('}\n') && !first.endsWith('\n\n'));
});
