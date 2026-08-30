import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Accent,
  AppBar,
  H1,
  PrimaryButton,
  Screen,
  NoteLine,
  NoteSheet,
  noteText,
  RULE,
  SpeakLink,
  Sub,
} from '../../src/components/ui';
import {
  match,
  speakableResult,
  PENDING_SHAPE,
  VERDICT_SHAPE,
  type MatchResult,
  type Verdict,
} from '../../src/domain/matching';
import type { Property } from '../../src/domain/types';
import { useStore } from '../../src/store';
import { color, family, font, radius, shadow, space } from '../../src/theme';

const ORDER: Record<Verdict, number> = { go: 0, fix: 1, stop: 3 };
/** 확인 중인 집은 확정된 집 뒤, '가지 마세요'보다는 앞에 둔다. */
const sortKey = (r: MatchResult) => (r.pending ? 2 : ORDER[r.verdict]);

const SKIN: Record<Verdict, { bar: string; bg: string; fg: string }> = {
  go: { bar: color.goBar, bg: color.goBg, fg: color.goText },
  fix: { bar: color.fixBar, bg: color.fixBg, fg: color.fixText },
  stop: { bar: color.stopBar, bg: color.stopBg, fg: color.stopText },
};

const PENDING_SKIN = { bar: color.unknownBar, bg: color.unknownBg, fg: color.unknownText };

/**
 * 맞는 집.
 *
 * 판정은 규칙 기반 엔진(matching.ts)만으로 정해진다.
 * 결과는 색 하나에 기대지 않고 색 + 글자 + 도형 + 음성 네 가지로 겹쳐 전달한다.
 * 흑백으로 인쇄해도, 색을 구분하기 어려워도 같은 정보가 남는다.
 */
export default function MatchesScreen() {
  const router = useRouter();
  const { profile, properties, requests } = useStore();

  const results = useMemo(() => {
    if (!profile) return [];
    return properties
      // 실측을 한 번도 거치지 않은 매물은 보여줄 근거가 없다.
      // 근거 없이 목록에 올리면 사용자는 앱이 이미 다 알아본 줄로 안다.
      .filter((p) => p.checkedAt !== null)
      .map((p) => ({ property: p, result: match(profile.requirements, p) }))
      .sort((a, b) => sortKey(a.result) - sortKey(b.result));
  }, [profile, properties]);

  if (!profile) {
    return (
      <Screen>
        <AppBar title="확인 결과" />
        <H1>먼저 요청서를 만들어요</H1>
        <Sub>요청서를 만들면 갈 수 있는 집인지 알려드려요</Sub>
        <View style={{ height: space.xl }} />
        <PrimaryButton label="요청서 만들기" onPress={() => router.replace('/user/profile')} />
      </Screen>
    );
  }

  const confirmed = results.filter((r) => !r.result.pending && r.result.verdict !== 'stop').length;
  const stillChecking = properties.filter((p) => p.checkedAt === null).length;

  /*
   * 요청서를 보낸 뒤에 중개사가 새로 올린 곳.
   *
   * 실제 알림(푸시)은 서버가 있어야 보낼 수 있다. 지금은 기기 안에만 두는
   * 구조라, 화면을 열었을 때 무엇이 새로 들어왔는지를 알려주는 것까지만 한다.
   */
  const sentOn = requests[0]?.sentAt.slice(0, 10) ?? null;
  const isNew = (p: Property) =>
    sentOn !== null && p.checkedAt !== null && p.checkedAt >= sentOn;
  const freshCount = properties.filter(isNew).length;

  /*
   * 못 가는 집은 목록에서 뺀다.
   *
   * 어차피 중개사와 함께 움직이므로 당사자가 봐야 하는 것은 '갈 수 있는 곳'이다.
   * 못 가는 집을 카드로 늘어놓으면 목록만 길어지고 읽을 것이 늘어난다.
   * 다만 판정 자체는 그대로 한다 — 몇 곳을 걸렀는지는 한 줄로 알려드린다.
   */
  const shown = results.filter((r) => r.result.pending || r.result.verdict !== 'stop');
  const droppedCount = results.length - shown.length;

  return (
    <Screen>
      <AppBar title="확인 결과" />
      {confirmed > 0 ? (
        <H1>
          맞는 집 <Accent>{confirmed}곳</Accent>을 찾았어요
        </H1>
      ) : (
        <H1>
          아직 <Accent>맞는 집</Accent>을 못 찾았어요
        </H1>
      )}
      <Sub>
        {confirmed > 0
          ? '가기 전에 미리 확인한 내용이에요'
          : '확인이 끝나는 대로 여기에 올려드릴게요'}
      </Sub>

      {/*
        상태를 알약 세 개로 흩어 두었더니 서로 따로 놀았다. 같은 종류의 정보는
        한 자리에 모아 같은 모양으로 보여준다. 보냈어요 화면과 같은 생김새다.
      */}
      {freshCount + stillChecking + droppedCount > 0 ? (
        <View style={s.statusBox}>
          {freshCount > 0 ? (
            <StatusRow label="새로 올라온 곳" count={freshCount} strong />
          ) : null}
          {stillChecking > 0 ? (
            <StatusRow label="확인하고 있는 곳" count={stillChecking} />
          ) : null}
          {droppedCount > 0 ? (
            <StatusRow label="안 맞아서 뺀 곳" count={droppedCount} muted />
          ) : null}
        </View>
      ) : null}

      {shown.map(({ property, result }) => (
        <VerdictCard key={property.id} property={property} result={result} fresh={isNew(property)} />
      ))}
    </Screen>
  );
}

