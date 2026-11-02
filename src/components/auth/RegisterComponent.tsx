import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { zxcvbn } from 'zxcvbn-typescript';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { mensajeDeErrorFirebase } from '@/lib/errores-firebase';
import {
  generarSiguienteCodigoTecnico,
  registrarDatosTecnicoEnFirestore,
} from '@/services/tecnicosFirestore';
import { PasswordStrengthBar } from './PasswordStrengthBar';
import { RegisterSuccessModal, RegisterSuccessModalData } from './RegisterSuccessModal';

interface RegisterComponentProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
}

export function RegisterComponent({ onSuccess, onSwitchToLogin }: RegisterComponentProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalData, setModalData] = useState<RegisterSuccessModalData | null>(null);

  const zxcvbnResult = useMemo(() => {
    if (!password) return null;
    return zxcvbn(password);
  }, [password]);

  const handleRegister = async () => {
    Keyboard.dismiss();

    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanFirstName || !cleanLastName || !cleanEmail || !password.trim()) {
      Alert.alert('Campos incompletos', 'Por favor complete todos los campos del formulario.');
      return;
    }

    if (zxcvbnResult && zxcvbnResult.score < 2) {
      Alert.alert(
        'Contraseña vulnerable',
        'Por favor ingrese una contraseña más robusta (mínimo nivel Aceptable).'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const nuevoCodigo = await generarSiguienteCodigoTecnico();

      const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);

      const nombreCompleto = `${cleanFirstName} ${cleanLastName}`;
      await updateProfile(credential.user, {
        displayName: nombreCompleto,
      });

      await sendEmailVerification(credential.user);

      await registrarDatosTecnicoEnFirestore({
        uid: credential.user.uid,
        nombre: cleanFirstName,
        apellido: cleanLastName,
        correo: cleanEmail,
        codigo: nuevoCodigo,
        distrito: 'Sin distrito asignado',
      });

      setModalData({
        nombreCompleto,
        codigoAsignado: nuevoCodigo,
        correo: cleanEmail,
      });
    } catch (error) {
      const mensaje = mensajeDeErrorFirebase(error);
      Alert.alert('Error de registro', mensaje);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCerrarAlertaYContinuar = () => {
    setModalData(null);
    onSuccess();
    onSwitchToLogin();
  };

  return (
    <View className="w-full">
      {/* Tarjeta de Formulario Principal */}
      <View className="bg-white/95 rounded-3xl p-6 shadow-sm border border-slate-200/80">
        <View className="mb-4">
          <Text className="text-lg font-bold text-slate-800">
            Registro de técnicos
          </Text>
        </View>

        {/* Nombres y Apellidos en dos columnas */}
        <View className="flex-row gap-3 mb-3">
          <View className="flex-1">
            <Text className="text-xs font-semibold text-slate-700 mb-1">
              Nombre
            </Text>
            <View className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <TextInput
                className="text-sm text-slate-900 font-medium p-0"
                placeholder="Ej. Juan"
                placeholderTextColor="#94A3B8"
                value={firstName}
                onChangeText={setFirstName}
                autoCorrect={false}
              />
            </View>
          </View>
          <View className="flex-1">
            <Text className="text-xs font-semibold text-slate-700 mb-1">
              Apellido
            </Text>
            <View className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <TextInput
                className="text-sm text-slate-900 font-medium p-0"
                placeholder="Ej. Pérez"
                placeholderTextColor="#94A3B8"
                value={lastName}
                onChangeText={setLastName}
                autoCorrect={false}
              />
            </View>
          </View>
        </View>

        {/* Correo Electrónico */}
        <View className="mb-3">
          <Text className="text-xs font-semibold text-slate-700 mb-1">
            Correo electrónico
          </Text>
          <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <Ionicons
              name="mail-outline"
              size={18}
              color="#64748B"
              style={{ marginRight: 8 }}
            />
            <TextInput
              className="flex-1 text-sm text-slate-900 font-medium p-0"
              placeholder="Ej. juan.perez@epmaps.gob.ec"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Contraseña con Medidor de Fortaleza Reanimated */}
        <View className="mb-4">
          <Text className="text-xs font-semibold text-slate-700 mb-1">
            Contraseña
          </Text>
          <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color="#64748B"
              style={{ marginRight: 8 }}
            />
            <TextInput
              className="flex-1 text-sm text-slate-900 font-medium p-0"
              placeholder="Cree una contraseña segura"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color="#64748B"
              />
            </TouchableOpacity>
          </View>

          {/* Barra indicadora con zxcvbn + Reanimated (measure & interpolateColor) */}
          <PasswordStrengthBar
            score={zxcvbnResult ? zxcvbnResult.score : 0}
            isEmpty={!password}
          />
        </View>

        {/* Botón Guardar y Registrar */}
        <TouchableOpacity
          className={`h-12 rounded-xl bg-[#245FA8] items-center justify-center flex-row shadow-sm mt-1 ${
            isSubmitting ? 'opacity-60' : 'active:opacity-90'
          }`}
          onPress={handleRegister}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View className="flex-row items-center justify-center">
              <Text className="text-white text-base font-bold">
                Registrar Técnico
              </Text>
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color="#FFFFFF"
                style={{ marginLeft: 8 }}
              />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal Independiente de Registro Exitoso */}
      <RegisterSuccessModal
        visible={modalData !== null}
        data={modalData}
        onConfirm={handleCerrarAlertaYContinuar}
      />
    </View>
  );
}
