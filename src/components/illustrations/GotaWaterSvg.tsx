import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface SvgIconProps {
  width?: number | string;
  height?: number | string;
  color?: string;
  strokeWidth?: number;
}

export function GotaWaterSvg({
  width = 48,
  height = 72,
  color = '#4A8BB2',
  strokeWidth = 4,
}: SvgIconProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 100 160" fill="none">
      {/* Contorno exterior de la gota de agua */}
      <Path
        d="M50 8 C50 8 12 68 12 104 C12 132 29 152 50 152 C71 152 88 132 88 104 C88 68 50 8 50 8 Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Brillo / reflejo curvado interno inferior */}
      <Path
        d="M68 108 C68 124 58 136 48 136"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

