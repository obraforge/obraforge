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
    version: `1.2.0+${'a'.repeat(12)}`,
    source: { source: 'git-subdir', url: 'https://github.com/obraforge/obraforge.git', path: 'skills/contexto/skill-um', ref: 'v0.3.0' },
    strict: false,
  });
});

// G1, achado 6: o gerador só percorre catalog.skills, então a skill retirada fica fora por
// construção (a pasta dela sai de skills/); não há caminho a testar além deste.
test('skill depreciada entra com o motivo na descrição', () => {
  const marketplace = buildMarketplace(catalog);
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

// G1, lente de segurança, achado 1: o Claude Code só atualiza o plugin quando a string de versão
// muda. A versão leva o começo do hash, então conteúdo novo sempre vira versão nova.
test('G1: a versão do plugin muda quando o conteúdo muda, mesmo sem subir a versão da skill', () => {
  const before = buildMarketplace(catalog).plugins[0]?.version;
  const changed: Catalog = { ...catalog, skills: [{ ...(catalog.skills[0] as CatalogSkillEntry), sha256: 'b'.repeat(64) }] };
  assert.notEqual(buildMarketplace(changed).plugins[0]?.version, before);
});
