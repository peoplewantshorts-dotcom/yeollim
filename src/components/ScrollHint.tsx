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
  text = '아래로 내리면서 선택해주세요',
  visible,
  /** 아래 버튼 영역 위로 얼마나 띄울지 */
  bottom = space.lg,
  /**
   * 어느 쪽으로 넘기는 것인지.
   *
   * 사진은 옆으로, 화면은 아래로 넘긴다. 손가락이 움직이는 방향이 다르면
   * 말보다 먼저 그것으로 알아본다.
   */
  direction = 'down',
  /** 가운데가 아니라 한쪽 구석에 둔다. 사진을 가리지 않게. */
  corner,
}: {
  text?: string;
  visible: boolean;
  bottom?: number;
  direction?: 'down' | 'right';
  corner?: boolean;
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

  const shift = bob.interpolate({ inputRange: [0, 1], outputRange: [-6, 12] });
  const move = direction === 'right' ? { translateX: shift } : { translateY: shift };
  // ☝︎ 는 위를 가리키는 손이라 방향에 맞게 돌린다
  const spin = direction === 'right' ? '90deg' : '180deg';

  return (
    <Animated.View
      style={[s.wrap, corner && s.wrapCorner, { opacity: fade, bottom }]}
      pointerEvents="none"
      // 화면 낭독기는 이 안내를 이미 순서대로 읽어주므로 중복해서 말하지 않는다.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={s.pill}>
        <Animated.Text style={[s.finger, { transform: [move, { rotate: spin }] }]}>
          ☝︎
        </Animated.Text>
        <Text style={s.text}>{text}</Text>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  wrapCorner: { alignItems: 'flex-end', right: space.md },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
    borderRadius: radius.chip,
    backgroundColor: 'rgba(20,18,34,0.88)',
  },
  finger: { fontSize: 24, color: '#FFFFFF' },
  text: { fontSize: font.label, color: '#FFFFFF', fontFamily: family.bold },
});
