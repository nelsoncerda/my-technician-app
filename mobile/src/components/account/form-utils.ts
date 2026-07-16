import { ApiError } from '@/lib/api';

export type FieldErrors<Field extends string> = Partial<Record<Field, string>>;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function formatDominicanPhone(value: string): string {
  const rawDigits = value.replace(/\D/g, '');
  const digits = (rawDigits.length === 11 && rawDigits.startsWith('1')
    ? rawDigits.slice(1)
    : rawDigits
  ).slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function getAuthErrorMessage(
  error: unknown,
  fallback = 'No pudimos completar la solicitud. Inténtalo de nuevo.'
): string {
  if (error instanceof ApiError) {
    const normalized = error.message.toLowerCase();
    if (normalized.includes('invalid credentials')) {
      return 'El correo o la contraseña no son correctos.';
    }
    if (normalized.includes('user already exists')) {
      return 'Ya existe una cuenta con este correo electrónico.';
    }
    if (error.status === 0) {
      return 'No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo.';
    }
    return error.message || fallback;
  }

  return error instanceof Error && error.message ? error.message : fallback;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
