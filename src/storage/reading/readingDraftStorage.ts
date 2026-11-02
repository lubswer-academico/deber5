import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReadingDraft, ConsolidatedReading } from '../../domain/reading/types';
import { applyReadingUpdate } from '../../domain/readingQueue/queueRules';

export const DRAFTS_STORAGE_KEY = 'epmaps_reading_drafts_v1';
export const QUEUE_STORAGE_KEY = 'epmaps_pending_readings_queue_v1';

async function getAllDrafts(): Promise<Record<string, ReadingDraft>> {
  try {
    const raw = await AsyncStorage.getItem(DRAFTS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (error) {
    console.error('Error al leer borradores de almacenamiento local:', error);
    return {};
  }
}

export async function saveDraft(draft: ReadingDraft): Promise<void> {
  try {
    const drafts = await getAllDrafts();
    drafts[draft.meterCode] = {
      ...draft,
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
  } catch (error) {
    console.error(`Error al guardar borrador para el medidor ${draft.meterCode}:`, error);
  }
}

export async function getDraft(meterCode: string): Promise<ReadingDraft | null> {
  try {
    const drafts = await getAllDrafts();
    return drafts[meterCode] || null;
  } catch (error) {
    console.error(`Error al obtener borrador para ${meterCode}:`, error);
    return null;
  }
}

export async function clearDraft(meterCode: string): Promise<void> {
  try {
    const drafts = await getAllDrafts();
    if (drafts[meterCode]) {
      delete drafts[meterCode];
      await AsyncStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
    }
  } catch (error) {
    console.error(`Error al limpiar borrador para ${meterCode}:`, error);
  }
}

export async function getPendingReadingsQueue(): Promise<ConsolidatedReading[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (error) {
    console.error('Error al leer cola de lecturas pendientes:', error);
    return [];
  }
}

export async function saveConsolidatedReading(reading: ConsolidatedReading): Promise<void> {
  try {
    const queue = await getPendingReadingsQueue();
    queue.push(reading);
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    await clearDraft(reading.meterCode);
  } catch (error) {
    console.error(`Error al encolar lectura consolidada para ${reading.meterCode}:`, error);
    throw error;
  }
}

export async function getPendingReadingsCount(): Promise<number> {
  try {
    const queue = await getPendingReadingsQueue();
    return queue.filter(r => r.status !== 'SUBMITTED').length;
  } catch (error) {
    console.error('Error al obtener conteo de lecturas pendientes:', error);
    return 0;
  }
}

export async function getReadingById(id: string): Promise<ConsolidatedReading | null> {
  try {
    const queue = await getPendingReadingsQueue();
    const found = queue.find(r => r.id === id);
    return found || null;
  } catch (error) {
    console.error(`Error al obtener lectura con id ${id}:`, error);
    return null;
  }
}

export async function getReadingByMeterCode(meterCode: string): Promise<ConsolidatedReading | null> {
  try {
    const queue = await getPendingReadingsQueue();
    const found = queue.find(r => r.meterCode === meterCode);
    return found || null;
  } catch (error) {
    console.error(`Error al obtener lectura para medidor ${meterCode}:`, error);
    return null;
  }
}

export async function updateConsolidatedReading(updated: ConsolidatedReading): Promise<void> {
  const queue = await getPendingReadingsQueue();
  const index = queue.findIndex(r => r.id === updated.id);

  if (index === -1) {
    throw new Error(`No se encontró la lectura con id ${updated.id} en la cola local.`);
  }

  const existing = queue[index];
  const updatedEntity = applyReadingUpdate(existing, updated);

  queue[index] = updatedEntity;
  await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
}

export async function markReadingAsSubmitted(
  id: string,
  syncedAt: string = new Date().toISOString()
): Promise<void> {
  const queue = await getPendingReadingsQueue();
  const index = queue.findIndex(r => r.id === id);

  if (index === -1) {
    throw new Error(`No se encontró la lectura con id ${id} en la cola local.`);
  }

  queue[index] = {
    ...queue[index],
    status: 'SUBMITTED',
    syncedAt,
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
}

export async function markReadingAsRequiresAttention(
  id: string,
  extra?: Partial<ConsolidatedReading>
): Promise<void> {
  const queue = await getPendingReadingsQueue();
  const index = queue.findIndex(r => r.id === id);

  if (index === -1) {
    throw new Error(`No se encontró la lectura con id ${id} en la cola local.`);
  }

  queue[index] = {
    ...queue[index],
    ...extra,
    status: 'REQUIRES_ATTENTION',
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
}

export async function markReadingAsVerifiedSync(
  id: string,
  extra?: Partial<ConsolidatedReading>
): Promise<void> {
  const queue = await getPendingReadingsQueue();
  const index = queue.findIndex(r => r.id === id);

  if (index === -1) {
    throw new Error(`No se encontró la lectura con id ${id} en la cola local.`);
  }

  queue[index] = {
    ...queue[index],
    ...extra,
    status: 'PENDING_SYNC',
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
}

export async function deleteConsolidatedReading(id: string): Promise<void> {
  const queue = await getPendingReadingsQueue();
  const index = queue.findIndex(r => r.id === id);

  if (index === -1) {
    throw new Error(`No se encontró la lectura con id ${id} en la cola local.`);
  }

  if (queue[index].status === 'SUBMITTED') {
    throw new Error('No es posible eliminar una lectura ya enviada a la oficina.');
  }

  queue.splice(index, 1);
  await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
}


