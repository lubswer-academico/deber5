import {
  calculateConsumption,
  checkConsumptionAnomaly,
  getStepRequirements,
  validateStepCompletion,
  createInitialDraft,
} from '../readingRules';
import { ReadingDraft } from '../types';

describe('Reading Domain Rules (readingRules)', () => {
  describe('calculateConsumption & Consistency', () => {
    it('calculates consumption correctly when actual >= anterior', () => {
      const result = calculateConsumption(150, 100);
      expect(result.hasPreviousReading).toBe(true);
      expect(result.consumption).toBe(50);
      expect(result.isValidConsistency).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    it('rejects consistency when actual < anterior', () => {
      const result = calculateConsumption(90, 100);
      expect(result.hasPreviousReading).toBe(true);
      expect(result.consumption).toBe(-10);
      expect(result.isValidConsistency).toBe(false);
      expect(result.errorMessage).toBe('La lectura actual no puede ser menor a la lectura anterior registrada');
    });

    it('handles capture without previous data (modo contingencia)', () => {
      const result = calculateConsumption(150, null);
      expect(result.hasPreviousReading).toBe(false);
      expect(result.consumption).toBeNull();
      expect(result.isValidConsistency).toBe(true);
      expect(result.isPendingVerification).toBe(true);
    });

    it('handles capture without previous data when previousReading is undefined', () => {
      const result = calculateConsumption(150, undefined);
      expect(result.hasPreviousReading).toBe(false);
      expect(result.consumption).toBeNull();
      expect(result.isValidConsistency).toBe(true);
      expect(result.isPendingVerification).toBe(true);
    });
  });

  describe('checkConsumptionAnomaly', () => {
    it('returns true when consumption strictly exceeds 3x average', () => {
      expect(checkConsumptionAnomaly(61, 20)).toBe(true);
    });

    it('returns false when consumption is equal to 3x average', () => {
      expect(checkConsumptionAnomaly(60, 20)).toBe(false);
    });

    it('returns false when consumption is below 3x average', () => {
      expect(checkConsumptionAnomaly(40, 20)).toBe(false);
    });

    it('returns false if average is null, undefined or <= 0', () => {
      expect(checkConsumptionAnomaly(100, null)).toBe(false);
      expect(checkConsumptionAnomaly(100, undefined)).toBe(false);
      expect(checkConsumptionAnomaly(100, 0)).toBe(false);
      expect(checkConsumptionAnomaly(100, -5)).toBe(false);
    });

    it('returns false if consumption is null', () => {
      expect(checkConsumptionAnomaly(null, 20)).toBe(false);
    });
  });

  describe('getStepRequirements (Matriz de obligatoriedad)', () => {
    it('returns correct requirements for Normal condition without anomaly', () => {
      const req = getStepRequirements('Normal', false);
      expect(req.conditionRequired).toBe(true);
      expect(req.reasonRequired).toBe(false);
      expect(req.damageDescriptionRequired).toBe(false);
      expect(req.readingRequired).toBe(true);
      expect(req.readingDisabled).toBe(false);
      expect(req.photoRequired).toBe(false);
      expect(req.anomalyConfirmationRequired).toBe(false);
    });

    it('returns correct requirements for Normal condition WITH anomaly', () => {
      const req = getStepRequirements('Normal', true);
      expect(req.readingRequired).toBe(true);
      expect(req.photoRequired).toBe(true);
      expect(req.anomalyConfirmationRequired).toBe(true);
    });

    it('returns correct requirements for Inaccesible condition', () => {
      const req = getStepRequirements('Inaccesible', false);
      expect(req.conditionRequired).toBe(true);
      expect(req.reasonRequired).toBe(true);
      expect(req.damageDescriptionRequired).toBe(false);
      expect(req.readingRequired).toBe(false);
      expect(req.readingDisabled).toBe(true);
      expect(req.photoRequired).toBe(false);
      expect(req.anomalyConfirmationRequired).toBe(false);
    });

    it('returns correct requirements for Dañado condition', () => {
      const req = getStepRequirements('Dañado', false);
      expect(req.conditionRequired).toBe(true);
      expect(req.reasonRequired).toBe(false);
      expect(req.damageDescriptionRequired).toBe(true);
      expect(req.readingRequired).toBe(false);
      expect(req.readingDisabled).toBe(false);
      expect(req.photoRequired).toBe(true); 
      expect(req.anomalyConfirmationRequired).toBe(false);
    });

    it('returns correct requirements for Dañado condition WITH anomaly', () => {
      const req = getStepRequirements('Dañado', true);
      expect(req.photoRequired).toBe(true);
      expect(req.anomalyConfirmationRequired).toBe(true);
    });
  });

  describe('validateStepCompletion', () => {
    describe('Paso 1: Condición', () => {
      it('validates Normal condition successfully without reason or description', () => {
        const draft: Partial<ReadingDraft> = { condition: 'Normal' };
        const req = getStepRequirements('Normal', false);
        const res = validateStepCompletion(1, draft, req);
        expect(res.isValid).toBe(true);
      });

      it('fails Inaccesible condition if reason is missing or empty', () => {
        const draft: Partial<ReadingDraft> = { condition: 'Inaccesible', inaccessibilityReason: '   ' };
        const req = getStepRequirements('Inaccesible', false);
        const res = validateStepCompletion(1, draft, req);
        expect(res.isValid).toBe(false);
        expect(res.errorMessage).toBe('El motivo de inaccesibilidad es obligatorio');
      });

      it('validates Inaccesible condition with valid reason', () => {
        const draft: Partial<ReadingDraft> = {
          condition: 'Inaccesible',
          inaccessibilityReason: 'Reja con candado',
        };
        const req = getStepRequirements('Inaccesible', false);
        const res = validateStepCompletion(1, draft, req);
        expect(res.isValid).toBe(true);
      });

      it('fails Dañado condition if damage description is missing or empty', () => {
        const draft: Partial<ReadingDraft> = { condition: 'Dañado', damageDescription: '' };
        const req = getStepRequirements('Dañado', false);
        const res = validateStepCompletion(1, draft, req);
        expect(res.isValid).toBe(false);
        expect(res.errorMessage).toBe('La descripción del daño es obligatoria');
      });

      it('validates Dañado condition with valid description', () => {
        const draft: Partial<ReadingDraft> = {
          condition: 'Dañado',
          damageDescription: 'Visor roto y empañado',
        };
        const req = getStepRequirements('Dañado', false);
        const res = validateStepCompletion(1, draft, req);
        expect(res.isValid).toBe(true);
      });
    });

    describe('Paso 2: Lectura numérica y anomalía', () => {
      it('fails if reading is required (Normal) and not provided', () => {
        const draft: Partial<ReadingDraft> = { condition: 'Normal', currentReading: null };
        const req = getStepRequirements('Normal', false);
        const res = validateStepCompletion(2, draft, req);
        expect(res.isValid).toBe(false);
        expect(res.errorMessage).toBe('Debe ingresar una lectura numérica válida');
      });

      it('fails if reading is negative', () => {
        const draft: Partial<ReadingDraft> = { condition: 'Normal', currentReading: -5 };
        const req = getStepRequirements('Normal', false);
        const res = validateStepCompletion(2, draft, req);
        expect(res.isValid).toBe(false);
        expect(res.errorMessage).toBe('La lectura no puede ser un número negativo');
      });

      it('fails if reading is inconsistent with previous reading', () => {
        const draft: Partial<ReadingDraft> = {
          condition: 'Normal',
          currentReading: 80,
          previousReading: 100,
        };
        const req = getStepRequirements('Normal', false);
        const res = validateStepCompletion(2, draft, req);
        expect(res.isValid).toBe(false);
        expect(res.errorMessage).toBe('La lectura actual no puede ser menor a la lectura anterior registrada');
      });

      it('fails if anomaly is detected but not confirmed', () => {
        const draft: Partial<ReadingDraft> = {
          condition: 'Normal',
          currentReading: 200,
          previousReading: 100,
          averageConsumption: 20, // consumo 100 > 3 * 20 = 60
          isAnomaly: true,
          anomalyConfirmed: false,
        };
        const req = getStepRequirements('Normal', true);
        const res = validateStepCompletion(2, draft, req);
        expect(res.isValid).toBe(false);
        expect(res.errorMessage).toBe('Debe confirmar físicamente la lectura debido a consumo anómalo');
      });

      it('passes if anomaly is detected AND confirmed', () => {
        const draft: Partial<ReadingDraft> = {
          condition: 'Normal',
          currentReading: 200,
          previousReading: 100,
          averageConsumption: 20,
          isAnomaly: true,
          anomalyConfirmed: true,
        };
        const req = getStepRequirements('Normal', true);
        const res = validateStepCompletion(2, draft, req);
        expect(res.isValid).toBe(true);
      });

      it('passes Inaccesible without reading', () => {
        const draft: Partial<ReadingDraft> = { condition: 'Inaccesible', currentReading: null };
        const req = getStepRequirements('Inaccesible', false);
        const res = validateStepCompletion(2, draft, req);
        expect(res.isValid).toBe(true);
      });

      it('passes Dañado without reading (optional)', () => {
        const draft: Partial<ReadingDraft> = { condition: 'Dañado', currentReading: null };
        const req = getStepRequirements('Dañado', false);
        const res = validateStepCompletion(2, draft, req);
        expect(res.isValid).toBe(true);
      });
    });

    describe('Paso 3: Fotografía y consolidación', () => {
      it('fails if photo is required and photoUri is missing', () => {
        const draft: Partial<ReadingDraft> = {
          condition: 'Dañado',
          damageDescription: 'Roto',
          photoUri: null,
        };
        const req = getStepRequirements('Dañado', false);
        const res = validateStepCompletion(3, draft, req);
        expect(res.isValid).toBe(false);
        expect(res.errorMessage).toBe('La fotografía es obligatoria para esta condición o anomalía detectada');
      });

      it('passes if photo is required and photoUri is present', () => {
        const draft: Partial<ReadingDraft> = {
          condition: 'Dañado',
          damageDescription: 'Roto',
          photoUri: 'file:///path/to/photo.jpg',
        };
        const req = getStepRequirements('Dañado', false);
        const res = validateStepCompletion(3, draft, req);
        expect(res.isValid).toBe(true);
      });

      it('passes if photo is optional and photoUri is null (Normal sin anomalía)', () => {
        const draft: Partial<ReadingDraft> = {
          condition: 'Normal',
          currentReading: 120,
          previousReading: 100,
          photoUri: null,
        };
        const req = getStepRequirements('Normal', false);
        const res = validateStepCompletion(3, draft, req);
        expect(res.isValid).toBe(true);
      });
    });
  });

  describe('createInitialDraft', () => {
    it('creates initial draft with default step 1 and default values', () => {
      const draft = createInitialDraft('MED-123456', 100, 25, false);
      expect(draft.meterCode).toBe('MED-123456');
      expect(draft.condition).toBe('Normal');
      expect(draft.previousReading).toBe(100);
      expect(draft.averageConsumption).toBe(25);
      expect(draft.hasNoPreviousData).toBe(false);
      expect(draft.currentStep).toBe(1);
      expect(draft.isAnomaly).toBe(false);
      expect(draft.anomalyConfirmed).toBe(false);
      expect(draft.photoUri).toBeNull();
    });
  });
});
