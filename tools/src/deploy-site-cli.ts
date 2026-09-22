// Uso: node tools/dist/src/deploy-site-cli.js <pasta-do-site>. Lê VERCEL_TOKEN, VERCEL_ORG_ID e
// VERCEL_PROJECT_ID do ambiente (workflow site.yml, environment producao).
import { deploySite, DeployError } from './deploy-site.js';

const [dir] = process.argv.slice(2);
if (dir === undefined) {
  console.error('Uso: deploy-site-cli <pasta-do-site>');
  process.exitCode = 2;
} else {
  deploySite({
    dir,
    token: process.env['VERCEL_TOKEN'] ?? '',
    orgId: process.env['VERCEL_ORG_ID'] ?? '',
    projectId: process.env['VERCEL_PROJECT_ID'] ?? '',
    fetch: (url, init) => fetch(url, init),
  }).then(
    (result) => {
      console.log(`Site publicado: ${result.url} (deploy ${result.id}).`);
    },
    (error: unknown) => {
      console.error(`Publicação do site falhou: ${error instanceof DeployError ? error.message : 'erro inesperado'}`);
      process.exitCode = 1;
    },
  );
}
