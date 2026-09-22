// Publica o site já construído (dashboard/dist) na Vercel pela API REST (ADR-0010), sem
// dependência: sobe cada arquivo por SHA-1 (POST /v2/files) e cria o deploy de produção sem
// framework nem build (POST /v13/deployments), depois acompanha o readyState até READY. Endpoints
// conferidos na documentação oficial em 22/09/2026 (vercel.com/docs/rest-api). Fica no tools/,
// que nunca é publicado: a CLI do obraforge continua sem nenhuma chamada de rede.
import { createHash } from 'node:crypto';
import { lstat, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const API = 'https://api.vercel.com';
const TIMEOUT_MS = 10 * 60 * 1000;

export class DeployError extends Error {}

export interface FetchInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string | Buffer;
}
export type FetchLike = (url: string, init: FetchInit) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export interface DeployOptions {
  dir: string;
  token: string;
  orgId: string;
  projectId: string;
  fetch: FetchLike;
  pollIntervalMs?: number;
}

interface SiteFile {
  file: string;
  bytes: Buffer;
  sha: string;
}

// Só arquivo regular: link simbólico ou arquivo especial na pasta do site falha antes de subir.
async function listFiles(root: string, relative = ''): Promise<SiteFile[]> {
  const files: SiteFile[] = [];
  for (const name of (await readdir(join(root, relative))).sort()) {
    const path = relative === '' ? name : `${relative}/${name}`;
    const stats = await lstat(join(root, path));
    if (stats.isDirectory()) {
      files.push(...(await listFiles(root, path)));
    } else if (stats.isFile()) {
      const bytes = await readFile(join(root, path));
      files.push({ file: path, bytes, sha: createHash('sha1').update(bytes).digest('hex') });
    } else {
      throw new DeployError(`link simbólico ou arquivo especial no site: ${path}`);
    }
  }
  return files;
}

async function call(options: DeployOptions, path: string, init: FetchInit): Promise<Record<string, unknown>> {
  const separator = path.includes('?') ? '&' : '?';
  const response = await options.fetch(`${API}${path}${separator}teamId=${encodeURIComponent(options.orgId)}`, {
    ...init,
    headers: { Authorization: `Bearer ${options.token}`, ...init.headers },
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    // Só o status e a mensagem da API; nunca o pedido, que leva o token.
    const message = (data['error'] as { message?: unknown } | undefined)?.message;
    throw new DeployError(`a API da Vercel respondeu ${response.status} em ${path.split('?')[0]}${typeof message === 'string' ? `: ${message}` : ''}`);
  }
  return data;
}

export async function deploySite(options: DeployOptions): Promise<{ id: string; url: string }> {
  for (const [name, value] of [['VERCEL_TOKEN', options.token], ['VERCEL_ORG_ID', options.orgId], ['VERCEL_PROJECT_ID', options.projectId]] as const) {
    if (value.trim() === '') {
      throw new DeployError(`${name} ausente`);
    }
  }
  const files = await listFiles(options.dir);
  for (const file of files) {
    await call(options, '/v2/files', {
      method: 'POST',
      // O Content-Length o fetch calcula sozinho.
      headers: { 'Content-Type': 'application/octet-stream', 'x-vercel-digest': file.sha },
      body: file.bytes,
    });
  }
  const created = await call(options, '/v13/deployments?skipAutoDetectionConfirmation=1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'obraforge',
      project: options.projectId,
      target: 'production',
      files: files.map((file) => ({ file: file.file, sha: file.sha, size: file.bytes.length })),
      // Site já construído: nada de framework, instalação ou build do lado da Vercel.
      projectSettings: { framework: null, buildCommand: null, installCommand: null, outputDirectory: null },
    }),
  });
  const id = String(created['id'] ?? '');
  const started = Date.now();
  let state = String(created['readyState'] ?? '');
  let url = String(created['url'] ?? '');
  while (state !== 'READY') {
    if (state === 'ERROR' || state === 'CANCELED') {
      throw new DeployError(`o deploy ${id} terminou em ${state}`);
    }
    if (Date.now() - started > TIMEOUT_MS) {
      throw new DeployError(`o deploy ${id} não ficou pronto em ${TIMEOUT_MS / 60000} min (último estado: ${state})`);
    }
    await new Promise((resolve) => setTimeout(resolve, options.pollIntervalMs ?? 5000));
    const current = await call(options, `/v13/deployments/${encodeURIComponent(id)}`, { method: 'GET' });
    state = String(current['readyState'] ?? '');
    url = String(current['url'] ?? url);
  }
  return { id, url: `https://${url}` };
}
