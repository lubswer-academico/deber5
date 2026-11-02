import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthenticatedTechnician } from '@/domain/session/types';

export const ACTIVE_SESSION_KEY = 'epmaps_active_session';

export async function saveSession(technician: AuthenticatedTechnician): Promise<void> {
  const serialized = JSON.stringify(technician);
  await AsyncStorage.setItem(ACTIVE_SESSION_KEY, serialized);
}

export async function getSession(): Promise<AuthenticatedTechnician | null> {
  try {
    const rawData = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
    if (!rawData) {
      return null;
    }

    const parsed = JSON.parse(rawData);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.employeeCode === 'string' &&
      typeof parsed.name === 'string'
    ) {
      return {
        employeeCode: parsed.employeeCode,
        name: parsed.name,
      };
    }

    await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
    return null;
  } catch {
    try {
      await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
    } catch {
      // Ignorar fallas secundarias de purga
    }
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
}
