import React from 'react';
import Svg, { Path } from 'react-native-svg';
import svgData from './svgData.json';

interface SvgProps {
  width?: number | string;
  height?: number | string;
  color?: string;
}

export function CiudadSkylineSvg({
  width = '100%',
  height = 160,
  color = '#4A8BB2',
}: SvgProps) {
  const { viewBox, dList } = svgData.ciudad;

  return (
    <Svg width={width} height={height} viewBox={viewBox} fill="none">
      {dList.map((d, index) => (
        <Path key={index} d={d} fill={color} fillRule="evenodd" />
      ))}
    </Svg>
  );
}

export function ManoIzquierdaBrazoSvg({
  width = 160,
  height = 120,
  color = '#4A8BB2',
}: SvgProps) {
  const { viewBox, dList } = svgData.manoDer;

  return (
    <Svg width={width} height={height} viewBox={viewBox} fill="none">
      {dList.map((d, index) => (
        <Path key={index} d={d} fill={color} fillRule="evenodd" />
      ))}
    </Svg>
  );
}

export function ManoDerechaBrazoSvg({
  width = 160,
  height = 120,
  color = '#4A8BB2',
}: SvgProps) {
  const { viewBox, dList } = svgData.manoIzq;

  return (
    <Svg width={width} height={height} viewBox={viewBox} fill="none">
      {dList.map((d, index) => (
        <Path key={index} d={d} fill={color} fillRule="evenodd" />
      ))}
    </Svg>
  );
}

