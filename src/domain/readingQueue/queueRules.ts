import { ConsolidatedReading, QueueFilter, ReadingStatus } from '../reading/types';

export function filterReadings(
  readings: ConsolidatedReading[],
  filter: QueueFilter
): ConsolidatedReading[] {
  if (filter === 'pending') {
    return readings.filter(
      r => r.status === 'PENDING_VERIFICATION' || r.status === 'PENDING_SYNC' || r.status === 'REQUIRES_ATTENTION'
    );
  }
  if (filter === 'submitted') {
    return readings.filter(r => r.status === 'SUBMITTED');
  }
  return readings;
}

export function sortReadingsDesc(readings: ConsolidatedReading[]): ConsolidatedReading[] {
  return [...readings].sort(
    (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime()
  );
}

export function formatReadingStatusLabel(status: ReadingStatus): string {
  switch (status) {
    case 'PENDING_VERIFICATION':
      return 'Pendiente de verificar';
    case 'PENDING_SYNC':
      return 'Pendiente de enviar';
    case 'REQUIRES_ATTENTION':
      return 'Requiere atención';
    case 'SUBMITTED':
      return 'Enviada';
  }
}

export function isReadingEditable(reading: ConsolidatedReading): boolean {
  return reading.status !== 'SUBMITTED';
}

export function applyReadingUpdate(
  original: ConsolidatedReading,
  changes: Partial<ConsolidatedReading>
): ConsolidatedReading {
  if (original.status === 'SUBMITTED') {
    throw new Error('No es posible modificar una lectura ya enviada a la oficina.');
  }

  return {
    ...original,
    ...changes,
    id: original.id,
    meterCode: original.meterCode,
    capturedAt: original.capturedAt,
    updatedAt: new Date().toISOString(),
  };
}

export function getPendingCount(readings: ConsolidatedReading[]): number {
  return readings.filter(r => r.status !== 'SUBMITTED').length;
}
