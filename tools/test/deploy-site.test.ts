import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { deploySite, DeployError, type FetchLike } from '../src/deploy-site.js';
import { makeTempDir, removeTempDirs } from './helpers.js';

after(removeTempDirs);

interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

// Vercel de mentira: registra cada chamada e responde como a API documentada.
function fakeVercel(states: string[] = ['BUILDING', 'READY']): { fetch: FetchLike; calls: Call[] } {
  const calls: Call[] = [];
  const fetch: FetchLike = async (url, init) => {
    const headers = Object.fromEntries(Object.entries(init.headers ?? {}));
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
    calls.push({ url, method: init.method ?? 'GET', headers, body });
    if (url.includes('/v2/files')) return { ok: true, status: 200, json: async () => ({}) };
    if (init.method === 'POST' && url.includes('/v13/deployments')) {
      return { ok: true, status: 200, json: async () => ({ id: 'dpl_1', url: 'obraforge-abc.vercel.app', readyState: 'QUEUED' }) };
    }
    const readyState = states.shift() ?? 'READY';
    return { ok: true, status: 200, json: async () => ({ id: 'dpl_1', url: 'obraforge-abc.vercel.app', readyState }) };
  };
  return { fetch, calls };
}

async function site(): Promise<string> {
  const dir = await makeTempDir();
  await mkdir(join(dir, 'skills'), { recursive: true });
  await writeFile(join(dir, 'index.html'), '<h1>oi</h1>');
  await writeFile(join(dir, 'skills', 'a.html'), 'a');
  await writeFile(join(dir, 'vercel.json'), '{}');
  return dir;
}

const ENV = { token: 'tkn', orgId: 'team_1', projectId: 'prj_1' };

test('sobe cada arquivo com o SHA-1 e cria o deploy de produção sem framework nem build', async () => {
  const dir = await site();
  const vercel = fakeVercel();
  const result = await deploySite({ dir, ...ENV, fetch: vercel.fetch, pollIntervalMs: 0 });
  assert.equal(result.url, 'https://obraforge-abc.vercel.app');
  const uploads = vercel.calls.filter((call) => call.url.includes('/v2/files'));
  assert.equal(uploads.length, 3);
  for (const upload of uploads) {
    assert.equal(upload.headers['Authorization'], 'Bearer tkn');
    assert.equal(upload.headers['x-vercel-digest'], createHash('sha1').update(upload.body as Buffer).digest('hex'));
    assert.match(upload.url, /teamId=team_1/);
  }
  const create = vercel.calls.find((call) => call.method === 'POST' && call.url.includes('/v13/deployments'));
  const body = create?.body as { project: string; target: string; files: Array<{ file: string }>; projectSettings: Record<string, unknown> };
  assert.equal(body.project, 'prj_1');
  assert.equal(body.target, 'production');
  assert.deepEqual(body.files.map((file) => file.file).sort(), ['index.html', 'skills/a.html', 'vercel.json']);
  assert.equal(body.projectSettings['framework'], null);
});

test('deploy que termina em ERROR falha', async () => {
  const dir = await site();
  const vercel = fakeVercel(['BUILDING', 'ERROR']);
  await assert.rejects(deploySite({ dir, ...ENV, fetch: vercel.fetch, pollIntervalMs: 0 }), (error: unknown) => error instanceof DeployError && /ERROR/.test(error.message));
});

test('sem token, org ou projeto: falha antes de qualquer chamada (fail-closed)', async () => {
  const dir = await site();
  for (const missing of ['token', 'orgId', 'projectId'] as const) {
    const vercel = fakeVercel();
    await assert.rejects(deploySite({ dir, ...ENV, [missing]: '', fetch: vercel.fetch, pollIntervalMs: 0 }), DeployError);
    assert.equal(vercel.calls.length, 0, missing);
  }
});

test('link simbólico na pasta do site: falha antes de subir', async () => {
  const dir = await site();
  await symlink('/etc/hosts', join(dir, 'hosts.html'));
  const vercel = fakeVercel();
  await assert.rejects(deploySite({ dir, ...ENV, fetch: vercel.fetch, pollIntervalMs: 0 }), /link simbólico/);
  assert.equal(vercel.calls.length, 0);
});

test('resposta de erro da API falha com o status, sem ecoar o token', async () => {
  const dir = await site();
  const fetch: FetchLike = async () => ({ ok: false, status: 403, json: async () => ({ error: { message: 'Not authorized' } }) });
  await assert.rejects(deploySite({ dir, ...ENV, token: 'segredo-que-nao-pode-vazar', fetch, pollIntervalMs: 0 }), (error: unknown) => {
    assert.ok(error instanceof DeployError);
    assert.match(error.message, /403/);
    assert.ok(!error.message.includes('segredo-que-nao-pode-vazar'));
    return true;
  });
});
