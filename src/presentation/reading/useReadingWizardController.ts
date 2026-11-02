import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ConsumptionCalculationResult,
  MeterCondition,
  ReadingDraft,
  StepRequirements,
  ConsolidatedReading,
} from '../../domain/reading/types';
import {
  calculateConsumption,
  checkConsumptionAnomaly,
  getStepRequirements,
  validateStepCompletion,
  createInitialDraft,
} from '../../domain/reading/readingRules';
import {
  saveDraft,
  getDraft,
  clearDraft,
  saveConsolidatedReading,
  getReadingById,
  updateConsolidatedReading,
} from '../../storage/reading/readingDraftStorage';
import {
  takeMeterPhoto,
  persistPhoto,
  deletePhoto,
  requestCameraPermissions,
} from '../../services/photo/photoService';

export interface UseReadingWizardControllerProps {
  meterCode: string;
  previousReading?: number | null;
  averageConsumption?: number | null;
  hasNoPreviousData?: boolean;
  editingReadingId?: string;
}

export function useReadingWizardController({
  meterCode,
  previousReading,
  averageConsumption,
  hasNoPreviousData = false,
  editingReadingId,
}: UseReadingWizardControllerProps) {
  const [draft, setDraft] = useState<ReadingDraft>(() =>
    createInitialDraft(meterCode, previousReading, averageConsumption, hasNoPreviousData)
  );
  const [editingOriginalReading, setEditingOriginalReading] = useState<ConsolidatedReading | null>(null);
  const [hasExistingDraft, setHasExistingDraft] = useState<boolean>(false);
  const [existingDraftData, setExistingDraftData] = useState<ReadingDraft | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [cameraPermissionDenied, setCameraPermissionDenied] = useState<boolean>(false);

  const isEditMode = Boolean(editingReadingId);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (editingReadingId) {
        const existingReading = await getReadingById(editingReadingId);
        if (existingReading && isMounted) {
          setEditingOriginalReading(existingReading);
          setDraft({
            meterCode: existingReading.meterCode,
            condition: existingReading.condition,
            inaccessibilityReason: existingReading.inaccessibilityReason || '',
            damageDescription: existingReading.damageDescription || '',
            currentReading: existingReading.currentReading ?? null,
            previousReading: existingReading.previousReading ?? null,
            averageConsumption: existingReading.averageConsumption ?? null,
            hasNoPreviousData: existingReading.hasNoPreviousData ?? false,
            consumption: existingReading.consumption ?? null,
            isAnomaly: existingReading.isAnomaly ?? false,
            anomalyConfirmed: existingReading.anomalyConfirmed ?? false,
            photoUri: existingReading.photoUri ?? null,
            currentStep: 1,
            createdAt: existingReading.capturedAt,
            updatedAt: existingReading.updatedAt || new Date().toISOString(),
          });
        }
        return;
      }

      const saved = await getDraft(meterCode);
      if (saved && isMounted) {
        setHasExistingDraft(true);
        setExistingDraftData(saved);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [meterCode, editingReadingId]);

  const consumptionInfo: ConsumptionCalculationResult = useMemo(() => {
    if (draft.condition === 'Inaccesible') {
      return {
        hasPreviousReading: draft.previousReading !== null && draft.previousReading !== undefined,
        consumption: null,
        isValidConsistency: true,
      };
    }
    if (draft.currentReading === null || draft.currentReading === undefined) {
      return {
        hasPreviousReading: draft.previousReading !== null && draft.previousReading !== undefined,
        consumption: null,
        isValidConsistency: true,
        isPendingVerification: draft.hasNoPreviousData,
      };
    }
    return calculateConsumption(draft.currentReading, draft.previousReading);
  }, [draft.currentReading, draft.previousReading, draft.condition, draft.hasNoPreviousData]);

  const isAnomaly = useMemo(() => {
    if (draft.condition === 'Inaccesible') return false;
    return checkConsumptionAnomaly(consumptionInfo.consumption, draft.averageConsumption);
  }, [consumptionInfo.consumption, draft.averageConsumption, draft.condition]);

  const requirements: StepRequirements = useMemo(() => {
    return getStepRequirements(draft.condition, isAnomaly);
  }, [draft.condition, isAnomaly]);

  useEffect(() => {
    setDraft((prev) => {
      if (prev.consumption !== consumptionInfo.consumption || prev.isAnomaly !== isAnomaly) {
        return {
          ...prev,
          consumption: consumptionInfo.consumption,
          isAnomaly,
        };
      }
      return prev;
    });
  }, [consumptionInfo.consumption, isAnomaly]);

  const persistDraftState = useCallback(async (updatedDraft: ReadingDraft) => {
    await saveDraft(updatedDraft);
  }, []);

  const setCondition = useCallback(
    (condition: MeterCondition) => {
      setValidationError(null);
      setDraft((prev) => {
        const updated: ReadingDraft = {
          ...prev,
          condition,
          currentReading: condition === 'Inaccesible' ? null : prev.currentReading,
          inaccessibilityReason: condition === 'Inaccesible' ? prev.inaccessibilityReason : '',
          damageDescription: condition === 'Dañado' ? prev.damageDescription : '',
          updatedAt: new Date().toISOString(),
        };
        persistDraftState(updated);
        return updated;
      });
    },
    [persistDraftState]
  );

  const setInaccessibilityReason = useCallback(
    (reason: string) => {
      setValidationError(null);
      setDraft((prev) => {
        const updated = { ...prev, inaccessibilityReason: reason, updatedAt: new Date().toISOString() };
        persistDraftState(updated);
        return updated;
      });
    },
    [persistDraftState]
  );

  const setDamageDescription = useCallback(
    (description: string) => {
      setValidationError(null);
      setDraft((prev) => {
        const updated = { ...prev, damageDescription: description, updatedAt: new Date().toISOString() };
        persistDraftState(updated);
        return updated;
      });
    },
    [persistDraftState]
  );

  const setCurrentReading = useCallback(
    (readingStr: string) => {
      setValidationError(null);
      const numericValue = readingStr.trim() === '' ? null : Number(readingStr);
      setDraft((prev) => {
        const updated = {
          ...prev,
          currentReading: isNaN(numericValue as number) ? null : numericValue,
          anomalyConfirmed: false,
          updatedAt: new Date().toISOString(),
        };
        persistDraftState(updated);
        return updated;
      });
    },
    [persistDraftState]
  );

  const setAnomalyConfirmed = useCallback(
    (confirmed: boolean) => {
      setValidationError(null);
      setDraft((prev) => {
        const updated = { ...prev, anomalyConfirmed: confirmed, updatedAt: new Date().toISOString() };
        persistDraftState(updated);
        return updated;
      });
    },
    [persistDraftState]
  );

  const resumeExistingDraft = useCallback(() => {
    if (existingDraftData) {
      setDraft(existingDraftData);
    }
    setHasExistingDraft(false);
  }, [existingDraftData]);

  const discardExistingDraft = useCallback(async () => {
    if (existingDraftData?.photoUri) {
      await deletePhoto(existingDraftData.photoUri);
    }
    await clearDraft(meterCode);
    const freshDraft = createInitialDraft(
      meterCode,
      previousReading,
      averageConsumption,
      hasNoPreviousData
    );
    setDraft(freshDraft);
    setHasExistingDraft(false);
    setExistingDraftData(null);
  }, [existingDraftData, meterCode, previousReading, averageConsumption, hasNoPreviousData]);

  const goToNextStep = useCallback(() => {
    const validation = validateStepCompletion(draft.currentStep, draft, requirements);
    if (!validation.isValid) {
      setValidationError(validation.errorMessage || 'Verifique los campos requeridos');
      return;
    }
    setValidationError(null);

    setDraft((prev) => {
      const nextStep = Math.min(prev.currentStep + 1, 3) as 1 | 2 | 3;
      const updated = { ...prev, currentStep: nextStep, updatedAt: new Date().toISOString() };
      persistDraftState(updated);
      return updated;
    });
  }, [draft, requirements, persistDraftState]);

  const goToPreviousStep = useCallback(() => {
    setValidationError(null);
    setDraft((prev) => {
      const prevStep = Math.max(prev.currentStep - 1, 1) as 1 | 2 | 3;
      const updated = { ...prev, currentStep: prevStep, updatedAt: new Date().toISOString() };
      persistDraftState(updated);
      return updated;
    });
  }, [persistDraftState]);

  const capturePhoto = useCallback(async () => {
    setValidationError(null);
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) {
      setCameraPermissionDenied(true);
      return;
    }
    setCameraPermissionDenied(false);

    const tempUri = await takeMeterPhoto();
    if (tempUri) {
      try {
        if (draft.photoUri) {
          await deletePhoto(draft.photoUri);
        }
        const permanentUri = await persistPhoto(tempUri, draft.meterCode);
        setDraft((prev) => {
          const updated = { ...prev, photoUri: permanentUri, updatedAt: new Date().toISOString() };
          persistDraftState(updated);
          return updated;
        });
      } catch (err) {
        console.error('Error al guardar la foto tomada:', err);
        setValidationError('Error al almacenar la fotografía en el dispositivo');
      }
    }
  }, [draft.photoUri, draft.meterCode, persistDraftState]);

  const removePhoto = useCallback(async () => {
    if (draft.photoUri) {
      await deletePhoto(draft.photoUri);
    }
    setDraft((prev) => {
      const updated = { ...prev, photoUri: null, updatedAt: new Date().toISOString() };
      persistDraftState(updated);
      return updated;
    });
  }, [draft.photoUri, persistDraftState]);

  const submitFinalReading = useCallback(async (): Promise<boolean> => {
    const validation = validateStepCompletion(3, draft, requirements);
    if (!validation.isValid) {
      setValidationError(validation.errorMessage || 'Complete los requisitos de la fotografía');
      return false;
    }

    setIsSaving(true);
    try {
      if (isEditMode && editingOriginalReading) {
        if (
          editingOriginalReading.photoUri &&
          editingOriginalReading.photoUri !== draft.photoUri
        ) {
          await deletePhoto(editingOriginalReading.photoUri);
        }

        const updatedReading: ConsolidatedReading = {
          ...editingOriginalReading,
          meterCode: editingOriginalReading.meterCode, // Inmutable (KISS / YAGNI)
          condition: draft.condition,
          inaccessibilityReason: draft.inaccessibilityReason,
          damageDescription: draft.damageDescription,
          currentReading: draft.currentReading,
          consumption: draft.consumption,
          isAnomaly: draft.isAnomaly,
          anomalyConfirmed: draft.anomalyConfirmed,
          photoUri: draft.photoUri,
          status:
            editingOriginalReading.status === 'REQUIRES_ATTENTION'
              ? 'PENDING_VERIFICATION'
              : editingOriginalReading.status,
          requiresAttentionReason: undefined,
        };

        await updateConsolidatedReading(updatedReading);
      } else {
        const consolidated: ConsolidatedReading = {
          id: `READ-${Date.now()}-${draft.meterCode}`,
          meterCode: draft.meterCode,
          condition: draft.condition,
          inaccessibilityReason: draft.inaccessibilityReason,
          damageDescription: draft.damageDescription,
          currentReading: draft.currentReading,
          previousReading: draft.previousReading,
          averageConsumption: draft.averageConsumption,
          consumption: draft.consumption,
          isAnomaly: draft.isAnomaly,
          anomalyConfirmed: draft.anomalyConfirmed,
          photoUri: draft.photoUri,
          hasNoPreviousData: draft.hasNoPreviousData,
          capturedAt: new Date().toISOString(),
          status: draft.hasNoPreviousData ? 'PENDING_VERIFICATION' : 'PENDING_SYNC',
        };

        await saveConsolidatedReading(consolidated);
      }

      setIsSaving(false);
      return true;
    } catch (err: any) {
      console.error('Error al consolidar la lectura:', err);
      setIsSaving(false);
      setValidationError(err?.message || 'No se pudo guardar la lectura en la cola local');
      return false;
    }
  }, [draft, requirements, isEditMode, editingOriginalReading]);

  return {
    currentStep: draft.currentStep,
    draft,
    requirements,
    consumptionInfo,
    isAnomaly,
    hasExistingDraft,
    isSaving,
    cameraPermissionDenied,
    validationError,
    isEditMode,
    setCondition,
    setInaccessibilityReason,
    setDamageDescription,
    setCurrentReading,
    setAnomalyConfirmed,
    goToNextStep,
    goToPreviousStep,
    capturePhoto,
    removePhoto,
    resumeExistingDraft,
    discardExistingDraft,
    submitFinalReading,
  };
}
