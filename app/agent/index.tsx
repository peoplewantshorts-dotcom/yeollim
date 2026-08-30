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
import { color, family, font, keepAll, radius, shadow, space } from '../../src/theme';

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
/** JSX 안에서 줄바꿈을 넣을 때 쓴다. */
const BR = String.fromCharCode(10);

/** 2026-08-30T… → 8월 30일 */
function sentOn(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-');
  return `${Number(m)}월 ${Number(d)}일`;
}

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
          요청서가 오면 여기에 뜹니다.{BR}
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
        요청서 <Accent>{requests.length}건</Accent>이{BR}
        들어왔습니다
      </H1>
      {/*
        중개사에게 일을 시키는 말투가 되면 안 된다. 이 앱을 쓸지 말지는 중개사가
        정하고, 안 쓰면 앱 자체가 돌아가지 않는다. 무엇을 해 달라고 적는 대신
        무엇이 남는지를 적는다.
      */}
      <Sub>한 번 재어 두면 다음 손님부터는 그대로 씁니다</Sub>

      <View style={s.card}>
        <Text style={s.cardDate}>{sentOn(latest.sentAt)}에 왔습니다</Text>
        <Text style={s.cardWho}>{MOBILITY_SENTENCE[latest.mobility]}</Text>

        {/*
          연락 방식은 집 조건이 아니라 '어떻게 답해야 하는가'다.
          전화가 어려운 분에게 전화를 걸면 그 자리에서 중개가 끊긴다.
          그래서 조건 목록보다 앞에, 눈에 띄게 올린다.
        */}
        {latest.contact === 'text' ? (
          <View style={s.callout}>
            <Text style={s.calloutHead}>전화 말고 문자로 연락 주세요</Text>
            <Text style={s.calloutBody}>이 분은 전화로 이야기하기 어려우세요</Text>
          </View>
        ) : (
          <Text style={s.plain}>{CONTACT_SENTENCE[latest.contact]}</Text>
        )}

        <Text style={s.sectionHead}>꼭 필요한 것</Text>
        {musts.map((r) => (
          <Row key={r.key} text={r.cardText} />
        ))}

        {terms.length > 0 ? (
          <>
            <Text style={s.sectionHead}>이런 집이면 좋겠대요</Text>
            {terms.map((t) => (
              <Row key={t} text={t} mark="·" />
            ))}
          </>
        ) : null}
      </View>

      <Text style={s.listHead}>매물 {properties.length}건</Text>
      {properties.map((p) => (
        <PropertyRow key={p.id} property={p} />
      ))}

      <AddButton />
    </Screen>
  );
}

/** 요청서 안의 한 줄 */
function Row({ text, mark = '✓' }: { text: string; mark?: string }) {
  return (
    <View style={s.row} accessible accessibilityLabel={text}>
      <Text style={s.rowMark}>{mark}</Text>
      <Text style={s.rowText}>{text}</Text>
    </View>
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
      style={({ pressed }) => [s.listRow, pressed && s.listRowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${property.name}, ${SLOTS}가지 중 ${done}가지 재어 둠`}
    >
      <View style={s.listRowBody}>
        <Text style={s.listRowName}>{property.name}</Text>
        <Text style={s.listRowAddr}>{property.address || '주소 없음'}</Text>
      </View>
      <View style={[s.pill, complete ? s.pillDone : s.pillTodo]}>
        <Text style={[s.pillText, complete ? s.pillTextDone : s.pillTextTodo]}>
          {complete ? '다 재어 뒀어요' : `${done}/${SLOTS}`}
        </Text>
      </View>
      <Text style={s.chev}>›</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  /*
   * 요청서.
   *
   * 보라로 가득 채운 상자에 작은 글씨를 넣었더니 덩어리로만 보이고 무엇이
   * 적혀 있는지 눈에 안 들어왔다. 흰 카드에 크기로 위계를 준다.
   */
  card: {
    marginTop: space.xl,
    backgroundColor: color.surface,
    borderRadius: radius.card,
    padding: space.xl,
    ...shadow.card,
  },
  cardDate: { fontSize: font.caption + 1, color: color.textMuted, fontFamily: family.semibold },
  cardWho: {
    marginTop: space.xs,
    fontSize: font.h2 + 2,
    lineHeight: (font.h2 + 2) * 1.35,
    fontFamily: family.extrabold,
    color: color.text,
    ...keepAll,
  },

  callout: {
    marginTop: space.lg,
    borderRadius: radius.button,
    borderWidth: 2,
    borderColor: color.primary,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  calloutHead: { fontSize: font.label, fontFamily: family.extrabold, color: color.primaryText },
  calloutBody: {
    marginTop: 2,
    fontSize: font.caption + 1,
    color: color.textSub,
    fontFamily: family.regular,
    ...keepAll,
  },
  plain: {
    marginTop: space.lg,
    fontSize: font.label,
    color: color.textSub,
    fontFamily: family.regular,
  },

  sectionHead: {
    marginTop: space.xl,
    marginBottom: space.sm,
    fontSize: font.label,
    fontFamily: family.extrabold,
    color: color.primaryText,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, marginTop: space.xs },
  rowMark: { width: 18, fontSize: font.label, lineHeight: font.label * 1.5, color: color.primaryText },
  rowText: {
    flex: 1,
    fontSize: font.label,
    lineHeight: font.label * 1.5,
    color: color.text,
    fontFamily: family.semibold,
    ...keepAll,
  },

  visitCard: {
    marginTop: space.lg,
    backgroundColor: color.goBg,
    borderRadius: radius.card,
    padding: space.xl,
  },
  visitHead: { fontSize: font.label, fontFamily: family.extrabold, color: color.goText },
  visitItem: {
    marginTop: space.sm,
    fontSize: font.body,
    lineHeight: font.body * 1.5,
    color: color.goText,
    fontFamily: family.bold,
  },

  listHead: {
    marginTop: space.xxl,
    fontSize: font.caption + 1,
    fontFamily: family.bold,
    color: color.textMuted,
  },

  listRow: {
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
  listRowPressed: { backgroundColor: color.surfaceSoft },
  listRowBody: { flex: 1 },
  listRowName: { fontSize: font.body, fontFamily: family.extrabold, color: color.text },
  listRowAddr: {
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
