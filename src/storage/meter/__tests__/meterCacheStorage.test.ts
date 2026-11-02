import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveMeterToCache,
  getMeterFromCache,
  purgeExpiredCache,
  clearMeterCache,
  METER_CACHE_STORAGE_KEY,
} from '../meterCacheStorage';
import { MeterRecord } from '@/domain/meter/types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('meterCacheStorage - Persistencia Directa de Jornada', () => {
  const mockMeter1: MeterRecord = {
    code: 'MED-100201',
    address: 'Av. 10 de Agosto N24-150',
    sector: 'Mariscal Sucre',
    accountNumber: 'CTA-884920',
    status: 'active',
    lastReading: {
      value: 1245,
      date: '2026-09-15T08:30:00.000Z',
    },
    averageConsumption: 18,
  };

  const mockMeter2: MeterRecord = {
    code: 'MED-100202',
    address: 'Calle Guayaquil S4-80',
    sector: 'Centro Histórico',
    accountNumber: 'CTA-339210',
    status: 'active',
    lastReading: {
      value: 450,
      date: '2026-09-10T11:00:00.000Z',
    },
    averageConsumption: 12,
  };

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('debe guardar un medidor en caché y recuperarlo fielmente', async () => {
    await saveMeterToCache(mockMeter1);
    const cached = await getMeterFromCache('MED-100201');

    expect(cached).toEqual(mockMeter1);
  });

  it('debe retornar null cuando el medidor no se encuentra en el caché', async () => {
    const cached = await getMeterFromCache('MED-999999');
    expect(cached).toBeNull();
  });

  it('debe descartar y retornar null si la entrada de caché supera las 24 horas (expirada)', async () => {
    const expiredTimestamp = Date.now() - (25 * 60 * 60 * 1000); 
    const cacheMap = {
      'MED-100201': {
        record: mockMeter1,
        cachedAt: expiredTimestamp,
      },
    };
    await AsyncStorage.setItem(METER_CACHE_STORAGE_KEY, JSON.stringify(cacheMap));

    const cached = await getMeterFromCache('MED-100201');
    expect(cached).toBeNull();
  });

  it('debe purgar únicamente las entradas mayores a 24 horas con purgeExpiredCache', async () => {
    const now = Date.now();
    const expiredTimestamp = now - (25 * 60 * 60 * 1000); 
    const freshTimestamp = now - (2 * 60 * 60 * 1000);   

    const cacheMap = {
      'MED-100201': {
        record: mockMeter1,
        cachedAt: expiredTimestamp,
      },
      'MED-100202': {
        record: mockMeter2,
        cachedAt: freshTimestamp,
      },
    };
    await AsyncStorage.setItem(METER_CACHE_STORAGE_KEY, JSON.stringify(cacheMap));

    await purgeExpiredCache();

    const meter1 = await getMeterFromCache('MED-100201');
    const meter2 = await getMeterFromCache('MED-100202');

    expect(meter1).toBeNull();
    expect(meter2).toEqual(mockMeter2);
  });

  it('debe vaciar completamente el caché con clearMeterCache', async () => {
    await saveMeterToCache(mockMeter1);
    await saveMeterToCache(mockMeter2);

    expect(await getMeterFromCache('MED-100201')).not.toBeNull();
    expect(await getMeterFromCache('MED-100202')).not.toBeNull();

    await clearMeterCache();

    expect(await getMeterFromCache('MED-100201')).toBeNull();
    expect(await getMeterFromCache('MED-100202')).toBeNull();
  });

  it('debe recuperarse de JSON corrupto de forma defensiva purgando la clave y retornando null', async () => {
    await AsyncStorage.setItem(METER_CACHE_STORAGE_KEY, 'corrupted-json-data{{{');

    const result = await getMeterFromCache('MED-100201');
    expect(result).toBeNull();

    const rawStored = await AsyncStorage.getItem(METER_CACHE_STORAGE_KEY);
    expect(rawStored).toBeNull();
  });
});
