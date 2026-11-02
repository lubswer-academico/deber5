import * as ImagePicker from 'expo-image-picker';

export async function requestCameraPermissions(): Promise<boolean> {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === ImagePicker.PermissionStatus.GRANTED;
  } catch (error) {
    console.error('Error al solicitar permisos de cámara:', error);
    return false;
  }
}

export async function hasCameraPermissions(): Promise<boolean> {
  try {
    const { status } = await ImagePicker.getCameraPermissionsAsync();
    return status === ImagePicker.PermissionStatus.GRANTED;
  } catch (error) {
    console.error('Error al consultar estado de permisos de cámara:', error);
    return false;
  }
}

export async function takeMeterPhoto(): Promise<string | null> {
  try {
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) {
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7, // Compresión 70% acorde a ADR-005
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    return result.assets[0].uri;
  } catch (error) {
    console.error('Error al capturar fotografía con la cámara:', error);
    return null;
  }
}
