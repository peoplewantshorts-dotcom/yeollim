import React, { useMemo, useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Accent,
  AppBar,
  H1,
  PrimaryButton,
  Screen,
  SpeakLink,
  Sub,
  useSteadyPress,
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
import { ScrollHint } from '../../src/components/ScrollHint';
import { useStore } from '../../src/store';
import { color, family, font, HIT, keepAll, radius, shadow, space, TAP_BIG } from '../../src/theme';

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
  const { profile, properties, requests, setVisitIds } = useStore();

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
  /*
   * 보러 갈 집 고르기.
   *
   * 판정은 갈 수 있는지를 알려줄 뿐이고 어디로 갈지는 본인이 정한다.
   * 고른 것을 중개사에게 전해 두면 그 집만 준비하면 되므로 서로 헛수고가 줄어든다.
   */
  const [picked, setPicked] = useState<string[]>(() => requests[0]?.visitIds ?? []);
  const [told, setTold] = useState(false);
  const toggle = (id: string) => {
    setTold(false);
    setPicked((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));
  };

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
    <Screen
      footer={
        picked.length > 0 ? (
          <>
            <PrimaryButton
              label={`이 집으로 보여주세요 · ${picked.length}곳`}
              onPress={() => {
                setVisitIds(picked);
                setTold(true);
              }}
            />
            {told ? <Text style={s.told}>중개사에게 전했어요</Text> : null}
          </>
        ) : undefined
      }
    >
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
          ? '미리 확인한 내용이에요'
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
          picked={picked.includes(property.id)}
          onPick={() => toggle(property.id)}
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
  picked,
  onPick,
}: {
  property: Property;
  result: MatchResult;
  fresh?: boolean;
  /** 조건이 많이 맞은 순서. 아직 다 재지 않은 집에는 붙이지 않는다. */
  rank?: number;
  picked: boolean;
  onPick: () => void;
}) {
  const spoken = speakableResult(property.name, result);
  const photos = property.media.filter((m) => m.kind === 'image');
  const musts = result.items.filter((i) => i.isMust);

  /*
   * 사진이 옆으로 더 있다는 것을 알려준다.
   *
   * 가로로 넘기는 동작은 세로 스크롤보다 덜 익숙해서, 알려주지 않으면 첫 장만
   * 보고 지나친다. 첫 카드에서 한 번만 띄우고, 한 번 넘기면 사라진다.
   */
  const [swipeHint, setSwipeHint] = useState(rank === 1 && photos.length > 1);
  // 눌러서 크게 보고 있는 사진. null 이면 닫혀 있다.
  const [zoom, setZoom] = useState<number | null>(null);
  /*
   * 사진 넘기기.
   *
   * 손가락으로 옆으로 미는 동작은 앱 안의 브라우저(카카오톡 등)에서 자주 막힌다.
   * 세로 스크롤이 먼저 잡아채기 때문이다. 제스처에 기대지 않고 버튼으로도
   * 넘길 수 있게 둔다 — 손 떨림이 있는 분에게도 미는 것보다 누르는 편이 쉽다.
   */
  const [page, setPage] = useState(0);
  const strip = useRef<ScrollView>(null);
  const PHOTO_STEP = 240 + 12;

  const goTo = (i: number) => {
    const next = Math.max(0, Math.min(photos.length - 1, i));
    setPage(next);
    setSwipeHint(false);
    strip.current?.scrollTo({ x: next * PHOTO_STEP, animated: true });
  };

  return (
    <View style={s.card}>
      <View accessible accessibilityLabel={spoken.join('. ')}>
        <View style={s.head}>
          {rank ? (
            <View style={s.rank}>
              <Text style={s.rankText}>{rank}순위</Text>
            </View>
          ) : null}
          <View style={s.headGap} />
          <PickBox on={picked} onPress={onPick} name={property.name} />
        </View>

        <Text style={s.name}>{property.name}</Text>
        {fresh ? <Text style={s.freshTag}>새로 올라왔어요</Text> : null}
      </View>

      {/*
        중개사가 보낸 사진.
        숫자로는 담기지 않는 것 — 경사로의 실제 기울기, 줄자에 찍힌 문 폭 —
        이 여기서 전해진다. 조건 목록보다 앞에 두어 먼저 눈으로 보게 한다.
      */}
      {photos.length > 0 ? (
        <View>
          <ScrollView
            ref={strip}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.photoRow}
            contentContainerStyle={s.photoRowInner}
            onScrollBeginDrag={() => setSwipeHint(false)}
            onMomentumScrollEnd={(e) =>
              setPage(Math.round(e.nativeEvent.contentOffset.x / PHOTO_STEP))
            }
            scrollEventThrottle={64}
          >
            {photos.map((m, i) => (
              <Pressable
                key={i}
                onPress={() => setZoom(i)}
                accessibilityRole="button"
                accessibilityLabel={`${property.name} 사진 ${i + 1}. 눌러서 크게 보실 수 있어요`}
              >
                <Image source={m.asset ?? { uri: m.uri }} style={s.photo} resizeMode="cover" />
              </Pressable>
            ))}
          </ScrollView>
          {photos.length > 1 ? (
            <View style={s.pager}>
              <Arrow label="앞 사진" glyph="‹" onPress={() => goTo(page - 1)} off={page === 0} />
              <Text style={s.pageNo}>
                {page + 1} / {photos.length}
              </Text>
              <Arrow
                label="다음 사진"
                glyph="›"
                onPress={() => goTo(page + 1)}
                off={page === photos.length - 1}
              />
            </View>
          ) : null}

          <ScrollHint
            text="옆으로 넘겨보세요"
            direction="right"
            corner
            visible={swipeHint}
            bottom={56}
          />
        </View>
      ) : null}

      {/*
        조건을 아래에 정리해서 보여준다.
        '갈 수 있어요' 같은 말은 빼도 된다 — 여기 보이는 집은 어차피 갈 수 있는
        집이고, 정작 알아야 하는 것은 무엇이 맞았고 무엇을 고치면 되는가다.
      */}
      <View style={s.conds}>
        {musts.map((it) => (
          <View key={it.key} style={s.cond}>
            <Text style={[s.condMark, it.verdict === 'pass' ? s.markOk : s.markFix]}>
              {it.verdict === 'pass' ? '✓' : it.verdict === 'fixable' ? '△' : '○'}
            </Text>
            {/*
              맞은 것은 조건 문장을 그대로 보여주고 핵심 수치에만 형광을 칠한다.
              고쳐야 하는 것은 조건 문장('화장실 문턱 없음')이 아니라 지금 상태
              ('화장실에 2cm 문턱이 있어요')가 본론이므로 그것을 소제목으로 올린다.
            */}
            <View style={s.condBody}>
              {it.verdict === 'pass' ? (
                <CondText text={it.label} emphasis={it.emphasis} on />
              ) : (
                <>
                  <Text style={s.condText}>{it.reason}</Text>
                  {it.remedy ? <Text style={s.condWhy}>{it.remedy}</Text> : null}
                </>
              )}
            </View>
          </View>
        ))}
      </View>

      {/*
        사진을 크게 보기.
        작은 사진으로는 문턱 높이나 경사로 기울기를 가늠하기 어렵다.
        눌러서 화면 가득 볼 수 있게 한다.
      */}
      <Modal visible={zoom !== null} transparent animationType="fade" onRequestClose={() => setZoom(null)}>
        <Pressable
          style={s.zoomBack}
          onPress={() => setZoom(null)}
          accessibilityRole="button"
          accessibilityLabel="닫기"
        >
          {zoom !== null ? (
            <Image
              source={photos[zoom].asset ?? { uri: photos[zoom].uri }}
              style={s.zoomImg}
              resizeMode="contain"
            />
          ) : null}
          <View style={s.zoomClose}>
            <Text style={s.zoomCloseText}>닫기</Text>
          </View>
        </Pressable>
      </Modal>

      {/* 숫자로 담기지 않은 것을 중개사가 적어 보냈다면 그대로 전한다. */}
      {property.memo ? <Text style={s.memo}>{property.memo}</Text> : null}

      <View style={s.foot}>
        <Text style={s.evidence} numberOfLines={1}>
          {result.checkedAt ? `중개사 실측 ${measuredOn(result.checkedAt)}` : '아직 실측 전'}
        </Text>
        <SpeakLink text={spoken} label="듣기" />
      </View>
    </View>
  );
}

