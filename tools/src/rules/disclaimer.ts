// Regra AVISO: o corpo do SKILL.md traz o aviso-padrão como linha inteira.
import { AVISO_PADRAO } from '../constants.js';
import type { Finding } from '../findings.js';

const EXPECTED = AVISO_PADRAO.normalize('NFC');

// Comparação depois de trim e de normalização NFC (texto canonicamente igual conta como igual).
export function hasDisclaimer(body: readonly string[]): boolean {
  return body.some((line) => line.trim().normalize('NFC') === EXPECTED);
}

export function checkDisclaimer(skillDir: string, body: readonly string[]): Finding[] {
  if (hasDisclaimer(body)) {
    return [];
  }
  return [
    {
      code: 'AVISO',
      file: `${skillDir}/SKILL.md`,
      message: 'o corpo não contém, como linha inteira, o aviso-padrão do template (docs/template-skill/SKILL.md)',
    },
  ];
}
