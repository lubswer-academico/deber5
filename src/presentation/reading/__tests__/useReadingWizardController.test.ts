import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { useReadingWizardController } from '../useReadingWizardController';
import * as storage from '../../../storage/reading/readingDraftStorage';
import * as photoService from '../../../services/photo/photoService';
import { ConsolidatedReading } from '../../../domain/reading/types';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

jest.mock('../../../storage/reading/readingDraftStorage');
jest.mock('../../../services/photo/photoService');

function renderHookWithRenderer<T>(hookFn: () => T) {
  let result = {} as { current: T };
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
    rerender: () => {
      act(() => {
        renderer.update(React.createElement(TestComponent));
      });
    },
  };
}

describe('useReadingWizardController (Modo Edición - Spec 004)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const sampleConsolidated: ConsolidatedReading = {
    id: 'READ-EXISTING-123',
    meterCode: 'MED-123456',
    condition: 'Normal',
    currentReading: 150,
    previousReading: 100,
    averageConsumption: 20,
    consumption: 50,
    isAnomaly: false,
    anomalyConfirmed: false,
    photoUri: 'file:///data/photos/old-photo.jpg',
    hasNoPreviousData: false,
    capturedAt: '2026-10-27T10:00:00Z',
    status: 'PENDING_SYNC',
  };

  it('preloads existing reading data when editingReadingId is provided', async () => {
    (storage.getReadingById as jest.Mock).mockResolvedValueOnce(sampleConsolidated);

    let hookResult: any;
    await act(async () => {
      const { result } = renderHookWithRenderer(() =>
        useReadingWizardController({
          meterCode: 'MED-123456',
          editingReadingId: 'READ-EXISTING-123',
        })
      );
      hookResult = result;
    });

    expect(storage.getReadingById).toHaveBeenCalledWith('READ-EXISTING-123');
    expect(hookResult.current.isEditMode).toBe(true);
    expect(hookResult.current.draft.currentReading).toBe(150);
    expect(hookResult.current.draft.condition).toBe('Normal');
    expect(hookResult.current.draft.photoUri).toBe('file:///data/photos/old-photo.jpg');
  });

  it('updates existing reading in-place preserving id and status, and deletes old photo if replaced', async () => {
    (storage.getReadingById as jest.Mock).mockResolvedValueOnce(sampleConsolidated);
    (storage.updateConsolidatedReading as jest.Mock).mockResolvedValueOnce(undefined);
    (photoService.deletePhoto as jest.Mock).mockResolvedValueOnce(true);

    let hookResult: any;
    await act(async () => {
      const { result } = renderHookWithRenderer(() =>
        useReadingWizardController({
          meterCode: 'MED-123456',
          editingReadingId: 'READ-EXISTING-123',
        })
      );
      hookResult = result;
    });

    act(() => {
      hookResult.current.setCurrentReading('160');
    });

    await act(async () => {
      await hookResult.current.removePhoto();
    });

    expect(hookResult.current.draft.photoUri).toBeNull();

    let success = false;
    await act(async () => {
      success = await hookResult.current.submitFinalReading();
    });

    expect(success).toBe(true);
    expect(photoService.deletePhoto).toHaveBeenCalledWith('file:///data/photos/old-photo.jpg');
    expect(storage.updateConsolidatedReading).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'READ-EXISTING-123',
        meterCode: 'MED-123456',
        currentReading: 160,
        photoUri: null,
        status: 'PENDING_SYNC',
      })
    );
    expect(storage.saveConsolidatedReading).not.toHaveBeenCalled();
  });
});