/** 요약 카드의 한 줄. 이름과 개수만 보여준다. */
function StatusRow({
  label,
  count,
  strong,
  muted,
}: {
  label: string;
  count: number;
  /** 새로 들어온 것. 이것만 눈에 띄면 된다. */
  strong?: boolean;
  /** 이미 처리가 끝난 것. 알려주되 앞으로 나서지는 않는다. */
  muted?: boolean;
}) {
  return (
    <View style={s.statusRow} accessible accessibilityLabel={`${label} ${count}곳`}>
      <Text style={[s.statusLabel, muted && s.statusLabelMuted]}>{label}</Text>
      <Text
        style={[
          s.statusValue,
          strong && s.statusValueStrong,
          muted && s.statusValueMuted,
        ]}
      >
        {count}곳
      </Text>
    </View>
  );
}

function VerdictCard({
  property,
  result,
  fresh,
}: {
  property: Property;
  result: MatchResult;
  fresh?: boolean;
}) {
  const skin = result.pending ? PENDING_SKIN : SKIN[result.verdict];
  const shape = result.pending ? PENDING_SHAPE : VERDICT_SHAPE[result.verdict];
  const spoken = speakableResult(property.name, result);

  return (
    <NoteSheet edge={skin.bar} style={s.card}>
      <View accessible accessibilityLabel={spoken}>
        {/* 판정은 색 하나에 기대지 않는다. 도형 + 글자 + 색 + 음성 네 겹이다. */}
        <View style={s.verdictRow}>
          {/*
            도형은 색을 못 보는 분에게 판정을 알리는 유일한 단서다.
            막대용 색(bar)을 그대로 쓰니 배경 위에서 2.94~4.34:1 로 기준에 못 미쳤다.
            채우는 색과 읽는 색은 요구 조건이 다르다. 글자와 같은 색(fg)으로 그린다.
          */}
          <Text style={[s.mark, { color: skin.fg }]}>{shape}</Text>
          <Text style={[s.verdictText, { color: skin.fg }]}>{result.title}</Text>
        </View>

        <Text style={s.name}>{property.name}</Text>
        {fresh ? <Text style={s.freshTag}>새로 올라왔어요</Text> : null}

        {result.lines.map((l, i) => (
          <Text key={i} style={noteText}>
            {l}
          </Text>
        ))}

        <NoteLine text={result.note} mark="→" strong />

        {/* 숫자로 담기지 않은 것을 중개사가 적어 보냈다면 그대로 전한다. */}
        {property.memo ? <Text style={[noteText, s.memo]}>{property.memo}</Text> : null}
      </View>

      <View style={s.foot}>
        <Text style={s.evidence}>
          {result.checkedAt ? `중개사 실측 ${result.checkedAt}` : '아직 중개사 실측 전'}
        </Text>
        <SpeakLink text={spoken} label="듣기" />
      </View>
    </NoteSheet>
  );
}

const s = StyleSheet.create({
  card: { marginTop: space.lg },

  verdictRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  // 도형 자체가 표식이다. 색을 못 보거나 흑백으로 뽑아도 ● ▲ ■ ○ 로 구분된다.
  mark: { fontSize: 13, lineHeight: RULE, fontFamily: family.regular },
  verdictText: { fontSize: font.label, lineHeight: RULE, fontFamily: family.bold, letterSpacing: -0.3 },

  name: {
    fontSize: 24,
    lineHeight: RULE,
    fontFamily: family.extrabold,
    color: color.paperInk,
    letterSpacing: -0.6,
  },



  freshTag: {
    marginBottom: space.xs,
    fontSize: font.caption + 1,
    color: color.goText,
    fontFamily: family.extrabold,
  },

  statusBox: {
    marginTop: space.xl,
    backgroundColor: color.surface,
    borderRadius: radius.card,
    paddingHorizontal: space.xl,
    paddingVertical: space.sm,
    ...shadow.card,
  },
  statusRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.lg,
  },
  statusLabel: { fontSize: font.body, color: color.text, fontFamily: family.semibold },
  statusLabelMuted: { color: color.textMuted, fontFamily: family.regular },
  statusValue: { fontSize: font.h2 + 2, color: color.textSub, fontFamily: family.extrabold },
  statusValueStrong: { color: color.goText },
  statusValueMuted: { color: color.textMuted },

  memo: { marginTop: space.sm, color: color.paperInkSub },

  foot: {
    marginTop: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: color.paperRule,
    paddingTop: space.xs,
  },
  evidence: { fontSize: font.caption, color: color.paperInkSub, fontFamily: family.regular },

});
