import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Accent,
  AppBar,
  GhostButton,
  H1,
  Screen,
  Sub,
  useSteadyPress,
} from '../../src/components/ui';
import { CONTACT_SENTENCE, MOBILITY_SENTENCE, termLines } from '../../src/domain/questions';
import type { Property, PropertyFacts } from '../../src/domain/types';
import { useStore } from '../../src/store';
import { color, family, font, radius, shadow, space } from '../../src/theme';

/**
 * 받은 의뢰 (중개사 화면).
 *
 * 요청서가 도착했을 때만 열린다. 상시 알림도, 통화 감시도 없다.
 * 한 번 재어 둔 매물은 저장되어 다음 이용자부터 다시 재지 않는다 —
 * 두 번째 고객부터는 업무가 오히려 줄어드는 구조다.
 */

/**
 * 판정에 쓰이는 칸이 몇 개나 채워졌는지 센다.
 *
 * 중앙현관 앞은 계단 수와 경사로 중 하나만 있어도 판정이 서므로 한 칸으로 본다.
 * 주차는 판정에 쓰지 않아 세지 않는다.
 */
const SLOTS = 7;
function filledSlots(f: PropertyFacts): number {
  let n = 0;
  if (f.outStepCount !== null || f.outRamp !== null) n += 1;
  if (f.inStepCount !== null) n += 1;
  if (f.doorWidthCm !== null) n += 1;
  if (f.bathroomSillCm !== null) n += 1;
  if (f.bathroomDoorCm !== null) n += 1;
  if (f.floor !== null) n += 1;
  if (f.hasElevator !== null) n += 1;
  return n;
}

export default function AgentInbox() {
  const { requests, properties } = useStore();
  const latest = requests[0] ?? null;

  if (!latest) {
    return (
      <Screen>
        <AppBar title="받은 의뢰" badge="중개사" />
        <H1>아직 받은 의뢰가 없어요</H1>
        <Sub>
          요청서가 도착하면 여기에 뜨고, 그때만 앱이 작동해요.{'\n'}
          평소에는 알림을 보내지 않아요.
        </Sub>
      </Screen>
    );
  }

  const musts = latest.requirements.filter((r) => r.priority === 'must' && r.cardText);
  const remaining = properties.filter((p) => filledSlots(p.facts) < SLOTS).length;
  const terms = termLines(latest.terms);

  return (
    <Screen scrollHint="아래로 내리면 매물 목록이 있어요">
      <AppBar title="받은 의뢰" badge="중개사" />
      <H1>
        매물 <Accent>{remaining}건</Accent>만 재면 돼요
      </H1>
      <Sub>줄자로 재신 값을 넣어주시면 됩니다</Sub>

      <View style={s.reqBox}>
        <Text style={s.reqName}>{latest.userName} 님 요청서</Text>
        <Text style={s.reqBody}>{MOBILITY_SENTENCE[latest.mobility]}</Text>
        {musts.map((r) => (
          <Text key={r.key} style={s.reqItem}>
            · {r.cardText}
          </Text>
        ))}
        {terms.length > 0 ? (
          <>
            <Text style={s.reqSub}>이런 집이면 좋겠대요</Text>
            {terms.map((t) => (
              <Text key={t} style={s.reqItem}>
                · {t}
              </Text>
            ))}
          </>
        ) : null}
      </View>

      {/*
        연락 방식은 집 조건이 아니라 '어떻게 답해야 하는가'다.
        전화가 어려운 분에게 전화를 걸면 그 자리에서 중개가 끊긴다.
        그래서 조건 목록 안에 섞지 않고 따로, 눈에 띄게 올린다.
      */}
      {latest.contact === 'text' ? (
        <View style={s.contactBox}>
          <Text style={s.contactHead}>전화 말고 문자로 연락 주세요</Text>
          <Text style={s.contactBody}>
            이 분은 전화로 이야기하기 어려우세요.{'\n'}
            재신 내용을 앱이나 문자로 보내주시면 됩니다.
          </Text>
        </View>
      ) : (
        <Text style={s.contactPlain}>{CONTACT_SENTENCE[latest.contact]}</Text>
      )}

      <Text style={s.listHead}>매물 {properties.length}건</Text>
      {properties.map((p) => (
        <PropertyRow key={p.id} property={p} />
      ))}

      <AddButton />
    </Screen>
  );
}

