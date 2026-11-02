import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSessionController } from '@/presentation/session/useSessionController';
import { ForgotPasswordModal } from './ForgotPasswordModal';

interface LoginComponentProps {
  onSuccess: () => void;
  onSwitchToRegister: () => void;
}

export function LoginComponent({ onSuccess, onSwitchToRegister }: LoginComponentProps) {
  const {
    login,
    errorMessage,
    warningMessage,
    recuperarClavePorCorreo,
    clearError,
  } = useSessionController();

  const [employeeCode, setEmployeeCode] = useState('');
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const success = await login(employeeCode, pin);
      if (success) {
        onSuccess();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCodeChange = (text: string) => {
    if (errorMessage || warningMessage) clearError();
    setEmployeeCode(text);
  };

  const handlePinChange = (text: string) => {
    if (errorMessage || warningMessage) clearError();
    setPin(text);
  };

  return (
    <View className="w-full">
      {/* Tarjeta de Formulario Principal */}
      <View className="bg-white/95 rounded-3xl p-6 shadow-sm border border-slate-200/80">
        <View className="mb-5">
          <Text className="text-lg font-bold text-slate-800">
            Iniciar turno
          </Text>
        </View>

        {/* Campo: Código de empleado */}
        <View className="mb-4">
          <Text className="text-xs font-semibold text-slate-700 mb-1.5">
            Código de empleado
          </Text>
          <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
            <Ionicons
              name="id-card-outline"
              size={18}
              color="#64748B"
              style={{ marginRight: 10 }}
            />
            <TextInput
              className="flex-1 text-sm text-slate-900 font-medium p-0"
              placeholder="Ej. TEC-001"
              placeholderTextColor="#94A3B8"
              value={employeeCode}
              onChangeText={handleCodeChange}
              autoCapitalize="characters"
              autoCorrect={false}
              accessibilityLabel="Campo de código de empleado"
            />
          </View>
        </View>

        {/* Campo: Clave de acceso */}
        <View className="mb-4">
          <Text className="text-xs font-semibold text-slate-700 mb-1.5">
            Clave de acceso
          </Text>
          <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color="#64748B"
              style={{ marginRight: 10 }}
            />
            <TextInput
              className="flex-1 text-sm text-slate-900 font-medium p-0"
              placeholder="Ingrese su clave"
              placeholderTextColor="#94A3B8"
              value={pin}
              onChangeText={handlePinChange}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Campo de clave de acceso"
            />
          </View>
          {/* Enlace: ¿Olvidaste tu contraseña? */}
          <TouchableOpacity
            className="self-end mt-1.5 py-0.5 active:opacity-70"
            onPress={() => setShowForgotModal(true)}
            accessibilityRole="button"
            accessibilityLabel="Recuperar contraseña"
          >
            <Text className="text-xs font-semibold text-[#245FA8]">
              ¿Olvidaste tu contraseña?
            </Text>
          </TouchableOpacity>
        </View>

        {/* Mensaje de Advertencia: Cuenta no verificada (Amarillo) */}
        {warningMessage ? (
          <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <View className="flex-row items-center mb-1">
              <Ionicons
                name="warning-outline"
                size={18}
                color="#D97706"
                style={{ marginRight: 8 }}
              />
              <Text className="text-xs font-bold text-amber-900 flex-1">
                Verificación requerida
              </Text>
            </View>
            <Text className="text-xs text-amber-800 leading-4">
              {warningMessage}
            </Text>
          </View>
        ) : null}

        {/* Mensaje de Error (Rojo) */}
        {errorMessage ? (
          <View className="flex-row items-center bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <Ionicons
              name="alert-circle"
              size={16}
              color="#DC2626"
              style={{ marginRight: 8 }}
            />
            <Text className="text-xs text-red-700 flex-1 font-medium">
              {errorMessage}
            </Text>
          </View>
        ) : null}

        {/* Botón: Iniciar Turno */}
        <TouchableOpacity
          className={`h-12 rounded-xl bg-[#245FA8] items-center justify-center flex-row shadow-sm mt-1 ${
            isSubmitting ? 'opacity-60' : 'active:opacity-90'
          }`}
          onPress={handleLogin}
          disabled={isSubmitting}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Iniciar Turno"
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View className="flex-row items-center justify-center">
              <Text className="text-white text-base font-bold">
                Iniciar Turno
              </Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color="#FFFFFF"
                style={{ marginLeft: 8 }}
              />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal de Recuperación de Contraseña por Correo */}
      <ForgotPasswordModal
        visible={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        onSubmit={recuperarClavePorCorreo}
      />
    </View>
  );
}
