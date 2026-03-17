export function normalizeBrazilPhone(raw: string): string | null {
  if (!raw) return null;

  // Remove tudo que não for dígito
  const digits = raw.replace(/\D/g, "");

  if (digits.length < 10) {
    return null;
  }

  // Se já vier com DDI 55 (12 ou 13 dígitos)
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  // Se vier sem DDI, mas com DDD + número (10 ou 11 dígitos)
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return null;
}
