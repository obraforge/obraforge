// Lista fechada de áreas do catálogo (D-009): 16 da obra e 7 do escritório, na ordem do ciclo de
// vida, mais a transversal `contexto`. Área nova só entra por decisão registrada em docs/adr/.
export const AREAS = [
  'viabilidade',
  'projeto',
  'orcamento',
  'planejamento',
  'licitacao',
  'suprimentos',
  'execucao',
  'sst',
  'qualidade',
  'medicao',
  'financeiro',
  'pessoas',
  'regulatorio',
  'ambiental',
  'bim',
  'pos-obra',
  'comercial',
  'vendas',
  'financeiro-corp',
  'fiscal',
  'rh',
  'regularidade',
  'diretoria',
  'contexto',
] as const;

export type Area = (typeof AREAS)[number];
