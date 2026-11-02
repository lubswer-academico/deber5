import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  PrincipalBackgroundIllustration,
  HEADER_BANNER_HEIGHT,
  PRINCIPAL_THEME_COLOR,
} from '@/components/illustrations/PrincipalBackgroundIllustration';
import { LoginComponent } from '@/components/auth/LoginComponent';
import { RegisterComponent } from '@/components/auth/RegisterComponent';
import Animated, {
  FlipInYRight,
  FadeOut,
  Easing,
  LinearTransition,
  useAnimatedKeyboard,
  useAnimatedStyle,
} from 'react-native-reanimated';

type AuthMode = 'login' | 'register';

export default function PrincipalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPadding = insets.top > 0 ? insets.top : 12;

  const [authMode, setAuthMode] = useState<AuthMode>('login');

  const keyboard = useAnimatedKeyboard({
    isStatusBarTranslucentAndroid: true,
  });

  const formKeyboardAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: -keyboard.height.value * 0.50 }],
    };
  });
  const tabBarAnimatedStyle = useAnimatedStyle(() => {
    const isUp = keyboard.height.value > 20;
    return {
      opacity: isUp ? 0 : 1,
      transform: [{ translateY: isUp ? -15 : 0 }],
      pointerEvents: isUp ? 'none' : 'auto',
    };
  });

  return (
    <View className="flex-1 bg-slate-50">
        {/* 1. Fondo vectorial: Cabecera superior + Manos naciendo de ella + Quito anclado abajo */}
        <PrincipalBackgroundIllustration strokeColor={PRINCIPAL_THEME_COLOR} />

        {/* 2. Título centrado dentro del banner superior */}
        <View
          className="absolute top-0 left-0 right-0 items-center justify-center z-10"
          style={{
            height: HEADER_BANNER_HEIGHT,
            paddingTop: topPadding,
          }}
        >
          <Text
            className="text-[28px] font-kaushan text-white tracking-wider"
            style={{ fontFamily: 'KaushanScript_400Regular' }}
          >
            EPMAPS
          </Text>
        </View>

        {/* 3. Selector de Pestañas Unido Fijo */}
        <Animated.View
          className="absolute left-0 right-0 items-center z-20"
          style={[{ top: HEADER_BANNER_HEIGHT + 100 }, tabBarAnimatedStyle]}
        >
          <View className="flex-row bg-slate-200/90 p-1 rounded-2xl border border-slate-300/70 shadow-sm">
            <TouchableOpacity
              onPress={() => setAuthMode('login')}
              activeOpacity={0.8}
              className={`px-6 py-2 rounded-xl transition-all ${
                authMode === 'login'
                  ? 'bg-white shadow-sm'
                  : 'bg-transparent'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  authMode === 'login' ? 'text-[#245FA8]' : 'text-slate-600'
                }`}
              >
                Iniciar Sesión
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setAuthMode('register')}
              activeOpacity={0.8}
              className={`px-6 py-2 rounded-xl transition-all ${
                authMode === 'register'
                  ? 'bg-white shadow-sm'
                  : 'bg-transparent'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  authMode === 'register' ? 'text-[#245FA8]' : 'text-slate-600'
                }`}
              >
                Registro
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* 4. Capa de contenido central para Login / Registro */}
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'flex-start',
            paddingHorizontal: 20,
            paddingTop: HEADER_BANNER_HEIGHT + 155,
            paddingBottom: 170,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Contenedor envolvente que absorbe la elevación del teclado y anima el cambio de tamaño */}
          <Animated.View
            layout={LinearTransition.duration(280)}
            style={formKeyboardAnimatedStyle}
            className="w-full"
          >
            {authMode === 'login' ? (
              <Animated.View
                key="login-form-card"
                entering={FlipInYRight.duration(500).easing(Easing.out(Easing.quad))}
                exiting={FadeOut.duration(650).easing(Easing.in(Easing.quad))}
                className="w-full"
              >
                <LoginComponent
                  onSuccess={() => router.replace('/home')}
                  onSwitchToRegister={() => setAuthMode('register')}
                />
              </Animated.View>
            ) : (
              <Animated.View
                key="register-form-card"
                entering={FlipInYRight.duration(500).easing(Easing.out(Easing.quad))}
                exiting={FadeOut.duration(650).easing(Easing.in(Easing.quad))}
                className="w-full"
              >
                <RegisterComponent
                  onSuccess={() => setAuthMode('login')}
                  onSwitchToLogin={() => setAuthMode('login')}
                />
              </Animated.View>
            )}
          </Animated.View>
        </ScrollView>
      </View>
  );
}
