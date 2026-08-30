import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { AppBar, H1, Screen, Sub, useSteadyPress } from '../src/components/ui';
import { useStore, type Role } from '../src/store';
import { HIT, TAP_GAP, color, family, font, radius, shadow, space } from '../src/theme';

/**
 * 어떻게 오셨어요?
 *
 * 고르는 사람이 본인이라는 것은 굳이 적지 않는다. 당연한 말을 화면에 적으면
 * 오히려 그것이 당연하지 않다고 말하는 셈이 된다. 대신 각 역할이 이 앱에서
 * 무엇을 얻는지만 한 줄로 적는다 — 당사자는 헛걸음을 줄이고, 중개사는 잴 것만 알게 된다.
 */
export default function RolePick() {
  const router = useRouter();
  const { setRole, profile } = useStore();

  const pick = useSteadyPress((role: Role) => {
    setRole(role);
    if (role === 'user') router.push(profile ? '/user/request' : '/user/profile');
    else router.push('/agent');
  });

  return (
    <Screen>
      <AppBar title="시작하기" />
      <H1>어떻게 오셨어요?</H1>
      <Sub>나중에 바꿀 수 있어요</Sub>

      <RoleCard
        title="집을 구하고 있어요"
        desc="안전하게 생활할 수 있는 집을 구하고 싶어요"
        art={require('../assets/role-user.jpg')}
        onPress={() => pick('user')}
      />
      <RoleCard
        title="공인중개사예요"
        desc="안전한 주거 공간을 찾아드릴게요"
        art={require('../assets/role-agent.jpg')}
        onPress={() => pick('agent')}
      />
    </Screen>
  );
}

function RoleCard({
  title,
  desc,
  art,
  onPress,
}: {
  title: string;
  desc: string;
  art: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.card, pressed && s.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${desc}`}
    >
      {/* 그림을 그대로 얹으면 아래쪽에 잘린 자국이 남는다.
          카드 색으로 서서히 녹여서 그림과 글이 한 덩어리로 보이게 한다. */}
      <View style={s.artWrap}>
        <Image source={art} style={s.art} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.75)', color.surface]}
          locations={[0, 0.6, 1]}
          style={s.artFade}
        />
      </View>

      <View style={s.cardFoot}>
        <View style={s.cardBody}>
          <Text style={s.cardTitle}>{title}</Text>
          <Text style={s.cardDesc}>{desc}</Text>
        </View>
        <View style={s.go}>
          <Text style={s.chev}>›</Text>
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    // 특강 11쪽의 44~48px 은 하한이다. 화면을 가르는 선택지는 그보다 훨씬 크게 둔다.
    backgroundColor: color.surface,
    borderRadius: radius.card,
    overflow: 'hidden',
    marginTop: TAP_GAP,
    // 그림자만으로는 '눌리는 것'으로 안 보인다. 테두리를 둘러 덩어리로 만든다.
    borderWidth: 1.5,
    borderColor: color.border,
    ...shadow.card,
  },
  cardPressed: { backgroundColor: color.primarySoft, borderColor: color.primary },
  artWrap: { width: '100%', aspectRatio: 1.7 },
  art: { width: '100%', height: '100%' },
  // 그림 아래쪽을 카드 색으로 덮어 잘린 자국을 지운다
  artFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '38%' },

  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TAP_GAP,
    paddingHorizontal: space.xl,
    paddingBottom: space.xl,
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: font.h2, fontFamily: family.extrabold, color: color.text },
  cardDesc: {
    marginTop: space.xs,
    fontSize: font.label,
    lineHeight: font.label * 1.5,
    color: color.textMuted, fontFamily: family.regular },
  go: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chev: { fontSize: 26, lineHeight: 30, color: color.primaryText, fontFamily: family.bold },

});
