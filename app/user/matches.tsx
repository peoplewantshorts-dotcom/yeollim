import React, { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Accent,
  AppBar,
  H1,
  PrimaryButton,
  Screen,
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
import { color, family, font, keepAll, radius, shadow, space } from '../../src/theme';

const ORDER: Record<Verdict, number> = { go: 0, fix: 1, stop: 3 };
/** 확인 중인 집은 확정된 집 뒤, '가지 마세요'보다는 앞에 둔다. */
/**
 * 순위를 매기는 기준.
 *
 * 맞은 조건이 많을수록 앞에 온다. 같은 '갈 수 있어요'라도 여섯 가지가 다 맞은 집과
 * 네 가지만 맞은 집은 다르기 때문이다. 아직 다 재지 않은 집은 맨 뒤로 보낸다 —
 * 모르는 것을 잘 맞은 것처럼 앞에 세울 수는 없다.
 */
const rankOf = (r: MatchResult) => (r.pending ? -1 : r.passCount);
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
      .sort(
        (a, b) =>
          rankOf(b.result) - rankOf(a.result) || sortKey(a.result) - sortKey(b.result),
      );
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

      {shown.map(({ property, result }, i) => (
        <VerdictCard
          key={property.id}
          property={property}
          result={result}
          fresh={isNew(property)}
          rank={result.pending ? undefined : i + 1}
        />
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
  rank,
}: {
  property: Property;
  result: MatchResult;
  fresh?: boolean;
  /** 조건이 많이 맞은 순서. 아직 다 재지 않은 집에는 붙이지 않는다. */
  rank?: number;
}) {
  const skin = result.pending ? PENDING_SKIN : SKIN[result.verdict];
  const shape = result.pending ? PENDING_SHAPE : VERDICT_SHAPE[result.verdict];
  const spoken = speakableResult(property.name, result);
  const photos = property.media.filter((m) => m.kind === 'image');

  return (
    <View style={s.card}>
      <View accessible accessibilityLabel={spoken}>
        <View style={s.head}>
          {rank ? (
            <View style={s.rank}>
              <Text style={s.rankText}>{rank}순위</Text>
            </View>
          ) : null}
          {/*
            판정은 색 하나에 기대지 않는다. 도형 + 글자 + 색 + 음성 네 겹이다.
            도형은 색을 못 보는 분에게 판정을 알리는 유일한 단서라
            막대용 색이 아니라 글자와 같은 색(fg)으로 그린다.
          */}
          <View style={[s.verdict, { backgroundColor: skin.bg }]}>
            <Text style={[s.mark, { color: skin.fg }]}>{shape}</Text>
            <Text style={[s.verdictText, { color: skin.fg }]}>{result.title}</Text>
          </View>
        </View>

        <Text style={s.name}>{property.name}</Text>
        {rank ? <Text style={s.why}>조건 {result.passCount}가지가 맞아요</Text> : null}
        {fresh ? <Text style={s.freshTag}>새로 올라왔어요</Text> : null}
      </View>

      {/*
        중개사가 보낸 사진.
        숫자로는 담기지 않는 것을 눈으로 확인하는 자리다. 판정 바로 아래에 두어
        먼저 판정을 읽고 사진으로 확인하는 순서가 되게 한다.
      */}
      {photos.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.photoRow}
          contentContainerStyle={s.photoRowInner}
        >
          {photos.map((m, i) => (
            <Image
              key={i}
              source={m.asset ?? { uri: m.uri }}
              style={s.photo}
              resizeMode="cover"
              accessibilityLabel={`${property.name} 사진 ${i + 1}`}
            />
          ))}
        </ScrollView>
      ) : null}

      {result.lines.map((l, i) => (
        <Text key={i} style={s.line}>
          {l}
        </Text>
      ))}

      <View style={[s.noteBox, { backgroundColor: skin.bg }]}>
        <Text style={[s.noteText, { color: skin.fg }]}>{result.note}</Text>
      </View>

      {/* 숫자로 담기지 않은 것을 중개사가 적어 보냈다면 그대로 전한다. */}
      {property.memo ? <Text style={s.memo}>{property.memo}</Text> : null}

      <View style={s.foot}>
        <Text style={s.evidence}>
          {result.checkedAt ? `중개사 실측 ${result.checkedAt}` : '아직 중개사 실측 전'}
        </Text>
        <SpeakLink text={spoken} label="듣기" />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    marginTop: space.lg,
    backgroundColor: color.surface,
    borderRadius: radius.card,
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    paddingBottom: space.sm,
    ...shadow.card,
  },

  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, flexWrap: 'wrap' },
  rank: {
    paddingHorizontal: space.md,
    paddingVertical: 5,
    borderRadius: radius.chip,
    backgroundColor: color.primary,
  },
  rankText: { fontSize: font.caption + 1, color: color.onPrimary, fontFamily: family.extrabold },

  verdict: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: 5,
    borderRadius: radius.chip,
  },
  // 도형 자체가 표식이다. 색을 못 보거나 흑백으로 뽑아도 ● ▲ ■ ○ 로 구분된다.
  mark: { fontSize: 13, fontFamily: family.regular },
  verdictText: { fontSize: font.caption + 1, fontFamily: family.extrabold },

  name: {
    marginTop: space.lg,
    fontSize: 26,
    lineHeight: 34,
    fontFamily: family.extrabold,
    color: color.text,
    letterSpacing: -0.6,
    ...keepAll,
  },
  why: {
    marginTop: space.xs,
    fontSize: font.label,
    color: color.textMuted,
    fontFamily: family.semibold,
  },
  freshTag: {
    marginTop: space.xs,
    fontSize: font.label,
    color: color.goText,
    fontFamily: family.extrabold,
  },

  photoRow: { marginTop: space.lg, marginHorizontal: -space.xl },
  photoRowInner: { paddingHorizontal: space.xl, gap: space.md },
  photo: { width: 260, height: 176, borderRadius: radius.button, backgroundColor: color.bg },

  line: {
    marginTop: space.sm,
    fontSize: font.label,
    lineHeight: font.label * 1.55,
    color: color.textSub,
    fontFamily: family.regular,
    ...keepAll,
  },

  noteBox: {
    marginTop: space.lg,
    borderRadius: radius.button,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  noteText: {
    fontSize: font.label,
    lineHeight: font.label * 1.45,
    fontFamily: family.bold,
    ...keepAll,
  },

  memo: {
    marginTop: space.lg,
    fontSize: font.label,
    lineHeight: font.label * 1.55,
    color: color.textMuted,
    fontFamily: family.regular,
    ...keepAll,
  },

  foot: {
    marginTop: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    borderTopWidth: 1,
    borderTopColor: color.surfaceSoft,
    paddingTop: space.xs,
  },
  evidence: { fontSize: font.caption + 1, color: color.textMuted, fontFamily: family.regular },

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
});
