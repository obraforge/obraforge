// Dígitos verificadores de CPF e CNPJ (módulo 11).

// Resto 0 ou 1 dá dígito 0; senão, 11 menos o resto.
function mod11Digit(sum: number): number {
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

function allSame(value: string): boolean {
  return [...value].every((char) => char === value[0]);
}

// `digits`: exatamente 11 dígitos, sem máscara. Sequência de um dígito só (ex.: 00000000000)
// passa no cálculo mas não é documento real, e aqui conta como inválida.
export function isValidCpf(digits: string): boolean {
  if (!/^\d{11}$/.test(digits) || allSame(digits)) {
    return false;
  }
  const values = [...digits].map(Number);
  const dv = (length: number): number => {
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += (values[i] ?? 0) * (length + 1 - i);
    }
    return mod11Digit(sum);
  };
  return dv(9) === values[9] && dv(10) === values[10];
}

// `chars`: 14 caracteres sem máscara, os 12 primeiros em 0-9 ou A-Z e os 2 últimos em dígito.
// Cobre o CNPJ numérico e o alfanumérico: o valor de cada caractere é o código ASCII menos 48,
// com pesos de 2 a 9 da direita para a esquerda, recomeçando depois do oitavo. Fonte: Receita
// Federal, "Perguntas e Respostas — CNPJ Alfanumérico", pergunta 14, e Serpro, "Cálculo dos
// dígitos verificadores de CNPJ alfanumérico".
export function isValidCnpj(chars: string): boolean {
  if (!/^[0-9A-Z]{12}\d{2}$/.test(chars) || allSame(chars)) {
    return false;
  }
  const values = [...chars].map((char) => char.charCodeAt(0) - 48);
  const dv = (length: number): number => {
    let sum = 0;
    for (let i = 0; i < length; i++) {
      const weight = ((length - 1 - i) % 8) + 2;
      sum += (values[i] ?? 0) * weight;
    }
    return mod11Digit(sum);
  };
  return dv(12) === values[12] && dv(13) === values[13];
}
