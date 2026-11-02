import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  StretchInY,
  StretchOutY,
  Easing,
} from 'react-native-reanimated';

interface ForgotPasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (email: string) => Promise<{ exito: boolean; mensaje: string }>;
}

export function ForgotPasswordModal({
  visible,
  onClose,
  onSubmit,
}: ForgotPasswordModalProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null);

  const handleSend = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setFeedback({
        tipo: 'error',
        mensaje: 'Por favor escribe tu correo electrónico.',
      });
      return;
    }

    if (!cleanEmail.includes('@')) {
      setFeedback({
        tipo: 'error',
        mensaje: 'Ingresa un formato de correo electrónico válido.',
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const resp = await onSubmit(cleanEmail);
      if (resp.exito) {
        setFeedback({ tipo: 'exito', mensaje: resp.mensaje });
        setEmail('');
      } else {
        setFeedback({ tipo: 'error', mensaje: resp.mensaje });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFeedback(null);
    setEmail('');
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black/60 items-center justify-center px-6">
        <Animated.View
          entering={StretchInY.duration(500).easing(Easing.inOut(Easing.quad))}
          exiting={StretchOutY.duration(600).easing(Easing.inOut(Easing.quad))}
          className="w-full bg-white rounded-3xl p-6 shadow-xl border border-slate-100"
        >
          {/* Encabezado */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Text className="text-lg font-bold text-slate-800">
                Recuperar acceso
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center active:opacity-70"
            >
              <Ionicons name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Text className="text-xs text-slate-500 mb-4 leading-4">
            Ingresa tu correo electrónico registrado. Te enviaremos un enlace oficial de restablecimiento seguro.
          </Text>

          {/* Campo de Entrada */}
          <View className="mb-4">
            <Text className="text-xs font-semibold text-slate-700 mb-1.5">
              Correo electrónico
            </Text>
            <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
              <Ionicons
                name="mail-outline"
                size={18}
                color="#64748B"
                style={{ marginRight: 10 }}
              />
              <TextInput
                className="flex-1 text-sm text-slate-900 font-medium p-0"
                placeholder="Ej. juan.perez@epmaps.gob.ec"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={(text) => {
                  if (feedback) setFeedback(null);
                  setEmail(text);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Mensajes de Respuesta (Éxito o Error) */}
          {feedback ? (
            <View
              className={`p-3 rounded-xl mb-4 border flex-row items-start ${
                feedback.tipo === 'exito'
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <Ionicons
                name={feedback.tipo === 'exito' ? 'checkmark-circle' : 'alert-circle'}
                size={18}
                color={feedback.tipo === 'exito' ? '#059669' : '#DC2626'}
                style={{ marginRight: 8, marginTop: 1 }}
              />
              <Text
                className={`text-xs font-medium flex-1 leading-4 ${
                  feedback.tipo === 'exito' ? 'text-emerald-800' : 'text-red-700'
                }`}
              >
                {feedback.mensaje}
              </Text>
            </View>
          ) : null}

          {/* Botones */}
          <View className="flex-row gap-2.5">
            <TouchableOpacity
              className="flex-1 h-12 rounded-xl bg-slate-100 items-center justify-center active:opacity-80"
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text className="text-slate-700 text-sm font-semibold">
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 h-12 rounded-xl bg-[#245FA8] items-center justify-center active:opacity-90 ${
                isSubmitting ? 'opacity-60' : ''
              }`}
              onPress={handleSend}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white text-sm font-bold">
                  Enviar enlace
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

