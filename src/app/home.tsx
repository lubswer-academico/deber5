import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSessionController } from '@/presentation/session/useSessionController';
import { useGlobalStatusController } from '@/presentation/session/useGlobalStatusController';
import { HomeAppLayout } from '@/components/layout/HomeAppLayout';

import Animated, {
  SlideOutRight,
  Easing,
} from 'react-native-reanimated';

export default function HomeScreen() {
  const router = useRouter();
  const { technician } = useSessionController();
  const { pendingCount } = useGlobalStatusController();

  const [isExitingSearch, setIsExitingSearch] = useState(false);
  const [isExitingQueue, setIsExitingQueue] = useState(false);
  const [isExitingPending, setIsExitingPending] = useState(false);

  const handleNavigate = (route: string, setExiting: (val: boolean) => void) => {
    setExiting(true);
    setTimeout(() => {
      router.push(route as any);
      setExiting(false); 
    }, 300);
  };

  const todayDate = new Date().toLocaleDateString('es-EC', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <HomeAppLayout>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 22,
          paddingTop: 16,
          paddingBottom: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ZONA 1: JORNADA DE CAMPO */}
        <View className="pb-5 mb-5 border-b border-slate-200/90">
          <View className="flex-row items-center justify-between mb-1.5">
            <Text className="text-xs font-extrabold text-[#245FA8] tracking-widest uppercase">
              Jornada de Campo
            </Text>
            <View className="px-2.5 py-0.5">
              <Text className="text-xs font-mono text-[#003366] font-bold">
                {technician?.employeeCode ?? 'TEC'}
              </Text>
            </View>
          </View>
          <Text className="text-2xl font-bold text-[#003366] tracking-tight">
            {technician?.name ?? 'Técnico de Campo'}
          </Text>
          <Text className="text-xs text-slate-500 font-medium capitalize mt-1.5">
            {todayDate}
          </Text>
        </View>

        {/* ZONA 2: HERRAMIENTAS Y ACCIONES */}
        <View className="gap-3.5 mb-2">
          {/* Botón 1: Buscar Medidor */}
          {!isExitingSearch ? (
            <Animated.View
              exiting={SlideOutRight.duration(300).easing(Easing.inOut(Easing.quad))}
            >
              <TouchableOpacity
                className="w-full bg-white p-4 rounded-2xl shadow-sm border border-slate-200/90 flex-row items-center justify-between active:bg-slate-50"
                onPress={() => handleNavigate('/meter-search', setIsExitingSearch)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Buscar Medidor"
              >
                <View className="flex-row items-center gap-3.5 flex-1 mr-2">
                  <View className="w-12 h-12 rounded-xl bg-blue-50 items-center justify-center">
                    <Ionicons name="search" size={24} color="#245FA8" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-[#003366]">
                      Buscar Medidor
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#003366" />
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <View className="w-full p-4 rounded-2xl opacity-0">
              <View className="h-12" />
            </View>
          )}

          {/* Botón 2: Bandeja de Lecturas */}
          {!isExitingQueue ? (
            <Animated.View
              exiting={SlideOutRight.duration(300).easing(Easing.inOut(Easing.quad))}
            >
              <TouchableOpacity
                className="w-full bg-white p-4 rounded-2xl shadow-sm border border-slate-200/90 flex-row items-center justify-between active:bg-slate-50"
                onPress={() => handleNavigate('/reading-queue', setIsExitingQueue)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Bandeja de Lecturas"
              >
                <View className="flex-row items-center gap-3.5 flex-1 mr-2">
                  <View className="w-12 h-12 rounded-xl bg-blue-50/70 items-center justify-center">
                    <Ionicons name="file-tray-stacked-outline" size={24} color="#003366" />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-base font-bold text-[#003366]">
                        Bandeja de Lecturas
                      </Text>
                      {pendingCount > 0 ? (
                        <View className="bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                          <Text className="text-amber-800 text-xs font-bold font-mono">
                            {pendingCount}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#003366" />
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <View className="w-full p-4 rounded-2xl opacity-0">
              <View className="h-12" />
            </View>
          )}

          {/* Botón 3: Lecturas en Cola */}
          {!isExitingPending ? (
            <Animated.View
              exiting={SlideOutRight.duration(300).easing(Easing.inOut(Easing.quad))}
            >
              <TouchableOpacity
                className="w-full bg-white p-4 rounded-2xl shadow-sm border border-slate-200/90 flex-row items-center justify-between active:bg-slate-50"
                onPress={() => handleNavigate('/reading-queue', setIsExitingPending)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Lecturas en Cola"
              >
                <View className="flex-row items-center gap-3.5 flex-1 mr-2">
                  <View className="w-12 h-12 rounded-xl bg-blue-50/70 items-center justify-center">
                    <Ionicons name="time-outline" size={24} color="#003366" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-[#003366]">
                      Lecturas en Cola
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center gap-2">
                  <View className="bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                    <Text className="text-sm font-bold text-[#003366] font-mono">
                      {pendingCount}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#003366" />
                </View>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <View className="w-full p-4 rounded-2xl opacity-0">
              <View className="h-12" />
            </View>
          )}
        </View>
      </ScrollView>
    </HomeAppLayout>
  );
}
