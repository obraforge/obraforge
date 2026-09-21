// Códigos estáveis das regras do validador (Catálogo · Skills — Spec, §13).
export const RULE_CODES = [
  'ESTRUTURA',
  'NOME',
  'DESCRICAO',
  'METADATA',
  'SCRIPTS',
  'NORMA',
  'AVISO',
  'AGENCIA',
  'LINK',
  'DADO-PESSOAL',
] as const;

export type RuleCode = (typeof RULE_CODES)[number];

export interface Finding {
  code: RuleCode;
  // Caminho relativo à raiz validada, em formato POSIX.
  file: string;
  line?: number;
  message: string;
}
