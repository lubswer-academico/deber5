import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { useReadingQueueController } from '../useReadingQueueController';
import * as storage from '../../../storage/reading/readingDraftStorage';
import { ConsolidatedReading } from '../../../domain/reading/types';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

jest.mock('../../../storage/reading/readingDraftStorage');

function renderHookWithRenderer<T>(hookFn: () => T) {
  let result = {} as { current: T };
  function TestComponent() {
    result.current = hookFn();
    return null;
  }
  act(() => {
    ReactTestRenderer.create(React.createElement(TestComponent));
  });
  return { result };
}

describe('useReadingQueueController (Bandeja de Lecturas)', () => {
  const mockQueue: ConsolidatedReading[] = [
    {
      id: 'READ-1',
      meterCode: 'MED-100001',
      condition: 'Normal',
      currentReading: 120,
      capturedAt: '2026-10-25T10:00:00.000Z',
      status: 'PENDING_SYNC',
      isAnomaly: false,
      anomalyConfirmed: false,
      hasNoPreviousData: false,
    },
    {
      id: 'READ-2',
      meterCode: 'MED-100002',
      condition: 'Normal',
      currentReading: 250,
      capturedAt: '2026-10-27T15:30:00.000Z',
      status: 'PENDING_VERIFICATION',
      isAnomaly: false,
      anomalyConfirmed: false,
      hasNoPreviousData: true,
    },
    {
      id: 'READ-3',
      meterCode: 'MED-100003',
      condition: 'Inaccesible',
      inaccessibilityReason: 'Reja con candado',
      capturedAt: '2026-10-26T08:00:00.000Z',
      status: 'SUBMITTED',
      isAnomaly: false,
      anomalyConfirmed: false,
      hasNoPreviousData: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads and sorts queue descending, and calculates pendingCount', async () => {
    (storage.getPendingReadingsQueue as jest.Mock).mockResolvedValueOnce(mockQueue);

    let hookResult: any;
    await act(async () => {
      const { result } = renderHookWithRenderer(() => useReadingQueueController());
      hookResult = result;
    });

    expect(storage.getPendingReadingsQueue).toHaveBeenCalled();
    expect(hookResult.current.isLoading).toBe(false);
    expect(hookResult.current.readings).toHaveLength(3);
    expect(hookResult.current.readings[0].id).toBe('READ-2');
    expect(hookResult.current.readings[1].id).toBe('READ-3');
    expect(hookResult.current.readings[2].id).toBe('READ-1');
    expect(hookResult.current.pendingCount).toBe(2);
  });

  it('filters readings when filter changes', async () => {
    (storage.getPendingReadingsQueue as jest.Mock).mockResolvedValueOnce(mockQueue);

    let hookResult: any;
    await act(async () => {
      const { result } = renderHookWithRenderer(() => useReadingQueueController());
      hookResult = result;
    });

    expect(hookResult.current.filteredReadings).toHaveLength(3);

    act(() => {
      hookResult.current.setFilter('pending');
    });
    expect(hookResult.current.filter).toBe('pending');
    expect(hookResult.current.filteredReadings).toHaveLength(2);
    expect(hookResult.current.filteredReadings.map((r: any) => r.id)).toEqual(['READ-2', 'READ-1']);

    act(() => {
      hookResult.current.setFilter('submitted');
    });
    expect(hookResult.current.filter).toBe('submitted');
    expect(hookResult.current.filteredReadings).toHaveLength(1);
    expect(hookResult.current.filteredReadings[0].id).toBe('READ-3');
  });
});
