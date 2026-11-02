import { ConsolidatedReading } from '../domain/reading/types';
import { SyncSingleResult, SyncEngineSummary } from '../domain/sync/types';
import {
  isReadingEligibleForSync,
  evaluateDeferredReading,
  buildCommercialPayload,
} from '../domain/sync/syncRules';
import { officeHttpClient, fetchMeterFromOffice } from './officeApi';
import {
  getPendingReadingsQueue,
  markReadingAsSubmitted,
  markReadingAsRequiresAttention,
  markReadingAsVerifiedSync,
} from '../storage/reading/readingDraftStorage';

export async function syncSingleReading(reading: ConsolidatedReading): Promise<SyncSingleResult> {
  try {
    let readingToSync = reading;

    if (reading.status === 'PENDING_VERIFICATION') {
      const officeMeter = await fetchMeterFromOffice(reading.meterCode);
      const evalResult = evaluateDeferredReading(reading, officeMeter);

      if (evalResult.status === 'REQUIRES_ATTENTION') {
        await markReadingAsRequiresAttention(reading.id, {
          consumption: evalResult.consumption,
          isAnomaly: evalResult.isAnomaly,
          anomalyConfirmed: evalResult.anomalyConfirmed,
          requiresAttentionReason: evalResult.requiresAttentionReason,
        });
        return {
          clientReadingId: reading.id,
          meterCode: reading.meterCode,
          status: 'REQUIRES_ATTENTION',
          errorMessage: evalResult.requiresAttentionReason,
        };
      }

      await markReadingAsVerifiedSync(reading.id, {
        consumption: evalResult.consumption,
        isAnomaly: evalResult.isAnomaly,
        anomalyConfirmed: evalResult.anomalyConfirmed,
        hasNoPreviousData: evalResult.hasNoPreviousData,
      });

      readingToSync = {
        ...reading,
        status: 'PENDING_SYNC',
        consumption: evalResult.consumption,
        isAnomaly: evalResult.isAnomaly,
        anomalyConfirmed: evalResult.anomalyConfirmed,
        hasNoPreviousData: evalResult.hasNoPreviousData,
      };
    }

    const syncedAt = new Date().toISOString();
    const payload = buildCommercialPayload(readingToSync, syncedAt);

    try {
      const response = await officeHttpClient.post('/lecturas', payload);
      if (response.status === 200 || response.status === 201) {
        await markReadingAsSubmitted(reading.id, syncedAt);
        return {
          clientReadingId: reading.id,
          meterCode: reading.meterCode,
          status: 'SUBMITTED',
        };
      }
    } catch (httpError: any) {
      if (httpError?.response?.status === 409) {
        await markReadingAsSubmitted(reading.id, syncedAt);
        return {
          clientReadingId: reading.id,
          meterCode: reading.meterCode,
          status: 'SUBMITTED',
        };
      }
      throw httpError;
    }

    return {
      clientReadingId: reading.id,
      meterCode: reading.meterCode,
      status: 'FAILED',
      errorMessage: 'Respuesta inesperada del servidor de oficina',
    };
  } catch (error: any) {
    return {
      clientReadingId: reading.id,
      meterCode: reading.meterCode,
      status: 'FAILED',
      errorMessage: error?.message || 'Error de comunicación durante la sincronización',
    };
  }
}

export async function syncAllPendingReadings(): Promise<SyncEngineSummary> {
  const queue = await getPendingReadingsQueue();
  const eligibleReadings = queue.filter(isReadingEligibleForSync);

  const summary: SyncEngineSummary = {
    total: eligibleReadings.length,
    sent: 0,
    requiresAttention: 0,
    failed: 0,
  };

  for (const reading of eligibleReadings) {
    const result = await syncSingleReading(reading);

    if (result.status === 'SUBMITTED') {
      summary.sent += 1;
    } else if (result.status === 'REQUIRES_ATTENTION') {
      summary.requiresAttention += 1;
    } else if (result.status === 'FAILED') {
      summary.failed += 1;
      break;
    }
  }

  return summary;
}
