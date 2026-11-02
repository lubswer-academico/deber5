import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { GotaWaterSvg } from './GotaWaterSvg';
import {
  CiudadSkylineSvg,
  ManoIzquierdaBrazoSvg,
  ManoDerechaBrazoSvg,
} from './VectorIllustrations';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');

export const PRINCIPAL_THEME_COLOR = "#245FA8";

export const GOTA_WATER_COLOR = "#245FA8";

export const CIUDAD_SKYLINE_COLOR = "#779cb4a6";

export const HEADER_BANNER_HEIGHT = Math.round(SCREEN_HEIGHT * 0.10);

export function PrincipalBackgroundIllustration({
  strokeColor = PRINCIPAL_THEME_COLOR,
  gotaColor = GOTA_WATER_COLOR,
  ciudadColor = CIUDAD_SKYLINE_COLOR,
}: {
  strokeColor?: string;
  gotaColor?: string;
  ciudadColor?: string;
}) {
  const handWidth = SCREEN_WIDTH * 0.35;
  const handHeight = 125;
  const cityHeight = SCREEN_WIDTH * 0.44;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* 1. Sección Superior del mismo color de las manos */}
      <View
        style={[
          styles.topBannerSection,
          { backgroundColor: strokeColor, height: HEADER_BANNER_HEIGHT },
        ]}
      />

      {/* 2. Contenedor de Manos Espejadas y Gota solapando la franja */}
      <View style={[styles.topIllustrationContainer, { top: HEADER_BANNER_HEIGHT - 12 }]}>
        {/* Mano anclada a la izquierda */}
        <View style={styles.handLeftWrapper}>
          <ManoIzquierdaBrazoSvg
            width={handWidth}
            height={handHeight}
            color={strokeColor}
          />
        </View>

        {/* Gota Central en Vector Puro (con su propio color) */}
        <View style={styles.waterDropWrapper}>
          <GotaWaterSvg width={46} height={70} color={gotaColor} strokeWidth={7} />
        </View>

        {/* Mano derecha (espejo simétrico) */}
        <View style={styles.handRightMirrorWrapper}>
          <ManoIzquierdaBrazoSvg
            width={handWidth}
            height={handHeight}
            color={strokeColor}
          />
        </View>
      </View>

      {/* 3. Contenedor Inferior: Skyline de Quito en Vector SVG Puro (con su propio color) */}
      <View style={styles.bottomIllustrationContainer}>
        <CiudadSkylineSvg
          width={SCREEN_WIDTH}
          height={cityHeight}
          color={ciudadColor}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBannerSection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  topIllustrationContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.95,
  },
  waterDropWrapper: {
    position: 'absolute',
    top: 24,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handLeftWrapper: {
    position: 'absolute',
    top:-16,
    left: -2, // Ligeramente solapado al borde para fundir con la cabecera
    zIndex: 1,
  },
  handRightMirrorWrapper: {
    position: 'absolute',
    top: -16,
    right: -2, // Ligeramente solapado al borde derecho para fundir con la cabecera
    zIndex: 1,
    transform: [{ scaleX: -1 }], // Reflejo en espejo exacto
  },
  bottomIllustrationContainer: {
    position: 'absolute',
    bottom: -4,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    opacity: 0.9,
  },
});