function AddButton() {
  const router = useRouter();
  return (
    <View style={{ marginTop: space.lg }}>
      <GhostButton label="＋ 가진 매물 올리기" onPress={() => router.push('/agent/new')} />
    </View>
  );
}

function PropertyRow({ property }: { property: Property }) {
  const router = useRouter();
  const open = useSteadyPress(() =>
    router.push({ pathname: '/agent/checklist', params: { id: property.id } }),
  );

  const done = filledSlots(property.facts);
  const complete = done === SLOTS;

  return (
    <Pressable
      onPress={open}
      style={({ pressed }) => [s.row, pressed && s.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${property.name}, ${SLOTS}가지 중 ${done}가지 확인됨`}
    >
      <View style={s.rowBody}>
        <Text style={s.rowName}>{property.name}</Text>
        <Text style={s.rowAddr}>{property.address || '주소 없음'}</Text>
      </View>
      <View style={[s.pill, complete ? s.pillDone : s.pillTodo]}>
        <Text style={[s.pillText, complete ? s.pillTextDone : s.pillTextTodo]}>
          {complete ? '확인 완료' : `${done}/${SLOTS}`}
        </Text>
      </View>
      <Text style={s.chev}>›</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  reqBox: {
    marginTop: space.xl,
    backgroundColor: color.primarySoft,
    borderRadius: radius.card,
    padding: space.xl,
  },
  reqName: { fontSize: font.label, fontFamily: family.extrabold, color: color.onPrimarySoft },
  reqBody: {
    marginTop: space.sm,
    fontSize: font.caption + 1,
    lineHeight: (font.caption + 1) * 1.5,
    color: color.onPrimarySoft,
    fontFamily: family.semibold,
  },
  reqSub: {
    marginTop: space.md,
    fontSize: font.caption + 1,
    fontFamily: family.bold,
    color: color.onPrimarySoft,
  },
  reqItem: {
    marginTop: space.xs,
    fontSize: font.caption + 1,
    lineHeight: (font.caption + 1) * 1.5,
    color: color.onPrimarySoft,
    fontFamily: family.regular,
  },

  contactBox: {
    marginTop: space.lg,
    backgroundColor: color.fixBg,
    borderRadius: radius.card,
    padding: space.xl,
  },
  contactHead: { fontSize: font.label, fontFamily: family.extrabold, color: color.fixText },
  contactBody: {
    marginTop: space.sm,
    fontSize: font.caption + 1,
    lineHeight: (font.caption + 1) * 1.5,
    color: color.fixText,
    fontFamily: family.regular,
  },
  contactPlain: {
    marginTop: space.lg,
    fontSize: font.caption + 1,
    color: color.textMuted,
    fontFamily: family.regular,
  },

  listHead: {
    marginTop: space.xxl,
    fontSize: font.caption + 1,
    fontFamily: family.bold,
    color: color.textMuted,
  },

  row: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: color.surface,
    borderRadius: radius.card,
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
    marginTop: space.md,
    ...shadow.card,
  },
  rowPressed: { backgroundColor: color.surfaceSoft },
  rowBody: { flex: 1 },
  rowName: { fontSize: font.body, fontFamily: family.extrabold, color: color.text },
  rowAddr: {
    marginTop: 2,
    fontSize: font.caption,
    color: color.textMuted,
    fontFamily: family.regular,
  },
  pill: { borderRadius: radius.chip, paddingHorizontal: space.md, paddingVertical: 6 },
  pillDone: { backgroundColor: color.goBg },
  pillTodo: { backgroundColor: color.primarySoft },
  pillText: { fontSize: font.caption, fontFamily: family.extrabold },
  pillTextDone: { color: color.goText },
  pillTextTodo: { color: color.onPrimarySoft },
  chev: { fontSize: 26, color: color.borderStrong, fontFamily: family.semibold },
});
