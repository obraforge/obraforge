// Site estático do obraforge (item W1 do plano da fase 1). Sem adapter: a Vercel serve dist/.
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

// URL de produção: a Vercel expõe o domínio de produção no build. Sem ela (build local), o site
// sai sem canonical absoluto e sem sitemap, em vez de apontar para um domínio inventado.
const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export default defineConfig({
  ...(productionHost ? { site: `https://${productionHost}` } : {}),
  // O teste gera o site de uma raiz de catálogo de mentira noutra pasta.
  ...(process.env.OBRAFORGE_OUT ? { outDir: process.env.OBRAFORGE_OUT } : {}),
  trailingSlash: 'never',
  build: {
    format: 'file',
    // CSP com style-src 'self': nenhum CSS em linha.
    inlineStylesheets: 'never',
  },
  vite: {
    plugins: [tailwindcss()],
    // CSP com script-src 'self': nenhum script pequeno vira script em linha.
    build: { assetsInlineLimit: 0 },
  },
});
