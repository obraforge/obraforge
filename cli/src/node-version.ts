// Node mínimo suportado pela CLI (engines.node em cli/package.json e no ADR-0002).
export const MINIMUM_NODE_MAJOR = 22;

// Fail-closed: qualquer string que não comece com "<major>.<minor>.<patch>" é recusada, em vez de
// assumida como compatível.
export function isSupportedNodeVersion(version: string): boolean {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (match === null) {
    return false;
  }
  const major = Number(match[1]);
  return Number.isInteger(major) && major >= MINIMUM_NODE_MAJOR;
}
