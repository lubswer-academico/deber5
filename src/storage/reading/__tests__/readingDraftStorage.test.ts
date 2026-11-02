import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveDraft,
  getDraft,
  clearDraft,
  saveConsolidatedReading,
  getPendingReadingsCount,
  getPendingReadingsQueue,
  getReadingById,
  getReadingByMeterCode,
  updateConsolidatedReading,
  deleteConsolidatedReading,
  markReadingAsSubmitted,
  markReadingAsRequiresAttention,
  markReadingAsVerifiedSync,
} from '../readingDraftStorage';
import { ReadingDraft, ConsolidatedReading } from '../../../domain/reading/types';

jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn(async (key: string) => store[key] || null),
    setItem: jest.fn(async (key: string, val: string) => {
      store[key] = val;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete store[key];
    }),
    clear: jest.fn(async () => {
      store = {};
    }),
  };
});

describe('Reading Draft & Queue Storage (readingDraftStorage)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  const mockDraft: ReadingDraft = {
    meterCode: 'MED-123456',
    condition: 'Normal',
    currentReading: 120,
    previousReading: 100,
    averageConsumption: 20,
    hasNoPreviousData: false,
    consumption: 20,
    isAnomaly: false,
    anomalyConfirmed: false,
    photoUri: null,
    currentStep: 2,
    createdAt: '2026-10-28T10:00:00Z',
    updatedAt: '2026-10-28T10:05:00Z',
  };

  it('saves draft and retrieves it successfully', async () => {
    await saveDraft(mockDraft);
    const retrieved = await getDraft('MED-123456');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.meterCode).toBe('MED-123456');
    expect(retrieved?.currentReading).toBe(120);
    expect(retrieved?.currentStep).toBe(2);
  });

  it('returns null when draft does not exist', async () => {
    const retrieved = await getDraft('MED-999999');
    expect(retrieved).toBeNull();
  });

  it('clears draft specifically for a meter', async () => {
    await saveDraft(mockDraft);
    await clearDraft('MED-123456');
    const retrieved = await getDraft('MED-123456');
    expect(retrieved).toBeNull();
  });

  it('saves consolidated reading into queue, increments count and removes draft', async () => {
    await saveDraft(mockDraft);

    const consolidated: ConsolidatedReading = {
      id: 'READING-1',
      meterCode: 'MED-123456',
      condition: 'Normal',
      currentReading: 120,
      previousReading: 100,
      averageConsumption: 20,
      consumption: 20,
      isAnomaly: false,
      anomalyConfirmed: false,
      photoUri: null,
      hasNoPreviousData: false,
      capturedAt: '2026-10-28T10:10:00Z',
      status: 'PENDING_SYNC',
    };

    expect(await getPendingReadingsCount()).toBe(0);

    await saveConsolidatedReading(consolidated);

    expect(await getPendingReadingsCount()).toBe(1);
    const draft = await getDraft('MED-123456');
    expect(draft).toBeNull(); 

    const queue = await getPendingReadingsQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].meterCode).toBe('MED-123456');
  });

  it('accumulates multiple consolidated readings in queue', async () => {
    const reading1: ConsolidatedReading = {
      id: 'READING-1',
      meterCode: 'MED-111111',
      condition: 'Normal',
      currentReading: 50,
      capturedAt: '2026-10-28T10:00:00Z',
      status: 'PENDING_SYNC',
      isAnomaly: false,
      anomalyConfirmed: false,
      hasNoPreviousData: false,
    };
    const reading2: ConsolidatedReading = {
      id: 'READING-2',
      meterCode: 'MED-222222',
      condition: 'Inaccesible',
      inaccessibilityReason: 'Perro bravo',
      capturedAt: '2026-10-28T10:15:00Z',
      status: 'PENDING_SYNC',
      isAnomaly: false,
      anomalyConfirmed: false,
      hasNoPreviousData: false,
    };

    await saveConsolidatedReading(reading1);
    await saveConsolidatedReading(reading2);

    expect(await getPendingReadingsCount()).toBe(2);
    const queue = await getPendingReadingsQueue();
    expect(queue).toHaveLength(2);
    expect(queue[1].inaccessibilityReason).toBe('Perro bravo');
  });

  describe('Queue query and in-place update (Spec 004)', () => {
    const reading1: ConsolidatedReading = {
      id: 'READ-1',
      meterCode: 'MED-111111',
      condition: 'Normal',
      currentReading: 50,
      capturedAt: '2026-10-28T10:00:00Z',
      status: 'PENDING_SYNC',
      isAnomaly: false,
      anomalyConfirmed: false,
      hasNoPreviousData: false,
    };
    const reading2: ConsolidatedReading = {
      id: 'READ-2',
      meterCode: 'MED-222222',
      condition: 'Inaccesible',
      inaccessibilityReason: 'Perro bravo',
      capturedAt: '2026-10-28T10:15:00Z',
      status: 'SUBMITTED',
      isAnomaly: false,
      anomalyConfirmed: false,
      hasNoPreviousData: false,
    };

    beforeEach(async () => {
      await saveConsolidatedReading(reading1);
      await saveConsolidatedReading(reading2);
    });

    it('retrieves reading by id', async () => {
      const found = await getReadingById('READ-1');
      expect(found).not.toBeNull();
      expect(found?.meterCode).toBe('MED-111111');

      const notFound = await getReadingById('NON_EXISTENT');
      expect(notFound).toBeNull();
    });

    it('retrieves reading by meterCode', async () => {
      const found = await getReadingByMeterCode('MED-222222');
      expect(found).not.toBeNull();
      expect(found?.id).toBe('READ-2');

      const notFound = await getReadingByMeterCode('MED-999999');
      expect(notFound).toBeNull();
    });

    it('updates reading in-place preserving id, original position, and throws if non-existent or SUBMITTED', async () => {
      const updatedReading1: ConsolidatedReading = {
        ...reading1,
        currentReading: 65,
        consumption: 15,
      };

      await updateConsolidatedReading(updatedReading1);

      const queue = await getPendingReadingsQueue();
      expect(queue).toHaveLength(2);
      expect(queue[0].id).toBe('READ-1');
      expect(queue[0].currentReading).toBe(65);
      expect(queue[1].id).toBe('READ-2'); 

      await expect(
        updateConsolidatedReading({ ...reading1, id: 'GHOST-ID' })
      ).rejects.toThrow('No se encontró la lectura con id GHOST-ID en la cola local.');

      await expect(
        updateConsolidatedReading({ ...reading2, inaccessibilityReason: 'Reja cerrada' })
      ).rejects.toThrow('No es posible modificar una lectura ya enviada a la oficina.');
    });

    it('updates status atomically to SUBMITTED and assigns syncedAt', async () => {
      await markReadingAsSubmitted('READ-1', '2026-10-28T12:00:00.000Z');
      const reading = await getReadingById('READ-1');
      expect(reading?.status).toBe('SUBMITTED');
      expect(reading?.syncedAt).toBe('2026-10-28T12:00:00.000Z');
    });

    it('updates status atomically to REQUIRES_ATTENTION with recalculated values', async () => {
      await markReadingAsRequiresAttention('READ-1', {
        consumption: 150,
        isAnomaly: true,
      });
      const reading = await getReadingById('READ-1');
      expect(reading?.status).toBe('REQUIRES_ATTENTION');
      expect(reading?.consumption).toBe(150);
      expect(reading?.isAnomaly).toBe(true);
    });

    it('updates status to PENDING_SYNC when verified diferred', async () => {
      await markReadingAsVerifiedSync('READ-1', {
        consumption: 20,
        isAnomaly: false,
      });
      const reading = await getReadingById('READ-1');
      expect(reading?.status).toBe('PENDING_SYNC');
      expect(reading?.consumption).toBe(20);
    });

    it('elimina una lectura editable de la cola y preserva las demás', async () => {
      await deleteConsolidatedReading('READ-1');
      const queue = await getPendingReadingsQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe('READ-2');
    });

    it('impide eliminar una lectura en estado SUBMITTED', async () => {
      await expect(deleteConsolidatedReading('READ-2')).rejects.toThrow(
        'No es posible eliminar una lectura ya enviada a la oficina.'
      );
    });

    it('returns only pending count excluding SUBMITTED', async () => {
      expect(await getPendingReadingsCount()).toBe(1); 
      await markReadingAsSubmitted('READ-1');
      expect(await getPendingReadingsCount()).toBe(0); 
    });
  });
});
