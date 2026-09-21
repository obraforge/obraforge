import type { Finding } from './findings.js';

// Nome de arquivo e trecho de mensagem vêm do PR, que não é confiável. Caractere de controle,
// de formatação invisível ou separador de linha sai como \u{...}: assim nenhum achado quebra a
// linha nem começa uma linha nova que o GitHub Actions leria como comando (::comando::).
export function sanitize(text: string): string {
  return text.replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, (char) => `\\u{${(char.codePointAt(0) ?? 0).toString(16)}}`);
}

export function formatFinding(finding: Finding): string {
  const location = finding.line === undefined ? finding.file : `${finding.file}:${finding.line}`;
  return `${finding.code} ${sanitize(location)} — ${sanitize(finding.message)}`;
}

export function formatSummary(findings: readonly Finding[], root: string): string {
  if (findings.length === 0) {
    return `Validador: nenhum achado em ${sanitize(root)}.`;
  }
  const noun = findings.length === 1 ? 'achado' : 'achados';
  return `Validador: ${findings.length} ${noun} em ${sanitize(root)}.`;
}
