import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';

export type NetworkChangeCallback = (isConnected: boolean | null) => void;

export async function fetchCurrentNetworkStatus(): Promise<boolean | null> {
  const state: NetInfoState = await NetInfo.fetch();
  return state.isConnected;
}

export function subscribeToNetworkStatus(callback: NetworkChangeCallback): () => void {
  const unsubscribe: NetInfoSubscription = NetInfo.addEventListener((state: NetInfoState) => {
    callback(state.isConnected);
  });

  return unsubscribe;
}
