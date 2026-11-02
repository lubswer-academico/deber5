import { useState, useEffect, useCallback } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '@/config/firebase';
import { AuthenticatedTechnician } from '@/domain/session/types';
import { mensajeDeErrorFirebase } from '@/lib/errores-firebase';
import { buscarTecnicoPorIdentificador } from '@/services/tecnicosFirestore';
import {
  saveSession,
  getSession,
  clearSession,
} from '@/storage/session/sessionStorage';

export interface UseSessionControllerResult {
  technician: AuthenticatedTechnician | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  warningMessage: string | null;
  canResendVerification: boolean;
  login: (identifier: string, pin: string) => Promise<boolean>;
  reenviarVerificacion: () => Promise<boolean>;
  recuperarClavePorCorreo: (identifier: string) => Promise<{ exito: boolean; mensaje: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export function useSessionController(): UseSessionControllerResult {
  const [technician, setTechnician] = useState<AuthenticatedTechnician | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [canResendVerification, setCanResendVerification] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function restoreSession() {
      try {
        const stored = await getSession();
        if (isMounted && stored) {
          setTechnician(stored);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (identifier: string, pin: string): Promise<boolean> => {
    setErrorMessage(null);
    setWarningMessage(null);
    setCanResendVerification(false);

    const limpio = identifier.trim();
    if (!limpio || !pin.trim()) {
      setErrorMessage('Por favor ingrese su código/correo y contraseña.');
      return false;
    }

    try {
      let correoParaLogin = limpio;
      let docTecnico = null;

      if (!limpio.includes('@')) {
        docTecnico = await buscarTecnicoPorIdentificador(limpio);
        if (!docTecnico) {
          setErrorMessage('No se encontró ningún técnico con ese código de empleado.');
          return false;
        }
        correoParaLogin = docTecnico.correo;
      }

      const userCredential = await signInWithEmailAndPassword(auth, correoParaLogin, pin);
      const user = userCredential.user;

      await user.reload();

      if (!user.emailVerified) {
        setWarningMessage('Por favor revisa tu correo electrónico.');
        setCanResendVerification(true);
        await signOut(auth);
        return false;
      }

      if (!docTecnico) {
        docTecnico = await buscarTecnicoPorIdentificador(user.email || limpio);
      }

      const tecnicoAutenticado: AuthenticatedTechnician = {
        employeeCode: docTecnico ? docTecnico.codigo : limpio.toUpperCase(),
        name: docTecnico ? `${docTecnico.nombre} ${docTecnico.apellido}` : (user.displayName || 'Técnico EPMAPS'),
      };

      await saveSession(tecnicoAutenticado);
      setTechnician(tecnicoAutenticado);
      return true;
    } catch (error: any) {
      const msg = mensajeDeErrorFirebase(error, {
        'auth/invalid-credential': 'El código/correo o la contraseña no coinciden.',
      });
      setErrorMessage(msg);
      return false;
    }
  }, []);

  const reenviarVerificacion = useCallback(async (): Promise<boolean> => {
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setWarningMessage('Hemos reenviado el correo de verificación. Revisa tu bandeja de entrada o spam.');
        setCanResendVerification(false);
        return true;
      }
      return false;
    } catch (error) {
      setErrorMessage('No se pudo reenviar el correo en este momento. Inténtalo más tarde.');
      return false;
    }
  }, []);

  const recuperarClavePorCorreo = useCallback(async (email: string): Promise<{ exito: boolean; mensaje: string }> => {
    const limpio = email.trim().toLowerCase();
    if (!limpio) {
      return { exito: false, mensaje: 'Por favor escribe tu correo electrónico.' };
    }

    if (!limpio.includes('@')) {
      return { exito: false, mensaje: 'Ingresa un formato de correo electrónico válido (ej. usuario@epmaps.gob.ec).' };
    }

    try {
      await sendPasswordResetEmail(auth, limpio);
      return {
        exito: true,
        mensaje: `Hemos enviado un enlace a ${limpio} para restablecer tu contraseña. Revisa tu bandeja de entrada o spam.`,
      };
    } catch (error: any) {
      const msg = mensajeDeErrorFirebase(error, {
        'auth/user-not-found': 'No existe ninguna cuenta registrada con este correo.',
      });
      return { exito: false, mensaje: msg };
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch {
      // Ignora error si ya estaba cerrado en firebase
    }
    await clearSession();
    setTechnician(null);
    setErrorMessage(null);
    setWarningMessage(null);
    setCanResendVerification(false);
  }, []);

  const clearError = useCallback(() => {
    setErrorMessage(null);
    setWarningMessage(null);
    setCanResendVerification(false);
  }, []);

  return {
    technician,
    isAuthenticated: technician !== null,
    isLoading,
    errorMessage,
    warningMessage,
    canResendVerification,
    login,
    reenviarVerificacion,
    recuperarClavePorCorreo,
    logout,
    clearError,
  };
}
