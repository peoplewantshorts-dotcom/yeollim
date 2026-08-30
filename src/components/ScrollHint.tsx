import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { family, font, radius, space } from '../theme';

/**
 * 아래로 더 있다는 것을 알려주는 힌트.
 *
 * 스크롤이라는 동작 자체가 익숙하지 않은 분이 있다. 화면에 보이는 것이 전부인 줄 알고
 * 첫 질문만 답한 채 멈춘다. 손가락이 아래로 움직이는 모습을 잠깐 보여주고 사라진다.
 *
 * 계속 떠 있으면 그것대로 가리고 방해가 되므로, 한 번 스크롤하면 즉시 사라지고
 * 가만히 둬도 잠시 뒤 사라진다. 소리나 진동 없이 화면으로만 알린다.
 */
export function ScrollHint({
  text = '아래로 내리면서 하나씩 골라주세요',
  visible,
}: {
  text?: string;
  visible: boolean;
}) {
  const fade = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: visible ? 1 : 0,
      duration: visible ? 420 : 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [visible, fade]);

  useEffect(() => {
    if (!visible) return;
    // 손가락이 아래로 쓸어내리는 동작을 천천히 반복한다.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, bob]);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [-4, 10] });

  return (
    <Animated.View
      style={[s.wrap, { opacity: fade }]}
      pointerEvents="none"
      // 화면 낭독기는 이 안내를 이미 순서대로 읽어주므로 중복해서 말하지 않는다.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={s.pill}>
        <Animated.Text style={[s.finger, { transform: [{ translateY }, { rotate: '180deg' }] }]}>
          ☝︎
        </Animated.Text>
        <Text style={s.text}>{text}</Text>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: space.lg, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    borderRadius: radius.chip,
    backgroundColor: 'rgba(20,18,34,0.88)',
  },
  // ☝︎ 는 위를 가리키는 손이라 180도 돌려 아래로 향하게 한다
  finger: { fontSize: 18, color: '#FFFFFF' },
  text: { fontSize: font.caption + 1, color: '#FFFFFF', fontFamily: family.bold },
});
