import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

// A CLI não faz chamada de rede (Plataforma · CLI — Spec §11, critério 6). Qualquer módulo de rede
// ou fetch em cli/src derruba este teste.
const FORBIDDEN = [/from ['"]node:(http|https|http2|net|tls|dgram|dns)['"]/, /import\(['"]node:(http|https|http2|net|tls|dgram|dns)['"]\)/, /\bfetch\(/, /\bWebSocket\b/, /\bXMLHttpRequest\b/];

test('cli/src não importa módulo de rede nem chama fetch', () => {
  const srcDir = join(process.cwd(), 'src');
  for (const file of readdirSync(srcDir).filter((name) => name.endsWith('.ts'))) {
    const text = readFileSync(join(srcDir, file), 'utf8');
    for (const pattern of FORBIDDEN) {
      assert.ok(!pattern.test(text), `${file} casa ${pattern}`);
    }
  }
});
