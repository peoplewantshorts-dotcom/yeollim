import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { DOUBLE_TAP_GUARD_MS, HIT, TAP_BIG, TAP_GAP, TAP_MAIN, color, family, font, keepAll, radius, shadow, space } from '../theme';
import { ScrollHint } from './ScrollHint';
import { useSpeak } from '../speech';
import { useStore } from '../store';

/* ------------------------------------------------------------------ *
 * 손 떨림 보호
 *
 * 지체·뇌병변 사용자는 근긴장도 항진이나 불수의 운동 때문에 버튼 하나를
 * 짧은 간격으로 두세 번 누르게 되는 일이 잦다. 그것은 '두 번 선택'이 아니라
 * '한 번 누르려다 생긴 떨림'이다. 앱은 이를 오류로 처리하지 않고 한 번으로 센다.
 * ------------------------------------------------------------------ */
export function useSteadyPress<T extends unknown[]>(fn: (...a: T) => void) {
  const last = useRef(0);
  return useCallback(
    (...a: T) => {
      const now = Date.now();
      if (now - last.current < DOUBLE_TAP_GUARD_MS) return;
      last.current = now;
      fn(...a);
    },
    [fn],
  );
}

/* ------------------------------------------------------------------ *
 * 뼈대
 * ------------------------------------------------------------------ */
