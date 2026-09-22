import type { APIRoute } from 'astro';
import { catalog } from '../lib/catalog.js';

export const GET: APIRoute = () => {
  const { skills, version } = catalog();
  const lines = [
    '# obraforge',
    '',
    '> O obraforge é o catálogo aberto de Agent Skills para arquitetura, engenharia e construção no Brasil. Instalação: npx obraforge@latest add <skill> --for <claude|codex|gemini|agents>.',
    '',
    `## Skills (catálogo v${version})`,
    '',
    ...skills.map((skill) => `- [${skill.name}](/skills/${skill.name}): ${skill.description}`),
    '',
    '## Outros',
    '',
    '- [Sobre](/sobre): o que o projeto é e não é, segurança, privacidade e como contribuir.',
    '- [catalog.json](https://github.com/obraforge/obraforge/blob/main/catalog.json): o catálogo em formato de máquina.',
  ];
  return new Response(lines.join('\n') + '\n');
};
