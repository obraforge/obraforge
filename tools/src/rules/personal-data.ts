// Regra DADO-PESSOAL: nenhum arquivo de texto da skill traz CPF, CNPJ, e-mail ou telefone que
// possa ser real. A mensagem nunca repete o valor encontrado: a saída vai para log público do CI.
import { isValidCnpj, isValidCpf } from '../br-documents.js';
import type { Finding } from '../findings.js';
import { scanLines } from '../text.js';

// Nenhum dos padrões tem quantificador aninhado sobre o mesmo conjunto; as bordas são lookarounds
// de um caractere, para o número não ser pego no meio de outro.
const CPF = /(?<![\p{L}\p{N}])\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?![\p{L}\p{N}])/gu;
// CNPJ numérico e alfanumérico (12 caracteres em 0-9 ou A-Z e 2 dígitos verificadores).
const CNPJ = /(?<![\p{L}\p{N}])[0-9A-Z]{2}\.?[0-9A-Z]{3}\.?[0-9A-Z]{3}\/?[0-9A-Z]{4}-?\d{2}(?![\p{L}\p{N}])/gu;
// O lookbehind faz a busca começar só no início de uma sequência de caracteres de e-mail, o que
// mantém a varredura linear mesmo numa linha longa sem arroba.
const EMAIL = /(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+)/g;
// Telefone brasileiro: exige DDD entre parênteses ou o prefixo +55, seguido de 8 ou 9 dígitos.
const PHONE = /(?<!\p{N})(?:\+55[\s.-]?\(?\d{2}\)?|\(\d{2}\))[\s.-]?(?:\d[\s.-]?)?\d{4}[\s.-]?\d{4}(?!\p{N})/gu;

const ALLOWED_EMAIL_DOMAINS = ['example.com', 'example.org', 'example.net'];
const TOP_LEVEL_LABEL = /^[a-z][a-z0-9-]*$/;

function isRealEmailDomain(raw: string): boolean {
  // Tira ponto ou hífen de fim de frase ("escreva para a@example.com."), sem regex ancorada no fim,
  // que ficaria quadrática numa sequência longa de pontos.
  let end = raw.length;
  while (end > 0 && (raw[end - 1] === '.' || raw[end - 1] === '-')) {
    end--;
  }
  const domain = raw.slice(0, end).toLowerCase();
  const labels = domain.split('.');
  const top = labels.at(-1) ?? '';
  if (labels.length < 2 || labels.some((label) => label === '') || top.length < 2 || !TOP_LEVEL_LABEL.test(top)) {
    // Não tem forma de domínio (ex.: "obraforge@0.0.1"): não é e-mail.
    return false;
  }
  return !ALLOWED_EMAIL_DOMAINS.some((allowed) => domain === allowed || domain.endsWith(`.${allowed}`));
}

// O único telefone aceito é o fictício, com DDD e número zerados, como (00) 00000-0000.
function isRealPhone(match: string): boolean {
  const digits = match.replace(/\D/g, '');
  const national = match.startsWith('+55') ? digits.slice(2) : digits;
  return !/^0+$/.test(national);
}

// Tira a máscara (pontos, barra e hífen) de um CPF ou CNPJ.
const unmask = (text: string): string => text.replace(/[^0-9A-Z]/g, '');

export function scanPersonalData(file: string, text: string): Finding[] {
  const findings: Finding[] = [];
  scanLines(text).forEach((line, index) => {
    const found = new Set<string>();
    for (const match of line.matchAll(CPF)) {
      if (isValidCpf(unmask(match[0]))) {
        found.add('CPF com dígito verificador válido');
      }
    }
    for (const match of line.matchAll(CNPJ)) {
      if (isValidCnpj(unmask(match[0]))) {
        found.add('CNPJ com dígito verificador válido');
      }
    }
    for (const match of line.matchAll(EMAIL)) {
      if (isRealEmailDomain(match[1] ?? '')) {
        found.add('e-mail fora de example.com, example.org ou example.net');
      }
    }
    for (const match of line.matchAll(PHONE)) {
      if (isRealPhone(match[0])) {
        found.add('telefone diferente do fictício (00) 00000-0000');
      }
    }
    for (const message of found) {
      findings.push({ code: 'DADO-PESSOAL', file, line: index + 1, message });
    }
  });
  return findings;
}
