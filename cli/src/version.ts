import { readFileSync } from 'node:fs';

// Compilado em dist/src/version.js: ../../package.json é a raiz do pacote, no repositório e no tarball.
const PACKAGE_JSON = new URL('../../package.json', import.meta.url);

export function readVersion(packageJson: URL = PACKAGE_JSON): string {
  const pkg: unknown = JSON.parse(readFileSync(packageJson, 'utf8'));
  const version = typeof pkg === 'object' && pkg !== null ? (pkg as { version?: unknown }).version : undefined;
  if (typeof version !== 'string' || version === '') {
    throw new Error(`package.json sem o campo "version": ${packageJson.pathname}`);
  }
  return version;
}
