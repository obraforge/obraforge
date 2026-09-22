#!/usr/bin/env node
// Ponto de entrada do bin `obraforge`. Confere a versão do Node ANTES de carregar o resto da CLI
// (importação dinâmica de main.js), para que um Node abaixo do mínimo receba a mensagem em
// português em vez de um erro de sintaxe vindo de um módulo que ele não sabe interpretar.
import { EXIT_ENVIRONMENT_ERROR } from './exit-codes.js';
import { isSupportedNodeVersion, MINIMUM_NODE_MAJOR } from './node-version.js';

const current = process.versions.node;

if (!isSupportedNodeVersion(current)) {
  console.error(`obraforge exige Node ${MINIMUM_NODE_MAJOR} ou superior; versão atual: ${current}.`);
  process.exitCode = EXIT_ENVIRONMENT_ERROR;
} else {
  const { run } = await import('./main.js');
  process.exitCode = await run(process.argv.slice(2));
}
