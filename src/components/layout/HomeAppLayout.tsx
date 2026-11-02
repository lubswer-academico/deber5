import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSessionController } from '@/presentation/session/useSessionController';
import { useGlobalStatusController } from '@/presentation/session/useGlobalStatusController';
import { CiudadSkylineSvg } from '@/components/illustrations/VectorIllustrations';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');

interface HomeAppLayoutProps {
  children: React.ReactNode;
  showLogoutButton?: boolean;
}

export function HomeAppLayout({
  children,
  showLogoutButton = true,
}: HomeAppLayoutProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPadding = insets.top > 0 ? insets.top : 12;

  const { logout } = useSessionController();
  const { isOnline, pendingCount, pendingLabel, connectionLabel } = useGlobalStatusController();

  const handleLogout = async () => {
    await logout();
    router.replace('/principal');
  };

  const cityHeight = SCREEN_WIDTH * 0.45;
  const topBannerHeight = Math.round(SCREEN_HEIGHT * 0.75);

  return (
    <View className="flex-1 bg-[#245FA8]">
      {/* Barra de estado oscura sobre fondo claro */}
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent={true}
      />

      {/* 1. Fondo blanco extendido al 75% de la pantalla con curva inferior */}
      <View
        className="absolute top-0 left-0 right-0 bg-[#fdfdfd] rounded-b-[40px] z-0"
        style={{ height: topBannerHeight }}
      />

      {/* 2. Fondo SVG de la Ciudad de Quito anclado abajo sobre la franja azul */}
      <View
        className="absolute bottom-0 left-0 right-0 z-0 items-center justify-end opacity-25"
        pointerEvents="none"
      >
        <CiudadSkylineSvg
          width={SCREEN_WIDTH}
          height={cityHeight}
          color="#fdfdfd"
        />
      </View>

      {/* 3. Cabecera fija: Señal (izq), EPMAPS (centro), Pendientes (der) con delineado inferior */}
      <View
        className="w-full px-4 pb-4 z-10"
        style={{
          paddingTop: topPadding + 4,
        }}
      >
        <View className="flex-row items-center justify-between">
          {/* Señal */}
          <View
            className={`flex-row items-center pb-1 border-b ${
              isOnline ? 'border-[#003366]' : 'border-red-600'
            }`}
          >
            <Ionicons
              name={isOnline ? 'cellular' : 'cellular-outline'}
              size={14}
              color={isOnline ? '#003366' : '#DC2626'}
              style={{ marginRight: 5 }}
            />
            <Text
              className={`text-xs font-bold tracking-wide ${
                isOnline ? 'text-[#003366]' : 'text-red-700'
              }`}
            >
              {connectionLabel}
            </Text>
          </View>

          {/* Título EPMAPS */}
          <Text
            className="text-[26px] font-kaushan text-[#003366] tracking-wider"
            style={{ fontFamily: 'KaushanScript_400Regular' }}
          >
            EPMAPS
          </Text>

          {/* Pendientes */}
          <TouchableOpacity
            onPress={() => router.push('/reading-queue')}
            activeOpacity={0.7}
            className={`flex-row items-center pb-1 border-b ${
              pendingCount > 0 ? 'border-amber-500' : 'border-[#003366]'
            }`}
          >
            <Text
              className={`text-xs font-bold tracking-wide ${
                pendingCount > 0 ? 'text-amber-900' : 'text-[#003366]'
              }`}
            >
              {pendingLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. Contenedor de contenido dinámico de la pantalla */}
      <View className="flex-1 z-10">
        {children}

        {/* 5. Botón común de Cerrar Sesión en la parte inferior */}
        {showLogoutButton && (
          <View
            className="items-center justify-center pt-1"
            style={{ marginBottom: Math.max(insets.bottom + 210, 36) }}
          >
            <TouchableOpacity
              className="flex-row items-center justify-center py-2.5 px-6 rounded-full bg-white/10 active:opacity-60"
              onPress={handleLogout}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Cerrar sesión"
            >
              <Ionicons
                name="log-out-outline"
                size={18}
                color="#003366"
                style={{ marginRight: 6 }}
              />
              <Text className="text-[#003366] text-sm font-bold">
                Cerrar sesión
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

