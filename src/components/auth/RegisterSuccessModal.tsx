import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  StretchInY,
  StretchOutY,
  Easing,
} from 'react-native-reanimated';

export interface RegisterSuccessModalData {
  nombreCompleto: string;
  codigoAsignado: string;
  correo: string;
}

interface RegisterSuccessModalProps {
  visible: boolean;
  data: RegisterSuccessModalData | null;
  onConfirm: () => void;
}

export function RegisterSuccessModal({
  visible,
  data,
  onConfirm,
}: RegisterSuccessModalProps) {
  if (!visible || !data) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onConfirm}
    >
      <View className="flex-1 bg-black/60 items-center justify-center px-6">
        <Animated.View
          entering={StretchInY.duration(300).easing(Easing.inOut(Easing.quad))}
          exiting={StretchOutY.duration(300).easing(Easing.inOut(Easing.quad))}
          className="w-full bg-white rounded-3xl p-6 items-center shadow-xl border border-slate-100"
        >
          {/* Ícono de éxito */}

          <Text className="text-xl font-bold text-slate-800 text-center mb-1">
            ¡Registro Exitoso!
          </Text>
          <Text className="text-xs text-slate-500 text-center mb-5">
            Técnico {data.nombreCompleto}
          </Text>

          {/* Tarjeta destacada con el Código Asignado */}
          <View className="w-full border border-slate-200 rounded-2xl p-4 items-center mb-4">
            <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Tu Código de Técnico
            </Text>
            <Text className="text-2xl font-black text-[#245FA8] tracking-widest">
              {data.codigoAsignado}
            </Text>
            <Text className="text-[11px] text-slate-400 mt-1 text-center">
              Conserva este código para identificarte en tus jornadas
            </Text>
          </View>

          {/* Aviso de Correo de Confirmación Enviado */}
          <View className="w-full bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 flex-row items-center mb-6">
            <Ionicons
              name="mail-unread"
              size={22}
              color="#D97706"
              style={{ marginRight: 10 }}
            />
            <View className="flex-1">
              <Text className="text-xs font-bold text-amber-900">
                Antes de poder iniciar sesión, debes verificar tu correo electrónico.
              </Text>
            </View>
          </View>

          {/* Botón de acción */}
          <TouchableOpacity
            className="w-full h-12 rounded-xl bg-[#245FA8] items-center justify-center active:opacity-90"
            onPress={onConfirm}
            activeOpacity={0.85}
          >
            <Text className="text-white text-base font-bold">
              Entendido, Ir a Iniciar Sesión
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