/** 사진을 한 장씩 넘기는 버튼 */
function Arrow({
  label,
  glyph,
  onPress,
  off,
}: {
  label: string;
  glyph: string;
  onPress: () => void;
  off: boolean;
}) {
  const press = useSteadyPress(onPress);
  return (
    <Pressable
      onPress={press}
      disabled={off}
      style={({ pressed }) => [s.arrow, off && s.arrowOff, pressed && s.arrowPressed]}
      accessibilityRole="button"
      accessibilityState={{ disabled: off }}
      accessibilityLabel={label}
    >
      <Text style={[s.arrowGlyph, off && s.arrowGlyphOff]}>{glyph}</Text>
    </Pressable>
  );
}

/** 보러 갈 집으로 고르는 칸 */
function PickBox({ on, onPress, name }: { on: boolean; onPress: () => void; name: string }) {
  const press = useSteadyPress(onPress);
  return (
    <Pressable
      onPress={press}
      style={[s.pick, on && s.pickOn]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      aria-checked={on}
      accessibilityLabel={`${name}, 보러 갈 집으로 고르기`}
    >
      <Text style={[s.pickMark, on && s.pickMarkOn]}>{on ? '✓' : ''}</Text>
      <Text style={[s.pickText, on && s.pickTextOn]}>보러 갈래요</Text>
    </Pressable>
  );
}

/** 2026-08-30 → 8월 30일. 줄이 접히지 않게 짧게 쓴다. */
function measuredOn(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-');
  return `${Number(m)}월 ${Number(d)}일`;
}

/** 맞은 조건은 핵심 대목에만 형광을 칠한다. 줄 전체를 칠하면 어디가 핵심인지 모른다. */
function CondText({ text, emphasis, on }: { text: string; emphasis: string; on: boolean }) {
  const at = emphasis ? text.indexOf(emphasis) : -1;
  if (!on || at < 0) return <Text style={s.condText}>{text}</Text>;
  return (
    <Text style={s.condText}>
      {text.slice(0, at)}
      <Text style={s.condHi}>{emphasis}</Text>
      {text.slice(at + emphasis.length)}
    </Text>
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

  head: { flexDirection: 'row', alignItems: 'center' },
  headGap: { flex: 1 },
  pick: {
    minHeight: HIT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: radius.chip,
    borderWidth: 2,
    borderColor: color.border,
  },
  pickOn: { borderColor: color.primary, backgroundColor: color.primarySoft },
  pickMark: { width: 14, fontSize: font.caption + 1, color: color.primaryText, fontFamily: family.bold },
  pickMarkOn: { color: color.onPrimarySoft },
  pickText: { fontSize: font.caption + 1, color: color.textSub, fontFamily: family.bold },
  pickTextOn: { color: color.onPrimarySoft },

  told: {
    marginTop: space.md,
    textAlign: 'center',
    fontSize: font.label,
    color: color.goText,
    fontFamily: family.bold,
  },

  rank: {
    paddingHorizontal: space.md,
    paddingVertical: 5,
    borderRadius: radius.chip,
    backgroundColor: color.primary,
  },
  rankText: { fontSize: font.caption + 1, color: color.onPrimary, fontFamily: family.extrabold },

  conds: { marginTop: space.xl, gap: space.md },
  cond: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  // 도형 자체가 표식이다. 색을 못 보거나 흑백으로 뽑아도 ✓ △ ○ 로 구분된다.
  condMark: { width: 20, fontSize: font.label, lineHeight: font.label * 1.5 },
  markOk: { color: color.goText },
  markFix: { color: color.fixText },
  condBody: { flex: 1 },
  condText: {
    fontSize: font.label,
    lineHeight: font.label * 1.5,
    color: color.text,
    fontFamily: family.semibold,
    ...keepAll,
  },
  condHi: {
    backgroundColor: color.marker,
    lineHeight: font.label * 1.2,
    fontFamily: family.bold,
  },
  condWhy: {
    marginTop: 2,
    fontSize: font.caption + 1,
    lineHeight: (font.caption + 1) * 1.5,
    color: color.fixText,
    fontFamily: family.regular,
    ...keepAll,
  },

  name: {
    marginTop: space.lg,
    fontSize: 26,
    lineHeight: 34,
    fontFamily: family.extrabold,
    color: color.text,
    letterSpacing: -0.6,
    ...keepAll,
  },
  freshTag: {
    marginTop: space.xs,
    fontSize: font.label,
    color: color.goText,
    fontFamily: family.extrabold,
  },

  photoRow: { marginTop: space.lg },
  photoRowInner: { gap: space.md, paddingRight: space.xl },
  photo: { width: 240, height: 164, borderRadius: radius.button, backgroundColor: color.bg },

  pager: {
    marginTop: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
  },
  arrow: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
  },
  arrowOff: { borderColor: color.border, backgroundColor: color.surfaceSoft },
  arrowPressed: { backgroundColor: color.primarySoft, borderColor: color.primary },
  arrowGlyph: { fontSize: 28, lineHeight: 32, color: color.primaryText, fontFamily: family.bold },
  arrowGlyphOff: { color: color.border },
  pageNo: { fontSize: font.label, color: color.textMuted, fontFamily: family.bold, minWidth: 52, textAlign: 'center' },

  zoomBack: {
    flex: 1,
    backgroundColor: 'rgba(12,10,22,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  zoomImg: { width: '100%', height: '80%' },
  // 어두운 배경 위에서 테두리만 두르니 눈에 안 들어왔다. 흰 알약으로 채운다.
  zoomClose: {
    marginTop: space.xl,
    minHeight: TAP_BIG,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xxxl,
    borderRadius: radius.chip,
    backgroundColor: '#FFFFFF',
  },
  zoomCloseText: { color: color.text, fontSize: font.body, fontFamily: family.extrabold },



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
  evidence: {
    flexShrink: 1,
    fontSize: font.caption + 1,
    color: color.textMuted,
    fontFamily: family.regular,
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
});
