import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppBar, Card, Chip, ChipRow, H1, Screen, Sub, useSteadyPress } from '../src/components/ui';
import { useSpeak } from '../src/speech';
import { CLIP_INFO } from '../src/speech/clips';
import { useStore, type VoiceSex } from '../src/store';
import { HIT, TAP_BIG, color, family, font, keepAll, radius, space } from '../src/theme';

/**
 * 설정.
 *
 * 특강에서 자폐성 장애 항목의 첫 줄이 "소리·진동·애니메이션을 사용자가 조절할 수
 * 있게 하라"였다. 어떤 자극이 견디기 어려운지는 사람마다 다르고, 그건 앱이
 * 대신 정해 줄 수 없다.
 *
 * 그래서 여기 있는 것은 전부 '끄거나 바꿀 수 있는' 것들이다.
 * 무엇이 편한지는 쓰는 사람이 정한다.
 */
export default function Settings() {
  const {
    voiceSex,
    setVoiceSex,
    voiceRate,
    setVoiceRate,
  } = useStore();
  const { speak } = useSpeak();

  // 한 마디만 들려주면 톤을 가늠하기 어렵다. 앱을 소개하는 문장을 그대로 읽어준다.
  const trySound = useSteadyPress(() =>
    speak('열림. 생활할 수 있는 집인지, 확인해서 알려드려요.'),
  );

  return (
    <Screen>
      <AppBar title="설정" settings={false} />

      {/*
        화면 전체를 아우르는 한 문장을 두었더니 무엇을 바꾸는 곳인지가 오히려
        흐려졌다. 항목마다 이름을 붙여 두는 편이 찾기 쉽다.
      */}
      <Card>
        <Text style={s.label}>음성 설정</Text>
        <ChipRow label="읽어주는 목소리">
          {(
            [
              ['female', '여자 목소리'],
              ['male', '남자 목소리'],
            ] as [VoiceSex, string][]
          ).map(([id, text]) => (
            <Chip
              key={id}
              label={text}
              selected={voiceSex === id}
              onPress={() => setVoiceSex(id)}
              a11yLabel={`읽어주는 목소리, ${text}`}
            />
          ))}
        </ChipRow>
        <TrySound onPress={trySound} />
      </Card>

      <Card>
        <Text style={s.label}>속도 설정</Text>
        <ChipRow label="읽어주는 속도">
          {(
            [
              /*
               * 0.8 은 늘어져 답답하고 1.2 는 알아듣기 어려웠다.
               * 읽는 속도는 조금만 움직여도 체감이 크다.
               */
              [0.9, '천천히'],
              [1, '보통'],
              [1.1, '빠르게'],
            ] as [number, string][]
          ).map(([rate, text]) => (
            <Chip
              key={rate}
              label={text}
              selected={voiceRate === rate}
              onPress={() => setVoiceRate(rate)}
              a11yLabel={`읽어주는 속도, ${text}`}
            />
          ))}
        </ChipRow>
        <TrySound onPress={trySound} />
      </Card>

      <Text style={s.meta}>
        {CLIP_INFO.count.female + CLIP_INFO.count.male > 0
          ? '인터넷이 없어도 들으실 수 있어요'
          : '아직 미리 만들어 둔 음성이 없어 기기 음성으로 읽어드려요'}
      </Text>
    </Screen>
  );
}

function TrySound({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [s.try, pressed && s.tryPressed]}
      accessibilityRole="button"
      accessibilityLabel="지금 목소리로 들어보기"
    >
      <Text style={s.tryGlyph}>🔊</Text>
      <Text style={s.tryText}>들어보기</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  label: { fontSize: font.body, fontFamily: family.bold, color: color.text },
  // 설정 화면의 설명도 본문이다. 작게 두면 정작 이 앱이 필요한 분이 못 읽는다.
  hint: {
    marginTop: space.sm,
    fontSize: font.label,
    lineHeight: font.label * 1.55,
    color: color.textSub,
    fontFamily: family.regular,
    ...keepAll,
  },
  try: {
    minHeight: TAP_BIG,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.lg,
    paddingHorizontal: space.lg,
    borderRadius: radius.chip,
    borderWidth: 2,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
  },
  tryPressed: { backgroundColor: color.primarySoft, borderColor: color.primary },
  tryGlyph: { fontSize: 22 },
  tryText: { fontSize: font.label, color: color.primaryText, fontFamily: family.bold },
  meta: {
    marginTop: space.xxl,
    fontSize: font.body,
    lineHeight: font.body * 1.6,
    color: color.textMuted,
    fontFamily: family.regular,
  },
});
