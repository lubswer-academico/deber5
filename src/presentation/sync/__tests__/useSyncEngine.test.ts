import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import {
  useSyncEngine,
  runSyncCycle,
  requestBackgroundSync,
  __resetSyncEngineForTests,
} from '../useSyncEngine';
import * as syncService from '../../../services/syncService';
import * as networkMonitor from '../../session/networkMonitor';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

jest.mock('../../../services/syncService');
jest.mock('../../session/networkMonitor');

function renderHookWithRenderer<T>(hookFn: () => T) {
  const result = {} as { current: T };
  function TestComponent() {
    result.current = hookFn();
    return null;
  }
  let renderer: any;
  act(() => {
    renderer = ReactTestRenderer.create(React.createElement(TestComponent));
  });
  return {
    result,
    unmount: () => {
      act(() => {
        renderer.unmount();
      });
    },
  };
}

async function flushPromises() {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}

const OK_SUMMARY = { total: 1, sent: 1, requiresAttention: 0, failed: 0 };
const FAILED_SUMMARY = { total: 1, sent: 0, requiresAttention: 0, failed: 1 };

describe('useSyncEngine - Sincronización automática desatendida (HU-005 Escenario 1)', () => {
  const mockSyncService = syncService as jest.Mocked<typeof syncService>;
  const mockNetworkMonitor = networkMonitor as jest.Mocked<typeof networkMonitor>;

  let networkListener: (isConnected: boolean | null) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    __resetSyncEngineForTests();

    mockNetworkMonitor.subscribeToNetworkStatus.mockImplementation((callback) => {
      networkListener = callback;
      return jest.fn();
    });
    mockNetworkMonitor.fetchCurrentNetworkStatus.mockResolvedValue(true);
    mockSyncService.syncAllPendingReadings.mockResolvedValue(OK_SUMMARY);
  });

  afterEach(() => {
    __resetSyncEngineForTests();
    jest.useRealTimers();
  });

  it('inicializa con estado inactivo (isSyncing: false, error: null)', () => {
    const { result } = renderHookWithRenderer(() => useSyncEngine());

    expect(result.current.isSyncing).toBe(false);
    expect(result.current.syncError).toBeNull();
    expect(result.current.syncSummary).toBeNull();
  });

  it('ejecuta syncAllPendingReadings al invocar runSyncCycle()', async () => {
    renderHookWithRenderer(() => useSyncEngine());

    await act(async () => {
      await runSyncCycle();
      await flushPromises();
    });

    expect(mockSyncService.syncAllPendingReadings).toHaveBeenCalledTimes(1);
  });

  it('dispara automáticamente ante la transición de offline a online', async () => {
    renderHookWithRenderer(() => useSyncEngine());

    act(() => {
      networkListener(false);
    });
    expect(mockSyncService.syncAllPendingReadings).not.toHaveBeenCalled();

    await act(async () => {
      networkListener(true);
      await flushPromises();
    });

    expect(mockSyncService.syncAllPendingReadings).toHaveBeenCalledTimes(1);
  });

  it('dispara automáticamente al arrancar si el primer estado de red ya es online (app abierta con señal y pendientes)', async () => {
    renderHookWithRenderer(() => useSyncEngine());

    await act(async () => {
      networkListener(true);
      await flushPromises();
    });

    expect(mockSyncService.syncAllPendingReadings).toHaveBeenCalledTimes(1);
  });

  it('no vuelve a disparar ante eventos online repetidos sin un corte intermedio', async () => {
    renderHookWithRenderer(() => useSyncEngine());

    await act(async () => {
      networkListener(true);
      await flushPromises();
      networkListener(true);
      networkListener(true);
      await flushPromises();
    });

    expect(mockSyncService.syncAllPendingReadings).toHaveBeenCalledTimes(1);
  });

  it('mantiene una única suscripción de red y un único envío aunque haya varias pantallas montadas', async () => {
    renderHookWithRenderer(() => useSyncEngine()); 
    renderHookWithRenderer(() => useSyncEngine()); 

    expect(mockNetworkMonitor.subscribeToNetworkStatus).toHaveBeenCalledTimes(1);

    await act(async () => {
      networkListener(false);
      networkListener(true);
      await flushPromises();
    });

    expect(mockSyncService.syncAllPendingReadings).toHaveBeenCalledTimes(1);
  });

  it('mutex compartido: nunca ejecuta dos ciclos de envío en paralelo entre instancias', async () => {
    let concurrent = 0;
    let maxConcurrent = 0;
    mockSyncService.syncAllPendingReadings.mockImplementation(async () => {
      concurrent += 1;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await flushPromises();
      concurrent -= 1;
      return OK_SUMMARY;
    });

    renderHookWithRenderer(() => useSyncEngine());
    renderHookWithRenderer(() => useSyncEngine());

    await act(async () => {
      await Promise.all([runSyncCycle(), runSyncCycle()]);
    });

    expect(maxConcurrent).toBe(1);
  });

  it('reintenta automáticamente con espera si un envío falla estando online (DNS/microcorte tras reconectar)', async () => {
    jest.useFakeTimers();
    mockSyncService.syncAllPendingReadings
      .mockResolvedValueOnce(FAILED_SUMMARY)
      .mockResolvedValueOnce(OK_SUMMARY);

    renderHookWithRenderer(() => useSyncEngine());

    await act(async () => {
      networkListener(true);
      await flushPromises();
    });
    expect(mockSyncService.syncAllPendingReadings).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(5000);
      await flushPromises();
    });

    expect(mockSyncService.syncAllPendingReadings).toHaveBeenCalledTimes(2);
  });

  it('cancela el reintento programado si se pierde la conexión', async () => {
    jest.useFakeTimers();
    mockSyncService.syncAllPendingReadings.mockResolvedValue(FAILED_SUMMARY);

    renderHookWithRenderer(() => useSyncEngine());

    await act(async () => {
      networkListener(true);
      await flushPromises();
    });

    act(() => {
      networkListener(false);
    });

    await act(async () => {
      jest.advanceTimersByTime(60000);
      await flushPromises();
    });

    expect(mockSyncService.syncAllPendingReadings).toHaveBeenCalledTimes(1);
  });

  it('requestBackgroundSync() envía de inmediato una lectura recién guardada si hay señal', async () => {
    renderHookWithRenderer(() => useSyncEngine());

    await act(async () => {
      requestBackgroundSync();
      await flushPromises();
    });

    expect(mockSyncService.syncAllPendingReadings).toHaveBeenCalledTimes(1);
  });

  it('requestBackgroundSync() no hace nada ni muestra error si no hay señal (queda en cola)', async () => {
    mockNetworkMonitor.fetchCurrentNetworkStatus.mockResolvedValue(false);
    const { result } = renderHookWithRenderer(() => useSyncEngine());

    await act(async () => {
      requestBackgroundSync();
      await flushPromises();
    });

    expect(mockSyncService.syncAllPendingReadings).not.toHaveBeenCalled();
    expect(result.current.syncError).toBeNull();
  });

  it('notifica onSyncComplete a la pantalla aunque el ciclo lo haya disparado otra instancia', async () => {
    const onComplete = jest.fn();
    renderHookWithRenderer(() => useSyncEngine()); 
    renderHookWithRenderer(() => useSyncEngine(onComplete)); 

    await act(async () => {
      networkListener(true);
      await flushPromises();
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('no intenta sincronizar si se dispara runSyncCycle() estando sin conexión', async () => {
    mockNetworkMonitor.fetchCurrentNetworkStatus.mockResolvedValue(false);
    const { result } = renderHookWithRenderer(() => useSyncEngine());

    await act(async () => {
      await runSyncCycle();
      await flushPromises();
    });

    expect(mockSyncService.syncAllPendingReadings).not.toHaveBeenCalled();
    expect(result.current.syncError).toContain('Sin conexión');
  });
});
