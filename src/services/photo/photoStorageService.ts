import * as FileSystem from 'expo-file-system/legacy';

const PHOTOS_DIRECTORY = `${FileSystem.documentDirectory || ''}epmaps_photos/`;

export async function ensurePhotosDirectoryExists(): Promise<void> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(PHOTOS_DIRECTORY);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(PHOTOS_DIRECTORY, { intermediates: true });
    }
  } catch (error) {
    console.error('Error al asegurar directorio de fotos:', error);
  }
}

export async function persistPhoto(tempUri: string, meterCode: string): Promise<string> {
  await ensurePhotosDirectoryExists();
  const timestamp = Date.now();
  const sanitizedCode = meterCode.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${sanitizedCode}_${timestamp}.jpg`;
  const permanentUri = `${PHOTOS_DIRECTORY}${filename}`;

  try {
    await FileSystem.copyAsync({
      from: tempUri,
      to: permanentUri,
    });
    return permanentUri;
  } catch (error) {
    console.error(`Error al persistir la foto desde ${tempUri} hacia ${permanentUri}:`, error);
    throw error;
  }
}

export async function deletePhoto(photoUri?: string | null): Promise<void> {
  if (!photoUri) return;
  try {
    const fileInfo = await FileSystem.getInfoAsync(photoUri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(photoUri, { idempotent: true });
    }
  } catch (error) {
    console.error(`Error al eliminar fotografía huérfana en ${photoUri}:`, error);
  }
}
