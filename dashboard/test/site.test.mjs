// Testes do site gerado (item W1 do plano da fase 1). Rodam sobre dist/, que o script de teste
// gera antes; o teste do conteúdo malicioso gera outro site, de um catálogo de mentira.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DASHBOARD = fileURLToPath(new URL('..', import.meta.url));
const ROOT = join(DASHBOARD, '..');
const DIST = join(DASHBOARD, 'dist');
const catalog = JSON.parse(readFileSync(join(ROOT, 'catalog.json'), 'utf8'));
const temps = [];
after(() => temps.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

function htmlFiles(dir) {
  return readdirSync(dir, { recursive: true }).filter((file) => String(file).endsWith('.html')).map((file) => join(dir, String(file)));
}

// Nomes de atributo de evento (on...) em tags de verdade. Lê cada tag com os valores entre aspas,
// para um "<img onerror>" dentro de um valor de atributo ou no texto escapado não contar: ali ele
// é texto, não tag.
const TAG = /<([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s=>/"']+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>"']+))?)*)\s*\/?>/g;
const ATTRIBUTE = /\s+([^\s=>/"']+)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>"']+))?/g;
function eventAttributes(html) {
  const found = [];
  for (const [, , attrs] of html.matchAll(TAG)) {
    for (const [, name] of (attrs ?? '').matchAll(ATTRIBUTE)) {
      if (/^on/i.test(name)) found.push(name);
    }
  }
  return found;
}

// Nomes das tags de verdade, na mesma leitura.
function tagNames(html) {
  return [...html.matchAll(TAG)].map((match) => (match[1] ?? '').toLowerCase());
}

// Nenhum script executável em linha, nenhum estilo em linha, nada carregado de outro host: a CSP
// do vercel.json (script-src e style-src 'self') depende disso.
function auditPage(html) {
  const problems = [];
  for (const [, attrs, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script[^>]*>/gi)) {
    if (!/\bsrc=/i.test(attrs) && !/application\/ld\+json/i.test(attrs) && body.trim() !== '') problems.push('script em linha');
    if (/\bsrc="(https?:)?\/\//i.test(attrs)) problems.push('script de outro host');
  }
  if (/<style\b/i.test(html)) problems.push('<style> em linha');
  if (/<[a-z][^<>]*\sstyle\s*=/i.test(html)) problems.push('atributo style');
  if (/<(link|img|iframe|source|video|audio)\b[^>]*\s(src|href)="(https?:)?\/\//i.test(html.replace(/<a\b[^>]*>/gi, ''))) problems.push('recurso de outro host');
  if (/<(iframe|object|embed)\b/i.test(html)) problems.push('iframe, object ou embed');
  if (eventAttributes(html).length > 0) problems.push('atributo de evento');
  if (/href="\s*javascript:/i.test(html)) problems.push('link javascript:');
  return problems;
}

test('a auditoria acusa atributo de evento em tag de verdade e ignora o texto escapado', () => {
  assert.deepEqual(auditPage('<p><img src="a.png" onerror="x()"></p>'), ['atributo de evento']);
  assert.deepEqual(auditPage('<p>&lt;img src=&quot;x&quot; onerror=&quot;x()&quot;&gt;</p>'), []);
  assert.deepEqual(auditPage('<meta name="description" content="Texto <img src=x onerror=alert(5)>.">'), []);
  assert.deepEqual(auditPage('<b onclick=x>t</b>'), ['atributo de evento']);
  assert.deepEqual(auditPage('<SCRIPT>alert(1)</SCRIPT >'), ['script em linha']);
  assert.deepEqual(auditPage('<Style>p{}</Style>'), ['<style> em linha']);
});

test('nenhuma página tem script ou estilo em linha, nem carrega recurso de outro host', () => {
  const files = htmlFiles(DIST);
  assert.ok(files.length > 0);
  for (const file of files) {
    assert.deepEqual(auditPage(readFileSync(file, 'utf8')), [], file);
  }
});

test('toda skill e toda área do catálogo têm página, com o aviso e as normas com fonte', () => {
  for (const skill of catalog.skills) {
    const html = readFileSync(join(DIST, 'skills', `${skill.name}.html`), 'utf8');
    assert.match(html, /Esta skill não substitui o responsável técnico/, skill.name);
    const normas = readFileSync(join(ROOT, skill.path, 'references', 'normas.md'), 'utf8');
    for (const [, source] of normas.matchAll(/^- Fonte:\s*(https?:\/\/\S+)/gm)) {
      assert.ok(html.includes(`href="${source}"`), `${skill.name}: fonte ${source}`);
    }
  }
  for (const area of new Set(catalog.skills.map((skill) => skill.area))) {
    assert.ok(existsSync(join(DIST, 'areas', `${area}.html`)), area);
  }
});

// Dashboard §11, critério 2: o comando exibido é o que a CLI da mesma versão aceita. Cada comando
// da página roda contra a CLI construída, numa pasta limpa, e precisa instalar a skill.
test('cada comando mostrado na página instala a skill pela CLI real', async () => {
  const { run } = await import(pathToFileURL(join(ROOT, 'cli', 'dist', 'src', 'main.js')).href);
  const log = console.log;
  const error = console.error;
  for (const skill of catalog.skills) {
    const html = readFileSync(join(DIST, 'skills', `${skill.name}.html`), 'utf8');
    const commands = [...html.matchAll(/<code[^>]*data-comando[^>]*>([^<]+)<\/code>/g)].map((match) => match[1]);
    assert.equal(commands.length, 4, skill.name);
    for (const command of commands) {
      const [npx, pkg, ...args] = command.split(' ');
      assert.equal(`${npx} ${pkg}`, 'npx obraforge@latest');
      const cwd = mkdtempSync(join(tmpdir(), 'obraforge-site-'));
      temps.push(cwd);
      console.log = () => undefined;
      console.error = () => undefined;
      let code;
      try {
        code = await run(args, { cwd, packageRoot: ROOT, catalogJson: pathToFileURL(join(ROOT, 'catalog.json')) });
      } finally {
        console.log = log;
        console.error = error;
      }
      assert.equal(code, 0, command);
      const base = args.includes('claude') ? '.claude' : '.agents';
      assert.ok(existsSync(join(cwd, base, 'skills', skill.name, 'SKILL.md')), command);
    }
  }
});

test('o conteúdo de uma skill maliciosa não vira HTML nem script no site', () => {
  const root = mkdtempSync(join(tmpdir(), 'obraforge-site-mal-'));
  temps.push(root);
  const dir = join(root, 'skills', 'contexto', 'skill-maliciosa');
  const files = {
    // Cada construção separada por linha em branco: sem isso, o bloco HTML do CommonMark engole
    // as linhas seguintes como texto, e o link e a imagem nem chegam ao renderizador.
    'SKILL.md': [
      '---', 'name: skill-maliciosa', '---', '',
      '# Título', '',
      '<script>alert("skill")</script>', '',
      '<img src="x" onerror="alert(1)">', '',
      'Texto com <b onclick="alert(2)">negrito</b> em linha.', '',
      '[clique aqui](javascript:alert(3)) e [outro](//evil.example/x) e [dados](data:text/html,oi)', '',
      '![imagem](https://evil.example/rastreio.png)', '',
      '<iframe src="https://evil.example"></iframe>', '',
      '[referência](references/normas.md)', '',
    ].join('\n'),
    'fixtures/entrada.md': 'x\n',
    'fixtures/esperado.md': '<script>alert("esperado")</script>\n<style>body{display:none}</style>\n',
    'references/normas.md': '## Lei 1.234/2020\n- Título: <b>título</b>\n- Ano: 2020\n- Fonte: javascript:alert(4)\n',
  };
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  writeFileSync(
    join(root, 'catalog.json'),
    JSON.stringify({
      version: '9.9.9',
      areas: ['contexto'],
      retired: [],
      skills: [
        {
          name: 'skill-maliciosa', area: 'contexto', phase: 1, version: '1.0.0', state: 'depreciada',
          deprecationReason: '<script>alert("motivo")</script>', description: 'Descrição <img src=x onerror=alert(5)>.',
          references: [], path: 'skills/contexto/skill-maliciosa', sha256: 'a'.repeat(64),
        },
      ],
    }),
  );
  const out = join(root, 'out');
  const build = spawnSync('npx', ['astro', 'build'], {
    cwd: DASHBOARD,
    env: { ...process.env, OBRAFORGE_ROOT: root, OBRAFORGE_OUT: out, ASTRO_TELEMETRY_DISABLED: '1' },
    encoding: 'utf8',
  });
  assert.equal(build.status, 0, build.stderr);
  const html = readFileSync(join(out, 'skills', 'skill-maliciosa.html'), 'utf8');
  assert.deepEqual(auditPage(html), []);
  assert.ok(!html.includes('<script>alert'), 'script cru');
  assert.ok(!html.includes('evil.example/rastreio'), 'imagem externa');
  assert.ok(!tagNames(html).includes('img'), 'imagem');
  assert.ok(!html.includes('<b onclick'), 'HTML em linha');
  assert.ok(!html.includes('evil.example/x'), 'link sem esquema (//host) removido');
  assert.ok(!/href="data:/.test(html), 'link data: removido');
  assert.match(html, /clique aqui/, 'o texto do link removido continua');
  assert.match(html, /&lt;script&gt;alert\(&quot;skill&quot;\)&lt;\/script&gt;/, 'o HTML do autor aparece escapado, como texto');
  assert.match(html, /href="https:\/\/github\.com\/obraforge\/obraforge\/blob\/main\/skills\/contexto\/skill-maliciosa\/references\/normas\.md"/, 'link relativo vai para o GitHub');
});

test('vercel.json declara CSP restritiva, HSTS, nosniff, Referrer-Policy e Permissions-Policy', () => {
  const config = JSON.parse(readFileSync(join(DASHBOARD, 'vercel.json'), 'utf8'));
  const headers = Object.fromEntries(config.headers.find((entry) => entry.source === '/(.*)').headers.map((header) => [header.key, header.value]));
  const csp = headers['Content-Security-Policy'] ?? '';
  for (const directive of ["default-src 'self'", "script-src 'self'", "style-src 'self'", "object-src 'none'", "base-uri 'none'", "frame-ancestors 'none'"]) {
    assert.ok(csp.includes(directive), directive);
  }
  assert.ok(!csp.includes('unsafe-inline') && !csp.includes('unsafe-eval'));
  assert.match(headers['Strict-Transport-Security'] ?? '', /max-age=\d{7,}/);
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.ok(headers['Referrer-Policy']);
  assert.ok(headers['Permissions-Policy']);
});
