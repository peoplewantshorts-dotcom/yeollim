import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import { Cover } from '../src/components/Cover';
import { useStore } from '../src/store';

/**
 * 첫 화면.
 *
 * 로고만 보이는 화면과 시작 화면을 서로 다른 화면으로 두면 넘어갈 때 툭 끊긴다.
 * 그래서 시작 화면을 먼저 깔아 두고, 그 위에 로고 화면을 덮은 뒤 서서히 걷어낸다.
 * 아래 화면은 이미 그려져 있으므로 걷히는 동안 끊기는 순간이 없다.
 *
 * 안드로이드가 앱을 켤 때 띄우는 네이티브 스플래시도 같은 바탕색에 같은 로고를
 * 쓴다. 네이티브 화면 → 이 로고 화면 → 시작 화면이 하나로 이어져 보인다.
 *
 * 움직이는 안내를 꺼 둔 분에게는 확대·축소 없이 밝기만 바뀌게 한다.
 */

const HOLD_MS = 1700; // 로고를 보여주는 시간
const CROSS_MS = 520; // 걷어내는 시간

export default function Home() {
  const { reduceMotion } = useStore();
  const [logoGone, setLogoGone] = useState(false);

  const veil = useRef(new Animated.Value(1)).current; // 로고 화면 불투명도
  const rise = useRef(new Animated.Value(0)).current; // 시작 화면이 드러나는 정도

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(veil, {
          toValue: 0,
          duration: CROSS_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(rise, {
          toValue: 1,
          // 아래 화면이 조금 먼저 살아나기 시작해야 빈 순간이 생기지 않는다
          duration: CROSS_MS - 80,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => setLogoGone(true));
    }, HOLD_MS);
    return () => clearTimeout(t);
  }, [veil, rise]);

  // 밝기는 항상, 확대는 움직임을 켜 둔 분에게만
  const coverStyle = {
    opacity: rise,
    transform: reduceMotion
      ? []
      : [{ scale: rise.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) }],
  };

  return (
    <View style={s.root}>
      <Animated.View style={[s.fill, coverStyle]}>
        <Cover />
      </Animated.View>

      {logoGone ? null : (
        <Animated.View style={[s.veil, { opacity: veil }]} pointerEvents="none">
          <Image
            source={require('../assets/logo.png')}
            style={s.logo}
            resizeMode="contain"
            accessible
            accessibilityLabel="열림"
          />
        </Animated.View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#EEECF3' },
  fill: { flex: 1 },
  // 로고는 가장자리를 투명하게 날려 두었다. 덮개 색과 로고 배경이 조금 달라도
  // 경계가 드러나지 않고 자연스럽게 녹아든다.
  veil: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#EEECF3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 260, height: 260 },
});
