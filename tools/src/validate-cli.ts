// Uso: node tools/dist/src/validate-cli.js [raiz]   (raiz padrão: skills)
// Código de saída: 0 sem achados, 1 com achado, 2 em erro inesperado ou uso errado.
import { formatFinding, formatSummary, sanitize } from './report.js';
import { validateSkillsRoot } from './validate.js';

async function main(args: readonly string[]): Promise<number> {
  if (args.length > 1) {
    console.error('Uso: validate-cli [raiz-das-skills]');
    return 2;
  }
  const root = args[0] ?? 'skills';
  const findings = await validateSkillsRoot(root);
  for (const finding of findings) {
    console.log(formatFinding(finding));
  }
  console.log(formatSummary(findings, root));
  return findings.length === 0 ? 0 : 1;
}

main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    // Fail-closed: qualquer erro inesperado termina com código diferente de zero.
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Erro inesperado no validador: ${sanitize(message)}`);
    process.exitCode = 2;
  },
);
