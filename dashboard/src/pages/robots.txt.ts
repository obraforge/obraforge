import type { APIRoute } from 'astro';

// Bots de busca e de IA liberados (decisão do dono em 21/09/2026, docs/site/mapa.md).
export const GET: APIRoute = ({ site }) =>
  new Response(['User-agent: *', 'Allow: /', ...(site ? [`Sitemap: ${new URL('/sitemap.xml', site).href}`] : [])].join('\n') + '\n');
