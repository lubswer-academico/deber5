import { ConsolidatedReading, OfficeSyncPayload } from '../reading/types';
import { MeterRecord } from '../meter/types';
import { DeferredEvaluationResult } from './types';

export function isReadingEligibleForSync(reading: ConsolidatedReading): boolean {
  return reading.status === 'PENDING_SYNC' || reading.status === 'PENDING_VERIFICATION';
}

export function evaluateDeferredReading(
  reading: ConsolidatedReading,
  officeMeter: MeterRecord | null
): DeferredEvaluationResult {
  if (!officeMeter) {
    return {
      status: 'REQUIRES_ATTENTION',
      consumption: null,
      isAnomaly: false,
      anomalyConfirmed: false,
      hasNoPreviousData: true,
      requiresAttentionReason: 'Medidor inexistente en catastro',
    };
  }

  if (reading.condition === 'Inaccesible' || reading.currentReading == null) {
    return {
      status: 'PENDING_SYNC',
      consumption: null,
      isAnomaly: false,
      anomalyConfirmed: reading.anomalyConfirmed ?? false,
      hasNoPreviousData: officeMeter.lastReading?.value == null,
    };
  }

  if (officeMeter.lastReading?.value == null || officeMeter.averageConsumption == null) {
    return {
      status: 'PENDING_SYNC',
      consumption: null,
      isAnomaly: false,
      anomalyConfirmed: false,
      hasNoPreviousData: true,
    };
  }

  const previousReading = officeMeter.lastReading.value;
  const averageConsumption = officeMeter.averageConsumption;

  if (reading.currentReading < previousReading) {
    return {
      status: 'REQUIRES_ATTENTION',
      consumption: null,
      isAnomaly: false,
      anomalyConfirmed: false,
      hasNoPreviousData: false,
      requiresAttentionReason:
        'Incongruencia física: la lectura actual es inferior a la última registrada en oficina.',
    };
  }

  const consumption = reading.currentReading - previousReading;
  const isAnomaly = consumption > 3 * averageConsumption;

  if (isAnomaly) {
    if (reading.photoUri && reading.anomalyConfirmed) {
      return {
        status: 'PENDING_SYNC',
        consumption,
        isAnomaly: true,
        anomalyConfirmed: true,
        hasNoPreviousData: false,
      };
    }

    return {
      status: 'REQUIRES_ATTENTION',
      consumption,
      isAnomaly: true,
      anomalyConfirmed: false,
      hasNoPreviousData: false,
      requiresAttentionReason:
        'Lectura con consumo superior a 3 veces el promedio mensual (anomalía no confirmada). Requiere fotografía y confirmación.',
    };
  }

  return {
    status: 'PENDING_SYNC',
    consumption,
    isAnomaly: false,
    anomalyConfirmed: false,
    hasNoPreviousData: false,
  };
}

export function buildCommercialPayload(
  reading: ConsolidatedReading,
  syncedAt: string = new Date().toISOString()
): OfficeSyncPayload {
  return {
    clientReadingId: reading.id,
    meterCode: reading.meterCode,
    condition: reading.condition,
    ...(reading.inaccessibilityReason ? { inaccessibilityReason: reading.inaccessibilityReason } : {}),
    ...(reading.damageDescription ? { damageDescription: reading.damageDescription } : {}),
    currentReading: reading.currentReading ?? null,
    consumption: reading.consumption ?? null,
    isAnomaly: reading.isAnomaly,
    anomalyConfirmed: reading.anomalyConfirmed,
    ...(reading.photoUri ? { localPhotoUri: reading.photoUri } : {}),
    capturedAt: reading.capturedAt,
    syncedAt,
  };
}
