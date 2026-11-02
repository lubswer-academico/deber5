import {
  ConsumptionCalculationResult,
  MeterCondition,
  ReadingDraft,
  ReadingValidationResult,
  StepRequirements,
} from './types';

export function calculateConsumption(
  currentReading: number,
  previousReading?: number | null
): ConsumptionCalculationResult {
  if (previousReading === null || previousReading === undefined) {
    return {
      hasPreviousReading: false,
      consumption: null,
      isValidConsistency: true,
      isPendingVerification: true,
    };
  }

  const consumption = currentReading - previousReading;
  const isValidConsistency = currentReading >= previousReading;

  return {
    hasPreviousReading: true,
    consumption,
    isValidConsistency,
    errorMessage: isValidConsistency
      ? undefined
      : 'La lectura actual no puede ser menor a la lectura anterior registrada',
  };
}

export function checkConsumptionAnomaly(
  consumption: number | null,
  averageConsumption?: number | null
): boolean {
  if (
    consumption === null ||
    averageConsumption === null ||
    averageConsumption === undefined ||
    averageConsumption <= 0
  ) {
    return false;
  }

  return consumption > 3 * averageConsumption;
}

export function getStepRequirements(
  condition: MeterCondition,
  isAnomaly: boolean
): StepRequirements {
  switch (condition) {
    case 'Normal':
      return {
        conditionRequired: true,
        reasonRequired: false,
        damageDescriptionRequired: false,
        readingRequired: true,
        readingDisabled: false,
        photoRequired: isAnomaly,
        anomalyConfirmationRequired: isAnomaly,
      };

    case 'Inaccesible':
      return {
        conditionRequired: true,
        reasonRequired: true,
        damageDescriptionRequired: false,
        readingRequired: false,
        readingDisabled: true,
        photoRequired: false,
        anomalyConfirmationRequired: false,
      };

    case 'Dañado':
      return {
        conditionRequired: true,
        reasonRequired: false,
        damageDescriptionRequired: true,
        readingRequired: false,
        readingDisabled: false,
        photoRequired: true, // Fotografía siempre obligatoria en dañado
        anomalyConfirmationRequired: isAnomaly,
      };
  }
}

export function validateStepCompletion(
  step: 1 | 2 | 3,
  draft: Partial<ReadingDraft>,
  requirements: StepRequirements
): ReadingValidationResult {
  if (step === 1) {
    if (!draft.condition) {
      return { isValid: false, errorMessage: 'Debe seleccionar una condición de medidor' };
    }
    if (requirements.reasonRequired) {
      if (!draft.inaccessibilityReason || draft.inaccessibilityReason.trim().length === 0) {
        return { isValid: false, errorMessage: 'El motivo de inaccesibilidad es obligatorio' };
      }
    }
    if (requirements.damageDescriptionRequired) {
      if (!draft.damageDescription || draft.damageDescription.trim().length === 0) {
        return { isValid: false, errorMessage: 'La descripción del daño es obligatoria' };
      }
    }
    return { isValid: true };
  }

  if (step === 2) {
    if (requirements.readingDisabled) {
      return { isValid: true };
    }

    if (requirements.readingRequired) {
      if (
        draft.currentReading === undefined ||
        draft.currentReading === null ||
        isNaN(draft.currentReading)
      ) {
        return { isValid: false, errorMessage: 'Debe ingresar una lectura numérica válida' };
      }
    }

    if (
      draft.currentReading !== undefined &&
      draft.currentReading !== null &&
      !isNaN(draft.currentReading)
    ) {
      if (draft.currentReading < 0) {
        return { isValid: false, errorMessage: 'La lectura no puede ser un número negativo' };
      }

      if (
        draft.previousReading !== undefined &&
        draft.previousReading !== null &&
        draft.currentReading < draft.previousReading
      ) {
        return {
          isValid: false,
          errorMessage: 'La lectura actual no puede ser menor a la lectura anterior registrada',
        };
      }

      if (requirements.anomalyConfirmationRequired && !draft.anomalyConfirmed) {
        return {
          isValid: false,
          errorMessage: 'Debe confirmar físicamente la lectura debido a consumo anómalo',
        };
      }
    }

    return { isValid: true };
  }

  if (step === 3) {
    if (requirements.photoRequired) {
      if (!draft.photoUri || draft.photoUri.trim().length === 0) {
        return {
          isValid: false,
          errorMessage: 'La fotografía es obligatoria para esta condición o anomalía detectada',
        };
      }
    }
    return { isValid: true };
  }

  return { isValid: true };
}

export function createInitialDraft(
  meterCode: string,
  previousReading?: number | null,
  averageConsumption?: number | null,
  hasNoPreviousData: boolean = false
): ReadingDraft {
  const now = new Date().toISOString();
  return {
    meterCode,
    condition: 'Normal',
    inaccessibilityReason: '',
    damageDescription: '',
    currentReading: null,
    previousReading: previousReading ?? null,
    averageConsumption: averageConsumption ?? null,
    hasNoPreviousData,
    consumption: null,
    isAnomaly: false,
    anomalyConfirmed: false,
    photoUri: null,
    currentStep: 1,
    createdAt: now,
    updatedAt: now,
  };
}
