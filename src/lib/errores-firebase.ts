import { FirebaseError } from 'firebase/app';

const mensajes: Record<string, string> = {
  'auth/invalid-credential': 'El correo o la contraseña no coinciden. Revisa los datos e inténtalo de nuevo.',
  'auth/wrong-password': 'El correo o la contraseña no coinciden. Revisa los datos e inténtalo de nuevo.',
  'auth/user-not-found': 'El correo o la contraseña no coinciden. Revisa los datos e inténtalo de nuevo.',
  'auth/invalid-email': 'El correo no tiene un formato válido.',
  'auth/missing-email': 'Escribe tu correo para continuar.',
  'auth/missing-password': 'Escribe tu contraseña para continuar.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo. Inicia sesión con tus credenciales.',
  'auth/weak-password': 'La contraseña es muy débil. Usa al menos 6 caracteres.',
  'auth/too-many-requests': 'Demasiados intentos fallidos. Espera unos minutos y vuelve a intentarlo.',
  'auth/network-request-failed': 'No hay conexión con el servidor. Revisa tu internet e inténtalo otra vez.',
  'auth/requires-recent-login': 'Por seguridad, cierra sesión, vuelve a ingresar y repite la acción.',
  'auth/user-disabled': 'Esta cuenta fue deshabilitada. Comunícate con el administrador.',
  'auth/operation-not-allowed': 'El acceso con correo y contraseña no está habilitado en la consola de Firebase.',
};

export function mensajeDeErrorFirebase(error: unknown, reemplazos: Record<string, string> = {}): string {
  if (error instanceof FirebaseError) {
    if (reemplazos[error.code]) return reemplazos[error.code];
    if (mensajes[error.code]) return mensajes[error.code];
    return `No se pudo completar la operación (${error.code}).`;
  }
  return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
}

