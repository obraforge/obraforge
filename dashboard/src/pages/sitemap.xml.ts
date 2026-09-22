import type { APIRoute } from 'astro';
import { areasWithSkills, catalog } from '../lib/catalog.js';

// Sem a URL de produção (build local), o sitemap sai vazio em vez de apontar para domínio inventado.
export const GET: APIRoute = ({ site }) => {
  const paths = ['/', '/skills', '/sobre', ...catalog().skills.map((skill) => `/skills/${skill.name}`), ...areasWithSkills().map((tag) => `/areas/${tag}`)];
  const urls = site ? paths.map((path) => `  <url><loc>${new URL(path, site).href}</loc></url>`) : [];
  return new Response(['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...urls, '</urlset>'].join('\n') + '\n', {
    headers: { 'Content-Type': 'application/xml' },
  });
};
