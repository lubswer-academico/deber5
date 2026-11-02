import { MeterStatus, MeterValidationResult, MonthlyDuplicateCheckResult } from './types';

const METER_CODE_REGEX = /^MED-\d{6}$/;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export function sanitizeMeterCodeInput(rawInput: string): string {
  if (!rawInput) return '';

  let trimmed = rawInput.trim().toUpperCase();

  if (/^\d+$/.test(trimmed)) {
    return `MED-${trimmed}`;
  }

  if (/^MED\d+$/.test(trimmed)) {
    return `MED-${trimmed.slice(3)}`;
  }

  return trimmed;
}

export function validateMeterCode(code: string): MeterValidationResult {
  if (METER_CODE_REGEX.test(code)) {
    return {
      isValid: true,
      code,
    };
  }

  return {
    isValid: false,
    errorMessage: 'El código debe contener el prefijo MED- seguido de 6 dígitos numéricos.',
  };
}

export function isCacheEntryExpired(cachedAtTimestamp: number, currentTimestamp: number = Date.now()): boolean {
  return currentTimestamp - cachedAtTimestamp > TWENTY_FOUR_HOURS_MS;
}

export function checkMonthlyDuplicate(
  lastReadingDateIso: string | null,
  isSubmitted: boolean,
  currentDate: Date = new Date()
): MonthlyDuplicateCheckResult {
  if (!lastReadingDateIso) {
    return { hasDuplicate: false };
  }

  const readingDate = new Date(lastReadingDateIso);
  if (isNaN(readingDate.getTime())) {
    return { hasDuplicate: false };
  }

  const isSameMonthAndYear =
    readingDate.getUTCFullYear() === currentDate.getUTCFullYear() &&
    readingDate.getUTCMonth() === currentDate.getUTCMonth();

  if (!isSameMonthAndYear) {
    return { hasDuplicate: false };
  }

  if (isSubmitted) {
    return {
      hasDuplicate: true,
      isSubmitted: true,
      message: 'Lectura mensual completada y enviada a oficina. No es posible registrar un nuevo valor este mes.',
    };
  }

  return {
    hasDuplicate: true,
    isSubmitted: false,
    canEditPending: true,
    message: 'Este medidor ya tiene una lectura registrada en este mes.',
  };
}

export function formatMeterStatusLabel(status: MeterStatus | string): string {
  const normalized = String(status || '').trim().toLowerCase();
  switch (normalized) {
    case 'active':
    case 'activo':
      return 'Activo';
    case 'suspended':
    case 'suspendido':
      return 'Suspendido';
    case 'inactive':
    case 'inactivo':
      return 'Inactivo';
    default:
      return status || 'Desconocido';
  }
}
