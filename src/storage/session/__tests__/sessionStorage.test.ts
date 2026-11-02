import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveSession,
  getSession,
  clearSession,
  ACTIVE_SESSION_KEY,
} from '../sessionStorage';
import { AuthenticatedTechnician } from '@/domain/session/types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('sessionStorage', () => {
  const mockTechnician: AuthenticatedTechnician = {
    employeeCode: 'TEC-001',
    name: 'Carlos Mendoza',
  };

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('debe guardar y recuperar la sesión del técnico de forma íntegra', async () => {
    await saveSession(mockTechnician);
    const session = await getSession();

    expect(session).toEqual(mockTechnician);
  });

  it('debe retornar null cuando no existe sesión almacenada', async () => {
    const session = await getSession();
    expect(session).toBeNull();
  });

  it('debe purgar la sesión almacenada al llamar a clearSession', async () => {
    await saveSession(mockTechnician);
    expect(await getSession()).not.toBeNull();

    await clearSession();
    expect(await getSession()).toBeNull();
  });

  it('debe manejar JSON corrupto de forma defensiva purgando la clave y retornando null', async () => {
    await AsyncStorage.setItem(ACTIVE_SESSION_KEY, 'invalid-json-content{{');

    const session = await getSession();
    expect(session).toBeNull();

    const rawStored = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
    expect(rawStored).toBeNull();
  });
});
