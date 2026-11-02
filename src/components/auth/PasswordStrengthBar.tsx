import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedRef,
  measure,
  interpolateColor,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';

export interface ZxcvbnStrengthProps {
  score: number; 
  isEmpty: boolean;
}

const SCORE_LABELS = ['Muy Débil', 'Débil', 'Aceptable', 'Buena', 'Muy Segura'];
const SCORE_COLORS = ['#EF4444', '#F87171', '#F59E0B', '#10B981', '#059669'];

function getFeedbackMessage(score: number): string {
  if (score <= 1) {
    return 'Muy vulnerable. Evite palabras comunes, secuencias o fechas. Use una combinación más larga y variada.';
  }
  if (score === 2) {
    return 'Seguridad aceptable. El patrón es reconocible; agregue más caracteres o use palabras completamente aleatorias.';
  }
  return 'Contraseña robusta y segura. Excelente nivel de protección.';
}

export function PasswordStrengthBar({ score, isEmpty }: ZxcvbnStrengthProps) {
  const animatedRef = useAnimatedRef<View>();

  const progress = useSharedValue(0);
  const barWidth = useSharedValue(0);

  useEffect(() => {
    if (isEmpty) {
      progress.value = withTiming(0, { duration: 250 });
      return;
    }

    const target = Math.max(0.2, (score + 1) / 5);

    progress.value = withTiming(target, {
      duration: 380,
      easing: Easing.out(Easing.cubic),
    });

    scheduleOnUI(() => {
      'worklet';
      if (!animatedRef) return;
      const measurement = measure(animatedRef);
      if (measurement) {
        barWidth.value = measurement.width;
      }
    });
  }, [score, isEmpty]);

  const animatedStyle = useAnimatedStyle(() => {
    const currentWidth = barWidth.value * progress.value;

    return {
      width: currentWidth,
      backgroundColor: interpolateColor(
        progress.value,
        [0, 0.25, 0.5, 0.75, 1],
        ['#CBD5E1', '#EF4444', '#F59E0B', '#10B981', '#059669']
      ),
    };
  });

  if (isEmpty) return null;

  return (
    <View className="mt-2.5 w-full">
      <Animated.View
        ref={animatedRef}
        collapsable={false}
        style={{
          width: '100%',
          height: 6,
          backgroundColor: '#E2E8F0',
          borderRadius: 999,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
        }}
      >
        <Animated.View
          style={[
            {
              height: 6,
              borderRadius: 999,
            },
            animatedStyle,
          ]}
        />
      </Animated.View>

      {/* Etiqueta con nivel NIST y mensaje descriptivo en español */}
      <View className="mt-1.5">
        <View className="flex-row items-center justify-between mb-0.5">
          <Text className="text-[11px] font-semibold text-slate-600">
            Seguridad: <Text style={{ color: SCORE_COLORS[score] || '#EF4444' }}>{SCORE_LABELS[score] || 'Débil'}</Text>
          </Text>
        </View>
        <Text className="text-[10px] text-slate-500 leading-3.5">
          {getFeedbackMessage(score)}
        </Text>
      </View>
    </View>
  );
}
