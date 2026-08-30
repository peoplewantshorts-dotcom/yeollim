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
  const { profile, properties } = useStore();

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

      {stillChecking > 0 ? (
        <View style={s.waiting}>
          <Text style={s.waitingText}>{stillChecking}곳은 중개사가 확인하고 있어요</Text>
        </View>
      ) : null}

      {results.map(({ property, result }) => (
        <VerdictCard key={property.id} property={property} result={result} />
      ))}
    </Screen>
  );
}

function VerdictCard({ property, result }: { property: Property; result: MatchResult }) {
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

  waiting: {
    marginTop: space.lg,
    backgroundColor: color.primarySoft,
    borderRadius: radius.button,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  waitingText: {
    fontSize: font.caption + 1,
    color: color.onPrimarySoft,
    fontFamily: family.semibold,
  },
});
