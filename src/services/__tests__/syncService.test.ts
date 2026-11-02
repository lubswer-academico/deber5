import { ConsolidatedReading } from '../../domain/reading/types';
import { MeterRecord } from '../../domain/meter/types';
import * as officeApi from '../officeApi';
import * as storage from '../../storage/reading/readingDraftStorage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('../officeApi');
jest.mock('../../storage/reading/readingDraftStorage');

import { syncSingleReading, syncAllPendingReadings } from '../syncService';

describe('syncService - Despacho HTTP e Idempotencia con MockAPI (TDD)', () => {
  const mockOfficeApi = officeApi as jest.Mocked<typeof officeApi>;
  const mockStorage = storage as jest.Mocked<typeof storage>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseReading: ConsolidatedReading = {
    id: 'client-reading-uuid-1',
    meterCode: 'MED-123456',
    condition: 'Normal',
    currentReading: 120,
    previousReading: 100,
    averageConsumption: 20,
    consumption: 20,
    isAnomaly: false,
    anomalyConfirmed: false,
    photoUri: 'file:///data/photo.jpg',
    hasNoPreviousData: false,
    capturedAt: '2026-10-28T10:00:00.000Z',
    status: 'PENDING_SYNC',
  };

  const sampleMeterRecord: MeterRecord = {
    code: 'MED-123456',
    address: 'Av. 10 de Agosto',
    sector: 'Mariscal',
    accountNumber: '87654321',
    status: 'active',
    lastReading: { value: 100, date: '2026-09-25T10:00:00Z' },
    averageConsumption: 20,
  };

  describe('syncSingleReading', () => {
    it('envía directamente a /lecturas si la lectura ya está en PENDING_SYNC y marca SUBMITTED en 200/201', async () => {
      mockOfficeApi.officeHttpClient.post = jest.fn().mockResolvedValueOnce({
        status: 201,
        data: { id: 'remote-id-1', clientReadingId: 'client-reading-uuid-1' },
      });

      const result = await syncSingleReading(baseReading);

      expect(result.status).toBe('SUBMITTED');
      expect(mockOfficeApi.officeHttpClient.post).toHaveBeenCalledWith(
        '/lecturas',
        expect.objectContaining({
          clientReadingId: 'client-reading-uuid-1',
          meterCode: 'MED-123456',
          currentReading: 120,
          localPhotoUri: 'file:///data/photo.jpg',
        })
      );
      expect(mockStorage.markReadingAsSubmitted).toHaveBeenCalledWith(
        'client-reading-uuid-1',
        expect.any(String)
      );
    });

    it('si está en PENDING_VERIFICATION, consulta medidor en oficina y si es normal, actualiza y despacha a /lecturas', async () => {
      const pendingVerificationReading: ConsolidatedReading = {
        ...baseReading,
        id: 'client-reading-uuid-2',
        previousReading: null,
        averageConsumption: null,
        consumption: null,
        hasNoPreviousData: true,
        status: 'PENDING_VERIFICATION',
      };

      mockOfficeApi.fetchMeterFromOffice = jest.fn().mockResolvedValueOnce(sampleMeterRecord);
      mockOfficeApi.officeHttpClient.post = jest.fn().mockResolvedValueOnce({
        status: 201,
        data: { id: 'remote-id-2' },
      });

      const result = await syncSingleReading(pendingVerificationReading);

      expect(mockOfficeApi.fetchMeterFromOffice).toHaveBeenCalledWith('MED-123456');
      expect(mockStorage.markReadingAsVerifiedSync).toHaveBeenCalledWith(
        'client-reading-uuid-2',
        expect.objectContaining({
          consumption: 20,
          isAnomaly: false,
        })
      );
      expect(result.status).toBe('SUBMITTED');
      expect(mockStorage.markReadingAsSubmitted).toHaveBeenCalled();
    });

    it('si está en PENDING_VERIFICATION y resulta anómala sin foto previa, marca REQUIRES_ATTENTION y detiene el envío', async () => {
      const pendingVerificationReading: ConsolidatedReading = {
        ...baseReading,
        id: 'client-reading-uuid-3',
        currentReading: 200, // Consumo = 200 - 100 = 100 > 3*20 (Anomalía)
        previousReading: null,
        averageConsumption: null,
        consumption: null,
        hasNoPreviousData: true,
        photoUri: null,
        anomalyConfirmed: false,
        status: 'PENDING_VERIFICATION',
      };

      mockOfficeApi.fetchMeterFromOffice = jest.fn().mockResolvedValueOnce(sampleMeterRecord);

      const result = await syncSingleReading(pendingVerificationReading);

      expect(result.status).toBe('REQUIRES_ATTENTION');
      expect(mockStorage.markReadingAsRequiresAttention).toHaveBeenCalledWith(
        'client-reading-uuid-3',
        expect.objectContaining({
          consumption: 100,
          isAnomaly: true,
        })
      );
      expect(mockOfficeApi.officeHttpClient.post).not.toHaveBeenCalled();
    });

    it('si está en PENDING_VERIFICATION y el medidor NO existe en catastro (null), marca REQUIRES_ATTENTION y detiene el envío', async () => {
      const pendingVerificationReading: ConsolidatedReading = {
        ...baseReading,
        meterCode: 'MED-999999',
        id: 'client-reading-uuid-nonexistent',
        previousReading: null,
        averageConsumption: null,
        consumption: null,
        hasNoPreviousData: true,
        status: 'PENDING_VERIFICATION',
      };

      mockOfficeApi.fetchMeterFromOffice = jest.fn().mockResolvedValueOnce(null);

      const result = await syncSingleReading(pendingVerificationReading);

      expect(result.status).toBe('REQUIRES_ATTENTION');
      expect(mockStorage.markReadingAsRequiresAttention).toHaveBeenCalledWith(
        'client-reading-uuid-nonexistent',
        expect.objectContaining({
          requiresAttentionReason: 'Medidor inexistente en catastro',
        })
      );
      expect(mockOfficeApi.officeHttpClient.post).not.toHaveBeenCalled();
    });

    it('maneja idempotencia si MockAPI responde que la lectura ya existe (409 o mensaje existente) marcando SUBMITTED', async () => {
      mockOfficeApi.officeHttpClient.post = jest.fn().mockRejectedValueOnce({
        response: {
          status: 409,
          data: 'Lectura ya registrada con ese clientReadingId',
        },
      });

      const result = await syncSingleReading(baseReading);

      expect(result.status).toBe('SUBMITTED');
      expect(mockStorage.markReadingAsSubmitted).toHaveBeenCalledWith(baseReading.id, expect.any(String));
    });

    it('retorna FAILED y lanza/captura error si hay falla de red (timeout / 500)', async () => {
      mockOfficeApi.officeHttpClient.post = jest.fn().mockRejectedValueOnce(new Error('Network Error'));

      const result = await syncSingleReading(baseReading);

      expect(result.status).toBe('FAILED');
      expect(result.errorMessage).toBe('Network Error');
      expect(mockStorage.markReadingAsSubmitted).not.toHaveBeenCalled();
    });
  });

  describe('syncAllPendingReadings', () => {
    it('procesa secuencialmente todas las lecturas elegibles y retorna el resumen', async () => {
      const reading1 = { ...baseReading, id: 'read-1' };
      const reading2 = { ...baseReading, id: 'read-2', status: 'REQUIRES_ATTENTION' as const };
      const reading3 = { ...baseReading, id: 'read-3' };

      mockStorage.getPendingReadingsQueue = jest.fn().mockResolvedValueOnce([reading1, reading2, reading3]);
      mockOfficeApi.officeHttpClient.post = jest.fn().mockResolvedValue({ status: 201, data: {} });

      const summary = await syncAllPendingReadings();

      expect(summary.total).toBe(2); 
      expect(summary.sent).toBe(2);
      expect(summary.failed).toBe(0);
      expect(mockStorage.markReadingAsSubmitted).toHaveBeenCalledTimes(2);
    });

    it('se detiene si ocurre un error de red durante la sincronización para no saturar reintentos', async () => {
      const reading1 = { ...baseReading, id: 'read-1' };
      const reading2 = { ...baseReading, id: 'read-2' };

      mockStorage.getPendingReadingsQueue = jest.fn().mockResolvedValueOnce([reading1, reading2]);
      mockOfficeApi.officeHttpClient.post = jest.fn().mockRejectedValueOnce(new Error('Microcorte de red'));

      const summary = await syncAllPendingReadings();

      expect(summary.total).toBe(2);
      expect(summary.sent).toBe(0);
      expect(summary.failed).toBe(1);
      expect(mockOfficeApi.officeHttpClient.post).toHaveBeenCalledTimes(1);
    });
  });
});
