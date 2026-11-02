import { useState, useEffect } from 'react';
import { ConnectionStatus } from '@/domain/session/types';
import {
  formatConnectionStatus,
  formatPendingReadingsLabel,
} from '@/domain/session/statusBarRules';
import {
  fetchCurrentNetworkStatus,
  subscribeToNetworkStatus,
} from './networkMonitor';
import { getPendingReadingsCount } from '@/storage/reading/readingDraftStorage';

export interface UseGlobalStatusControllerResult {
  isOnline: boolean;
  connectionLabel: ConnectionStatus;
  pendingLabel: string;
  pendingCount: number;
}

export function useGlobalStatusController(): UseGlobalStatusControllerResult {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;

    const updatePendingCount = async () => {
      try {
        const count = await getPendingReadingsCount();
        if (isMounted) {
          setPendingCount(count);
        }
      } catch (e) {
        console.error('Error al consultar lecturas pendientes:', e);
      }
    };

    updatePendingCount();
    const intervalId = setInterval(updatePendingCount, 2500);

    fetchCurrentNetworkStatus().then((initialStatus) => {
      if (isMounted) {
        setIsConnected(initialStatus);
      }
    });

    const unsubscribe = subscribeToNetworkStatus((status) => {
      if (isMounted) {
        setIsConnected(status);
      }
    });

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      unsubscribe();
    };
  }, []);

  const isOnline = isConnected === true;
  const connectionLabel = formatConnectionStatus(isConnected);
  const pendingLabel = formatPendingReadingsLabel(pendingCount);

  return {
    isOnline,
    connectionLabel,
    pendingLabel,
    pendingCount,
  };
}
