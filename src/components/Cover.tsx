import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton, SpeakLink, useSteadyPress } from './ui';
import { color, family, radius, space } from '../theme';

const INTRO = '열림. 들어갈 수 있는 집인지, 가기 전에 알려드려요.';

/**
 * 시작 화면.
 *
 * 사진을 화면에 꽉 채우면 따뜻한 사진 톤과 브랜드 보라가 같은 면적으로 맞붙어
 * 서로를 밀어낸다. 그래서
 *
 *   1. 바탕색을 사진에서 직접 뽑았다. 사진의 밝은 부분이 RGB(240,227,214) 인
 *      따뜻한 크림이라, 그것을 옅게 편 색을 바닥으로 깔았다. 사진이 바탕 위에
 *      얹힌 것이 아니라 바탕에서 이어져 나온 것처럼 보인다.
 *   2. 사진은 둥근 카드 안에 넣어 크기를 줄였다.
 *   3. 보라는 시작하기 버튼과 듣기 버튼에만 남겼다. 면적이 작아지면 부딪히지
 *      않고 '눌러야 할 곳'이라는 신호가 된다.
 *
 * 글자가 사진 위에 얹히지 않으므로 어두운 스크림도 필요 없어졌다.
 * 명도 대비 문제 자체가 사라진다.
 */

// 사진에서 뽑은 따뜻한 중성색. 이 화면에서만 쓴다.
const COVER = {
  ground: '#FAF6F1',
  ink: '#241F1A',
  inkSoft: '#6E645B',
  cardEdge: '#EDE4D9',
};

export function Cover() {
  const router = useRouter();
  const go = useSteadyPress(() => router.push('/role'));

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <View style={s.body}>
        <View style={s.lockup}>
          {/* 가장자리를 투명하게 날린 로고라 크림색 바탕에 그대로 얹어도
              네모난 경계가 드러나지 않는다. */}
          <Image source={require('../../assets/logo.png')} style={s.mark} resizeMode="contain" />
          <Text style={s.wordmark} accessibilityRole="header">
            열림
          </Text>
        </View>

        <View style={s.card}>
          <Image
            source={require('../../assets/hero.jpg')}
            style={s.photo}
            resizeMode="cover"
            accessible
            accessibilityLabel="문턱 없이 현관 타일과 방바닥이 같은 높이로 이어지는 원룸 현관"
          />
        </View>

        <View style={s.copy}>
          <Text style={s.headline}>
            들어갈 수 있는 집인지{'\n'}
            <Text style={s.headlineStrong}>가기 전에</Text> 알려드려요
          </Text>
          <SpeakLink text={INTRO} label="소리로 들으실 수 있어요" />
        </View>
      </View>

      <View style={s.footer}>
        <PrimaryButton label="시작하기" onPress={go} />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COVER.ground },
  body: { flex: 1, paddingHorizontal: space.xxl, paddingTop: space.xl },

  lockup: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  mark: { width: 58, height: 58, marginLeft: -6 },
  wordmark: {
    fontSize: 28,
    lineHeight: 36,
    fontFamily: family.extrabold,
    color: COVER.ink,
    letterSpacing: -0.8,
  },

  card: {
    flex: 1,
    marginTop: space.xl,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: COVER.cardEdge,
    // 따뜻한 바탕에 맞춰 그림자도 따뜻하게 깐다. 회색 그림자는 떠 보인다.
    shadowColor: '#5A4632',
    shadowOpacity: 0.16,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  photo: { width: '100%', height: '100%' },

  copy: { paddingTop: space.xxl, paddingBottom: space.lg },
  headline: {
    fontSize: 25,
    lineHeight: 38,
    fontFamily: family.regular,
    color: COVER.inkSoft,
    letterSpacing: -0.4,
  },
  headlineStrong: { fontFamily: family.extrabold, color: COVER.ink },

  footer: { paddingHorizontal: space.xxl, paddingBottom: space.xl },
});

void radius;
