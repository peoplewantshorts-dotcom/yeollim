import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { color } from '../theme';

/**
 * 열림 라인 마크.
 *
 * 문틀과 열린 문, 그리고 문 앞으로 부드럽게 이어지는 경사로.
 * '턱이 있어도 길은 이어진다'는 앱의 주장을 한 획으로 그린 것이다.
 * 색을 빼고 흑백으로 출력해도 형태만으로 읽힌다.
 */
export function DoorMark({
  size = 220,
  stroke = color.primary,
}: {
  size?: number;
  stroke?: string;
}) {
  return (
    <Svg
      width={size}
      height={size * 0.86}
      viewBox="0 0 200 172"
      accessibilityRole="image"
      accessibilityLabel="열린 문과 문 앞으로 이어지는 경사로"
    >
      {/* 바닥선 — 흐리게 깔아 두어 경사로가 어디로 내려오는지 보이게 한다 */}
      <Path d="M14 152 H186" stroke={stroke} strokeWidth={3} strokeLinecap="round" opacity={0.22} />

      {/* 경사로 — 바닥에서 문지방까지 한 번에 올라가는 곡선 */}
      <Path
        d="M16 152 C 42 152, 56 146, 74 133"
        stroke={stroke}
        strokeWidth={3.5}
        strokeLinecap="round"
        fill="none"
      />

      {/* 문틀 */}
      <Rect x={74} y={24} width={70} height={109} rx={5} stroke={stroke} strokeWidth={3.5} fill="none" />

      {/* 열린 문짝 */}
      <Path
        d="M144 30 L184 15 V152 L144 133 Z"
        stroke={stroke}
        strokeWidth={3.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />

      {/* 손잡이 */}
      <Circle cx={154} cy={86} r={4.5} stroke={stroke} strokeWidth={3} fill="none" />
    </Svg>
  );
}

/**
 * 화면 아래를 채우는 곡선 바닥.
 *
 * 직선으로 자르면 화면이 두 조각으로 갈라져 보인다. 완만한 곡선 한 줄로
 * 넘겨야 위아래가 한 장면으로 읽힌다.
 * preserveAspectRatio 를 끄고 늘려 어떤 화면 폭에서도 곡선 모양이 유지된다.
 */
export function GroundCurve({ fill = color.bg }: { fill?: string }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 375 460" preserveAspectRatio="none">
      <Path d="M0 96 C 104 14, 258 6, 375 68 L375 460 L0 460 Z" fill={fill} />
    </Svg>
  );
}
