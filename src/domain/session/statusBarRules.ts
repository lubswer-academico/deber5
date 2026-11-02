import { ConnectionStatus } from './types';

export function formatConnectionStatus(isConnected: boolean | null | undefined): ConnectionStatus {
  return isConnected === true ? 'Con señal' : 'Sin señal';
}

export function formatPendingReadingsLabel(count: number): string {
  return `${count} pendientes`;
}

export function getInitialPendingReadingsLabel(): string {
  return formatPendingReadingsLabel(0);
}