export function Screen({
  children,
  scroll = true,
  footer,
  /** 아래로 더 있다는 힌트. 스크롤이 익숙하지 않은 분을 위한 것이다. */
  scrollHint,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  footer?: React.ReactNode;
  scrollHint?: string;
}) {
  const { reduceMotion } = useStore();
  const [hintOn, setHintOn] = useState(false);
  const dismissed = useRef(false);

  useEffect(() => {
    // 움직이는 안내를 꺼 둔 분에게는 띄우지 않는다
    if (!scrollHint || reduceMotion) return;
    // 화면이 뜨자마자 띄우면 아직 읽는 중이라 눈에 안 들어온다. 잠깐 두고 보여준다.
    const show = setTimeout(() => {
      if (!dismissed.current) setHintOn(true);
    }, 1200);
    // 가만히 둬도 알아서 사라진다. 계속 떠 있으면 내용을 가린다.
    const hide = setTimeout(() => setHintOn(false), 7000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [scrollHint, reduceMotion]);

  const onScroll = useCallback(() => {
    // 한 번이라도 내렸으면 안내는 제 역할을 다한 것이다.
    dismissed.current = true;
    setHintOn(false);
  }, []);

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      {scroll ? (
        <ScrollView
          style={s.flex}
          contentContainerStyle={s.scrollBody}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={onScroll}
          scrollEventThrottle={64}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[s.flex, s.scrollBody]}>{children}</View>
      )}
      {scrollHint && !reduceMotion ? <ScrollHint text={scrollHint} visible={hintOn} /> : null}
      {footer ? <View style={s.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

export function AppBar({
  title,
  badge,
  settings,
}: {
  title: string;
  badge?: string;
  /** 설정 화면 자신에서는 톱니를 감춘다 */
  settings?: false;
}) {
  const router = useRouter();
  const openSettings = useSteadyPress(() => router.push('/settings'));
  const back = useSteadyPress(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  });
  return (
    <View style={s.appBar}>
      {/* 제목은 가운데 고정, 뒤로 버튼은 왼쪽에서 제 폭을 다 쓴다 */}
      <Text style={s.appBarTitle} accessibilityRole="header" numberOfLines={1}>
        {title}
      </Text>
      <View style={s.appBarRow}>
        <Pressable
          onPress={back}
          hitSlop={10}
          style={({ pressed }) => [s.backBtn, pressed && s.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
        >
          <Text style={s.backGlyph}>‹</Text>
          <Text style={s.backLabel}>뒤로</Text>
        </Pressable>
        <View style={s.appBarSpacer} />
        {badge ? (
          <View style={s.roleBadge}>
            <Text style={s.roleBadgeText}>{badge}</Text>
          </View>
        ) : null}
        {settings === false ? null : (
          <Pressable
            onPress={openSettings}
            hitSlop={10}
            style={({ pressed }) => [s.gear, pressed && s.gearPressed]}
            accessibilityRole="button"
            accessibilityLabel="설정. 목소리와 읽는 속도를 바꾸실 수 있어요."
          >
            <Text style={s.gearGlyph}>⚙</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export function H1({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <Text style={[s.h1, style]} accessibilityRole="header">
      {children}
    </Text>
  );
}

export function Accent({ children }: { children: React.ReactNode }) {
  return <Text style={s.accent}>{children}</Text>;
}

export function Sub({ children }: { children: React.ReactNode }) {
  return <Text style={s.sub}>{children}</Text>;
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[s.card, style]}>{children}</View>;
}

/* ------------------------------------------------------------------ *
 * 선택지 알약
 * ------------------------------------------------------------------ */
export function Chip({
  label,
  selected,
  onPress,
  mustBadge,
  a11yLabel,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  mustBadge?: boolean;
  a11yLabel?: string;
}) {
  const press = useSteadyPress(onPress);
  return (
    <Pressable
      onPress={press}
      hitSlop={6}
      style={({ pressed }) => [
        s.chip,
        selected && s.chipOn,
        pressed && (selected ? s.chipOnPressed : s.chipPressed),
      ]}
      accessibilityRole="radio"
      // radio 는 selected 가 아니라 checked 로 상태를 알린다. 둘 다 실어서
      // 화면 낭독기가 "선택됨"을 반드시 읽도록 한다.
      accessibilityState={{ checked: selected, selected }}
      aria-checked={selected}
      accessibilityLabel={a11yLabel ?? label}
    >
      <Text style={[s.chipText, selected && s.chipTextOn]}>{label}</Text>
      {selected && mustBadge ? (
        <View style={s.mustBadge}>
          <Text style={s.mustBadgeText}>꼭</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function ChipRow({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <View style={s.chipRow} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {children}
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * 버튼
 * ------------------------------------------------------------------ */
export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const press = useSteadyPress(onPress);
  const off = disabled || loading;
  return (
    <Pressable
      onPress={off ? undefined : press}
      style={({ pressed }) => [
        s.primaryBtn,
        off && s.primaryBtnOff,
        pressed && !off && s.primaryBtnPressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color={color.onPrimary} />
      ) : (
        <Text style={s.primaryBtnText}>{label}</Text>
      )}
    </Pressable>
  );
}

export function GhostButton({ label, onPress }: { label: string; onPress: () => void }) {
  const press = useSteadyPress(onPress);
  return (
    <Pressable
      onPress={press}
      style={({ pressed }) => [s.ghostBtn, pressed && s.ghostBtnPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={s.ghostBtnText}>{label}</Text>
    </Pressable>
  );
}

/**
 * '눌러서 들으실 수 있어요' 버튼.
 * onPhoto 는 사진 위에 얹을 때 쓰는 흰색 변형이다.
 */
export function SpeakLink({
  text,
  label = '눌러서 들으실 수 있어요',
  tone = 'brand',
}: {
  text: string;
  label?: string;
  tone?: 'brand' | 'onPhoto';
}) {
  const { speak, speaking } = useSpeak();
  const press = useSteadyPress(() => speak(text));
  return (
    <Pressable
      onPress={press}
      hitSlop={12}
      style={[s.speakLink, tone === 'onPhoto' && s.speakLinkOnPhoto]}
      accessibilityRole="button"
      accessibilityLabel={speaking ? '읽기 멈추기' : label}
    >
      <Text style={s.speakGlyph}>{speaking ? '❚❚' : '🔊'}</Text>
      <Text style={[s.speakText, tone === 'onPhoto' && s.speakTextOnPhoto]}>
        {speaking ? '멈추기' : label}
      </Text>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ *
 * 진행 표시
 * ------------------------------------------------------------------ */
export function Progress({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <View
      style={s.progressWrap}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`전체 ${total}개 중 ${done}개 완료, ${pct} 퍼센트`}
    >
      <View style={s.progressLabelRow}>
        <Text style={s.progressLabel}>
          {done}/{total} 완료
        </Text>
        <Text style={s.progressPct}>{pct}%</Text>
      </View>
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: color.bg },
  scrollBody: { paddingHorizontal: space.xl, paddingBottom: space.xl },
  footer: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.md,
    backgroundColor: color.bg,
  },

  appBar: {
    height: 64,
    justifyContent: 'center',
    marginHorizontal: -space.xl,
    paddingHorizontal: space.lg,
    backgroundColor: color.surface,
    marginBottom: space.xl,
  },
  appBarRow: { flexDirection: 'row', alignItems: 'center' },
  appBarSpacer: { flex: 1 },
  appBarTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: font.h2,
    fontFamily: family.extrabold,
    color: color.text,
  },
  // 뒤로 가기는 화살표 하나로 두지 않는다. 작은 표적은 손이 떨리면 못 맞히고,
  // 아이콘만 있으면 무엇인지 배워야 알 수 있다. 글자를 같이 둔다.
  backBtn: {
    minHeight: HIT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: space.md,
    paddingRight: space.lg,
    borderRadius: radius.chip,
    backgroundColor: color.surfaceSoft,
    borderWidth: 1.5,
    borderColor: color.border,
  },
  backBtnPressed: { backgroundColor: color.primarySoft, borderColor: color.borderStrong },
  backGlyph: { fontSize: 26, lineHeight: 30, color: color.primaryText, fontFamily: family.bold },
  backLabel: { fontSize: font.label, color: color.primaryText, fontFamily: family.bold },
  roleBadge: {
    backgroundColor: color.primarySoft,
    borderRadius: radius.chip,
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
  roleBadgeText: { color: color.onPrimarySoft, fontSize: font.caption, fontFamily: family.extrabold },
  gear: {
    width: HIT,
    height: HIT,
    marginLeft: space.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: HIT / 2,
  },
  gearPressed: { backgroundColor: color.primarySoft },
  gearGlyph: { fontSize: 21, color: color.textSub },

  h1: {
    fontSize: font.h1,
    lineHeight: font.h1 * 1.42,
    fontFamily: family.extrabold,
    color: color.text,
    ...keepAll,
  },
  accent: { color: color.primaryText },
  sub: {
    fontSize: font.label,
    lineHeight: font.label * 1.5,
    color: color.textMuted,
    marginTop: space.sm,
    fontFamily: family.regular,
    ...keepAll,
  },

  card: {
    backgroundColor: color.surface,
    borderRadius: radius.card,
    padding: space.xl,
    marginTop: space.lg,
    ...shadow.card,
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: TAP_GAP, marginTop: space.lg },
  chip: {
    minHeight: TAP_BIG,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.xxl,
    paddingVertical: space.lg,
    borderRadius: radius.chip,
    borderWidth: 1.5,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  chipPressed: { backgroundColor: color.surfaceSoft, borderColor: color.borderStrong },
  chipOn: { backgroundColor: color.primary, borderColor: color.primary },
  chipOnPressed: { backgroundColor: color.primaryPressed, borderColor: color.primaryPressed },
  chipText: { fontSize: font.body, fontFamily: family.bold, color: color.textSub },
  chipTextOn: { color: color.onPrimary },
  mustBadge: {
    backgroundColor: 'rgba(255,255,255,0.24)',
    borderRadius: radius.chip,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  mustBadgeText: { color: color.onPrimary, fontSize: 13, fontFamily: family.extrabold },

  primaryBtn: {
    minHeight: TAP_MAIN,
    borderRadius: radius.button,
    backgroundColor: color.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    ...shadow.button,
  },
  primaryBtnPressed: { backgroundColor: color.primaryPressed },
  primaryBtnOff: { backgroundColor: color.borderStrong, shadowOpacity: 0, elevation: 0 },
  primaryBtnText: { color: color.onPrimary, fontSize: font.body + 1, fontFamily: family.extrabold },

  /*
   * 두 번째 버튼.
   *
   * 처음에는 테두리 없이 회색 글씨만 두었더니 버튼으로 안 보이고 작아 보였다.
   * 주 버튼보다 덜 눈에 띄어야 하는 것이지 누르기 어려워야 하는 것이 아니다.
   * 테두리를 두르고 글자를 키워 '눌러도 되는 것'으로 읽히게 했다.
   */
  ghostBtn: {
    minHeight: TAP_BIG,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.xl,
    borderRadius: radius.button,
    borderWidth: 2,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
  },
  ghostBtnPressed: { backgroundColor: color.primarySoft, borderColor: color.primary },
  ghostBtnText: {
    color: color.primaryText,
    fontSize: font.body,
    fontFamily: family.bold,
    ...keepAll,
  },

  speakLink: {
    minHeight: HIT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.sm,
  },
  speakGlyph: { fontSize: font.body, fontFamily: family.regular },
  // 사진 위에서는 배경 밝기를 예측할 수 없다. 어두운 알약을 깔아
  // 어떤 사진이 와도 흰 글자의 명도 대비가 기준 아래로 내려가지 않게 고정한다.
  speakLinkOnPhoto: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(20,18,34,0.68)',
    borderRadius: radius.chip,
    paddingHorizontal: space.lg,
    paddingRight: space.xl,
    marginTop: space.lg,
  },
  speakText: { color: color.primaryText, fontSize: font.caption + 1, fontFamily: family.bold },
  speakTextOnPhoto: { color: '#FFFFFF' },

  progressWrap: { marginTop: space.xxl },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  progressLabel: { color: color.textMuted, fontSize: font.caption, fontFamily: family.semibold },
  progressPct: { color: color.primaryText, fontSize: font.caption, fontFamily: family.extrabold },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: color.primarySoft,
    marginTop: space.sm,
    overflow: 'hidden',
  },
  progressFill: { height: 8, borderRadius: 999, backgroundColor: color.primary },
});

/* ------------------------------------------------------------------ *
 * 그림이 붙는 선택지
 *
 * '레버형 손잡이'나 '보행기' 같은 말은 아는 사람만 안다. 글자만 두면 모르는
 * 분은 찍게 되고, 찍은 답이 요청서에 그대로 실려 나간다. 그래서 물건을 묻는
 * 선택지에는 그림을 함께 둔다.
 *
 * 칩 대신 한 줄씩 쌓는 이유는 두 가지다. 그림이 들어가면 칩 폭이 제각각이 되어
 * 눌러야 할 곳을 찾기 어려워지고, 세로로 쌓으면 표적이 화면 폭만큼 넓어진다.
 * ------------------------------------------------------------------ */
export function PickCard({
  label,
  image,
  selected,
  onPress,
  a11yLabel,
}: {
  label: string;
  image?: number;
  selected: boolean;
  onPress: () => void;
  a11yLabel?: string;
}) {
  const press = useSteadyPress(onPress);
  return (
    <Pressable
      onPress={press}
      style={({ pressed }) => [p.card, selected && p.cardOn, pressed && p.cardPressed]}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, selected }}
      aria-checked={selected}
      accessibilityLabel={a11yLabel ?? label}
    >
      {image ? (
        <View style={p.thumbWrap}>
          <Image source={image} style={p.thumb} resizeMode="contain" />
        </View>
      ) : (
        <View style={p.thumbEmpty} />
      )}
      <Text style={[p.label, selected && p.labelOn]} numberOfLines={2}>
        {label}
      </Text>
      {/* 색만으로 고른 것을 알리지 않는다. 고른 줄에는 표식이 함께 뜬다. */}
      <View style={[p.mark, selected && p.markOn]}>
        {selected ? <Text style={p.markGlyph}>✓</Text> : null}
      </View>
    </Pressable>
  );
}

export function PickList({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <View style={p.list} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {children}
    </View>
  );
}

const p = StyleSheet.create({
  list: { marginTop: space.lg, gap: TAP_GAP },
  card: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  cardOn: { borderColor: color.primary, backgroundColor: color.primarySoft },
  cardPressed: { backgroundColor: color.surfaceSoft },
  thumbWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.button,
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumb: { width: 64, height: 64 },
  thumbEmpty: { width: 0, height: 64 },
  label: {
    flex: 1,
    fontSize: font.label,
    lineHeight: font.label * 1.35,
    fontFamily: family.bold,
    color: color.text,
    ...keepAll,
  },
  labelOn: { color: color.onPrimarySoft },
  mark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: color.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markOn: { borderColor: color.primary, backgroundColor: color.primary },
  markGlyph: { color: color.onPrimary, fontSize: font.caption, fontFamily: family.bold },
});

/* ------------------------------------------------------------------ *
 * 노트
 *
 * 요청서와 판정 카드는 앱이 뱉어낸 결과가 아니라 사람이 적어 둔 기록으로 읽혀야 한다.
 * 중개사에게 건네는 문서이고, 당사자가 다시 꺼내 보는 기록이기도 하다.
 *
 * 진짜 종이처럼 보이게 하는 것은 장식이 아니라 줄과 글자의 관계다.
 * 줄을 그어 놓고 글자가 그 위에 앉지 않으면 그 순간 가짜가 된다.
 * 그래서 줄 간격(RULE)과 본문 행간을 같은 값으로 묶고, 첫 줄이 시작하는 높이도
 * 같은 값에서 끌어온다. 아래 noteText 를 쓰는 한 글자는 줄에서 벗어나지 않는다.
 *
 * 넓은 행간은 덤이 아니다. 저시력·인지 특성에서 줄 간격이 좁으면 읽던 줄을 놓친다.
 * ------------------------------------------------------------------ */

/**
 * 줄 간격. 본문 행간과 반드시 같아야 한다.
 *
 * 34로 잡았더니 글자가 줄에 닿을 듯 말 듯해서 읽기가 불안했다. 줄과 글자 사이에
 * 숨 쉴 자리가 있어야 눈이 줄을 따라간다. 저시력·인지 특성에서는 더 그렇다.
 */
export const RULE = 42;
// 첫 줄이 종이 위쪽에 닿아 보이면 답답하다. 한 줄만큼 띄우고 시작한다.
const NOTE_PAD_TOP = 52;

/** 종이 위 본문. 행간이 줄 간격에 묶여 있다. */
export const noteText = {
  // 종이 위의 글씨는 화면 글씨보다 한 단계 크게. 요청서는 중개사도 읽고
  // 당사자도 다시 꺼내 보는 문서라 멀리서도 읽혀야 한다.
  fontSize: font.h2,
  lineHeight: RULE,
  color: color.paperInk,
  fontFamily: family.regular,
  ...keepAll,
} as const;

export function NoteSheet({
  children,
  edge,
  style,
}: {
  children: React.ReactNode;
  /** 왼쪽 가장자리에 세우는 색 띠. 판정 카드에서 3단계를 구분하는 데 쓴다. */
  edge?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[n.sheet, style]}>
      {/* 공책 줄. 카드 높이를 모르므로 넉넉히 긋고 넘치는 것은 잘라 낸다. */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {Array.from({ length: 24 }).map((_, i) => (
          <View key={i} style={[n.rule, { top: NOTE_PAD_TOP + RULE * (i + 1) }]} />
        ))}
      </View>

      {edge ? <View pointerEvents="none" style={[n.edge, { backgroundColor: edge }]} /> : null}

      <View style={n.body}>{children}</View>
    </View>
  );
}

/** 노트 한 줄. 앞에 붙는 표는 글자와 같은 줄에 앉는다. */
export function NoteLine({
  text,
  mark = '·',
  strong,
}: {
  text: string;
  mark?: string;
  strong?: boolean;
}) {
  return (
    <View style={n.line} accessible accessibilityLabel={text}>
      <Text style={[noteText, n.mark]}>{mark}</Text>
      <Text style={[noteText, strong && n.strong]}>{text}</Text>
    </View>
  );
}

const n = StyleSheet.create({
  sheet: {
    marginTop: space.xl,
    backgroundColor: color.paper,
    borderRadius: 4,
    overflow: 'hidden',
    // 종이에는 테두리가 없다. 얹혀 있는 느낌만 그림자로 만든다.
    shadowColor: '#2A2416',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  // 줄은 마진선 안쪽에서만 긋는다. 끝까지 그으면 칸이 닫혀 표처럼 읽힌다.
  rule: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: color.paperRule },
  edge: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 6 },
  body: {
    paddingTop: NOTE_PAD_TOP - RULE + 8,
    paddingLeft: space.xxl,
    paddingRight: space.xxl,
    paddingBottom: RULE - 8,
  },

  line: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  mark: { width: 14, color: color.paperInkSub },
  strong: { fontFamily: family.bold },
});
