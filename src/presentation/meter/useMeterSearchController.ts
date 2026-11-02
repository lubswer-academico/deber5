import { useState, useCallback } from 'react';
import { MeterRecord, MonthlyDuplicateCheckResult } from '@/domain/meter/types';
import { sanitizeMeterCodeInput, validateMeterCode, checkMonthlyDuplicate } from '@/domain/meter/meterRules';
import { formatReadingStatusLabel } from '@/domain/readingQueue/queueRules';
import { getMeterFromCache, saveMeterToCache } from '@/storage/meter/meterCacheStorage';
import { fetchMeterFromOffice } from '@/services/officeApi';
import { fetchCurrentNetworkStatus } from '@/presentation/session/networkMonitor';
import { getReadingByMeterCode } from '@/storage/reading/readingDraftStorage';

export interface UseMeterSearchControllerReturn {
  meterCodeInput: string;
  isValidCode: boolean;
  validationError: string | null;
  isSearching: boolean;
  meterData: MeterRecord | null;
  isFromCache: boolean;
  noSignalNoDataWarning: boolean;
  duplicateBlock: MonthlyDuplicateCheckResult | null;
  errorMessage: string | null;
  handleCodeChange: (text: string) => void;
  searchMeter: () => Promise<void>;
  proceedToCaptureWithoutData: () => void;
  resetSearch: () => void;
  readyToCapture: boolean;
}

export function useMeterSearchController(): UseMeterSearchControllerReturn {
  const [meterCodeInput, setMeterCodeInput] = useState<string>('');
  const [isValidCode, setIsValidCode] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [meterData, setMeterData] = useState<MeterRecord | null>(null);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [noSignalNoDataWarning, setNoSignalNoDataWarning] = useState<boolean>(false);
  const [duplicateBlock, setDuplicateBlock] = useState<MonthlyDuplicateCheckResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [readyToCapture, setReadyToCapture] = useState<boolean>(false);

  const handleCodeChange = useCallback((text: string) => {
    const formatted = sanitizeMeterCodeInput(text);
    setMeterCodeInput(formatted);

    setMeterData(null);
    setIsFromCache(false);
    setNoSignalNoDataWarning(false);
    setDuplicateBlock(null);
    setErrorMessage(null);
    setReadyToCapture(false);

    if (!formatted) {
      setIsValidCode(false);
      setValidationError(null);
      return;
    }

    const validation = validateMeterCode(formatted);
    setIsValidCode(validation.isValid);
    setValidationError(validation.isValid ? null : validation.errorMessage || null);
  }, []);

  const searchMeter = useCallback(async () => {
    const validation = validateMeterCode(meterCodeInput);
    if (!validation.isValid) {
      setValidationError(validation.errorMessage || 'Código de medidor inválido');
      return;
    }

    setIsSearching(true);
    setErrorMessage(null);
    setNoSignalNoDataWarning(false);
    setDuplicateBlock(null);
    setMeterData(null);
    setIsFromCache(false);
    setReadyToCapture(false);

    const code = meterCodeInput.trim();

    try {
      const localReading = await getReadingByMeterCode(code);
      if (localReading) {
        if (localReading.status === 'SUBMITTED') {
          setDuplicateBlock({
            hasDuplicate: true,
            isSubmitted: true,
            canEditPending: false,
            message: `El medidor ${code} ya cuenta con una lectura enviada y confirmada en la oficina este mes. Registro inmutable en solo lectura.`,
          });
        } else {
          setDuplicateBlock({
            hasDuplicate: true,
            isSubmitted: false,
            canEditPending: true,
            message: `El medidor ${code} ya cuenta con una lectura capturada en este dispositivo (${formatReadingStatusLabel(localReading.status)}).`,
          });
        }
        setIsSearching(false);
        return;
      }

      const cached = await getMeterFromCache(code);
      if (cached) {
        setMeterData(cached);
        setIsFromCache(true);

        const duplicateCheck = checkMonthlyDuplicate(
          cached.lastReading?.date || null,
          true 
        );
        if (duplicateCheck.hasDuplicate) {
          setDuplicateBlock(duplicateCheck);
        } else {
          setReadyToCapture(true);
        }
        setIsSearching(false);
        return;
      }

      const isConnected = await fetchCurrentNetworkStatus();

      if (isConnected === false) {
        setNoSignalNoDataWarning(true);
        setIsSearching(false);
        return;
      }

      try {
        const remoteMeter = await fetchMeterFromOffice(code);
        if (!remoteMeter) {
          setErrorMessage('Medidor no encontrado en el catastro central.');
        } else {
          await saveMeterToCache(remoteMeter);
          setMeterData(remoteMeter);
          setIsFromCache(false);

          const duplicateCheck = checkMonthlyDuplicate(
            remoteMeter.lastReading?.date || null,
            true
          );
          if (duplicateCheck.hasDuplicate) {
            setDuplicateBlock(duplicateCheck);
          } else {
            setReadyToCapture(true);
          }
        }
      } catch {
        setNoSignalNoDataWarning(true);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error inesperado al buscar el medidor');
    } finally {
      setIsSearching(false);
    }
  }, [meterCodeInput]);

  const proceedToCaptureWithoutData = useCallback(() => {
    setReadyToCapture(true);
    setNoSignalNoDataWarning(false);
  }, []);

  const resetSearch = useCallback(() => {
    setMeterCodeInput('');
    setIsValidCode(false);
    setValidationError(null);
    setIsSearching(false);
    setMeterData(null);
    setIsFromCache(false);
    setNoSignalNoDataWarning(false);
    setDuplicateBlock(null);
    setErrorMessage(null);
    setReadyToCapture(false);
  }, []);

  return {
    meterCodeInput,
    isValidCode,
    validationError,
    isSearching,
    meterData,
    isFromCache,
    noSignalNoDataWarning,
    duplicateBlock,
    errorMessage,
    handleCodeChange,
    searchMeter,
    proceedToCaptureWithoutData,
    resetSearch,
    readyToCapture,
  };
}
