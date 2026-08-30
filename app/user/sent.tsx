import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Accent,
  AppBar,
  GhostButton,
  H1,
  PrimaryButton,
  Screen,
  SpeakLink,
  Sub,
} from '../../src/components/ui';
import { useStore } from '../../src/store';
import { color, family, font, radius, space } from '../../src/theme';

/**
 * 요청서를 보낸 뒤의 화면.
 *
 * 보내자마자 판정이 쏟아지면 아무것도 보내지지 않은 것처럼 느껴진다.
 * 실제로도 중개사가 임대인에게 물어봐야 알 수 있는 것이므로,
 * 지금 무엇을 기다리는 중인지를 먼저 말해 준다.
 *
 * 이미 확인해 둔 매물이 있으면 그것만 따로 보여준다. 협력 중개사무소가
 * 미리 구축해 둔 자료라 첫 사용자도 빈손으로 기다리지 않는다.
 */
export default function SentScreen() {
  const router = useRouter();
  const { properties, requests } = useStore();

  const latest = requests[0] ?? null;
  const checked = properties.filter((p) => p.checkedAt !== null);
  const waiting = properties.length - checked.length;

  return (
    <Screen
      footer={
        checked.length > 0 ? (
          <>
            <PrimaryButton
              label={`${checked.length}곳 먼저 보기`}
              onPress={() => router.push('/user/matches')}
            />
            <GhostButton label="처음으로" onPress={() => router.replace('/')} />
          </>
        ) : (
          <PrimaryButton label="처음으로" onPress={() => router.replace('/')} />
        )
      }
    >
      <AppBar title="보냈어요" />

      <View style={s.mark}>
        <Text style={s.markGlyph}>✓</Text>
      </View>

      <H1 style={s.big}>
        요청서를{BR}
        <Accent>보냈어요</Accent>
      </H1>
      <Sub>
        중개사가 매물을 확인하고{'\n'}
        알려드릴게요
      </Sub>

      <SpeakLink
        text={`요청서를 보냈어요. 중개사가 매물을 확인하고 알려드릴게요. 지금 ${checked.length}곳은 바로 보실 수 있어요.`}
        label="소리로 들으실 수 있어요"
      />

      <View style={s.statusBox}>
        <View style={s.statusRow}>
          <Text style={s.statusLabel}>지금 볼 수 있는 곳</Text>
          <Text style={s.statusValue}>{checked.length}곳</Text>
        </View>
        <View style={s.divider} />
        <View style={s.statusRow}>
          <Text style={s.statusLabel}>알아보는 중</Text>
          <Text style={s.statusValue}>{waiting}곳</Text>
        </View>
      </View>


      {latest ? (
        <View style={s.sentBox}>
          <Text style={s.sentLabel}>보낸 날짜</Text>
          <Text style={s.sentDate}>{latest.sentAt.slice(0, 10)}</Text>
        </View>
      ) : null}
    </Screen>
  );
}

/** JSX 안에서 줄바꿈을 넣을 때 쓴다. */
const BR = String.fromCharCode(10);

const s = StyleSheet.create({
  // 오른쪽에 여백이 크게 남아 제목을 한 단계 키웠다. 멀리서도 읽힌다.
  big: { fontSize: font.display, lineHeight: font.display * 1.28 },
  mark: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: color.goBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xl,
  },
  markGlyph: { fontSize: 26, lineHeight: 32, color: color.goText, fontFamily: family.bold },

  statusBox: {
    marginTop: space.xxl,
    backgroundColor: color.surface,
    borderRadius: radius.card,
    paddingHorizontal: space.xl,
    paddingVertical: space.sm,
  },
  statusRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLabel: { fontSize: font.body, color: color.text, fontFamily: family.semibold },
  statusValue: { fontSize: font.h2 + 3, color: color.primaryText, fontFamily: family.extrabold },
  divider: { height: 1, backgroundColor: color.surfaceSoft },

  /*
   * 보낸 날짜.
   *
   * 이름을 받지 않으므로 이 날짜가 요청서를 부르는 이름이 된다. 중개사와
   * 이야기할 때도 이 날짜로 가리키게 되므로 작게 흘려 두면 안 된다.
   */
  sentBox: {
    marginTop: space.xxl,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    borderRadius: radius.button,
    backgroundColor: color.primarySoft,
  },
  sentLabel: { fontSize: font.label, color: color.onPrimarySoft, fontFamily: family.semibold },
  sentDate: { fontSize: font.h2 + 2, color: color.onPrimarySoft, fontFamily: family.extrabold },
});
