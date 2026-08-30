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
  // 아래 버튼 영역의 높이. 안내를 그 위에 띄우려면 얼마나 올려야 하는지 알아야 한다.
  const [footerH, setFooterH] = useState(0);
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
      {footer ? (
        <View style={s.footer} onLayout={(e) => setFooterH(e.nativeEvent.layout.height)}>
          {footer}
        </View>
      ) : null}
      {/*
        버튼 영역보다 뒤에 그린다. 앞에 두면 아래 버튼에 가려 한 번도 안 보인다.
        움직이는 안내를 꺼 두신 분에게는 띄우지 않는다.
      */}
      {scrollHint && !reduceMotion ? (
        <ScrollHint text={scrollHint} visible={hintOn} bottom={footerH + space.lg} />
      ) : null}
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
      {/*
        제목을 화면 가운데에 절대 위치로 두었더니 좁은 화면에서 오른쪽 배지와
        겹쳐 글자가 잘렸다. 세 칸으로 나누고 가운데 칸이 남는 만큼만 쓰게 한다.
      */}
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
        <Text
          style={s.appBarTitle}
          accessibilityRole="header"
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {title}
        </Text>
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
            <Text style={s.gearText}>설정</Text>
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
      style={({ pressed }) => [
        s.speakLink,
        tone === 'onPhoto' && s.speakLinkOnPhoto,
        pressed && (tone === 'onPhoto' ? s.speakOnPhotoPressed : s.speakPressed),
      ]}
      accessibilityRole="button"
      accessibilityLabel={speaking ? '읽기 멈추기' : label}
    >
      <View style={[s.speakBadge, tone === 'onPhoto' && s.speakBadgeOnPhoto]}>
        <Text style={s.speakGlyph}>{speaking ? '❚❚' : '🔊'}</Text>
      </View>
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
  appBarRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  appBarTitle: {
    flex: 1,
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
  /*
   * 설정.
   *
   * 톱니 하나만 두었더니 무엇을 여는 것인지 모르고 지나쳤다. 이 앱에서 설정은
   * 목소리와 읽는 속도를 바꾸는 곳이라 정작 필요한 분이 못 찾으면 안 된다.
   * 글자를 붙이고 테두리를 둘렀다.
   */
  gear: {
    minHeight: HIT,
    marginLeft: space.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space.md,
    borderRadius: radius.chip,
    borderWidth: 1.5,
    borderColor: color.border,
  },
  gearPressed: { backgroundColor: color.primarySoft, borderColor: color.primary },
  gearGlyph: { fontSize: 19, color: color.textSub },
  gearText: { fontSize: font.caption + 1, color: color.textSub, fontFamily: family.bold },

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

  /*
   * 소리로 듣기.
   *
   * 글로 읽기 어려운 분에게는 이것이 본문을 여는 유일한 문이다. 그런데
   * 작은 글씨에 작은 그림 하나로 두었더니 링크처럼 보여 눈에 걸리지 않았다.
   * '말로 답하기' 버튼과 같은 크기·같은 생김새로 맞춰 한 짝으로 읽히게 했다.
   */
  speakLink: {
    alignSelf: 'flex-start',
    minHeight: TAP_BIG,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.md,
    paddingLeft: space.sm,
    paddingRight: space.xl,
    // 테두리를 둘러 '눌러도 되는 것'으로 읽히게 한다. 그림 하나만 두면
    // 장식으로 보고 지나친다.
    borderRadius: radius.chip,
    borderWidth: 2,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
  },
  speakPressed: { backgroundColor: color.primarySoft, borderColor: color.primary },
  speakOnPhotoPressed: { backgroundColor: 'rgba(20,18,34,0.85)' },
  speakBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: color.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakBadgeOnPhoto: { backgroundColor: 'rgba(255,255,255,0.22)' },
  speakGlyph: { fontSize: 22, fontFamily: family.regular },
  // 사진 위에서는 배경 밝기를 예측할 수 없다. 어두운 알약을 깔아
  // 어떤 사진이 와도 흰 글자의 명도 대비가 기준 아래로 내려가지 않게 고정한다.
  speakLinkOnPhoto: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(20,18,34,0.68)',
    borderRadius: radius.chip,
    paddingHorizontal: space.sm,
    paddingRight: space.xl,
    marginTop: space.lg,
  },
  speakText: { color: color.primaryText, fontSize: font.label, fontFamily: family.bold, ...keepAll },
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
  index,
}: {
  label: string;
  image?: number;
  selected: boolean;
  onPress: () => void;
  a11yLabel?: string;
  /** 화면에 붙는 번호. 읽어주는 문장의 번호와 같아야 짚을 수 있다. */
  index?: number;
}) {
  const press = useSteadyPress(onPress);
  return (
    <Pressable
      onPress={press}
      style={({ pressed }) => [p.card, selected && p.cardOn, pressed && p.cardPressed]}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, selected }}
      aria-checked={selected}
      accessibilityLabel={index ? `${index}번, ${a11yLabel ?? label}` : (a11yLabel ?? label)}
    >
      {index ? <Text style={[p.no, selected && p.labelOn]}>{index}</Text> : null}
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
  no: { fontSize: font.caption + 1, fontFamily: family.extrabold, color: color.textMuted, minWidth: 14 },
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
 * 처음에는 공책처럼 줄을 그었는데 칸이 닫혀 표처럼 읽혔다. 종이라는 느낌은
 * 줄에서 나오는 것이 아니라 색과 여백, 그리고 얹혀 있는 그림자에서 나온다.
 * 줄은 걷어내고 행간만 넉넉히 남겼다.
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
      {edge ? <View pointerEvents="none" style={[n.edge, { backgroundColor: edge }]} /> : null}

      <View style={n.body}>{children}</View>
    </View>
  );
}

/** 노트 한 줄. 앞에 붙는 표는 글자와 같은 줄에 앉는다. */
export function NoteLine({
  text,
  mark = '✓',
  strong,
  /**
   * 형광펜을 칠할 대목.
   *
   * 줄 전체를 칠하면 어디가 핵심인지 알 수 없다. 이 줄에서 실제로 읽어야 하는
   * 것은 수치다 — '현관문 폭'이 아니라 '90cm 이상'이 내용이다.
   * 색으로만 나누지 않도록 앞의 체크 표시와 함께 쓴다.
   */
  emphasis,
}: {
  text: string;
  mark?: string;
  strong?: boolean;
  emphasis?: string;
}) {
  const at = emphasis ? text.indexOf(emphasis) : -1;
  const head = at >= 0 ? text.slice(0, at) : text;
  const tail = at >= 0 ? text.slice(at + (emphasis as string).length) : '';

  return (
    <View style={n.line} accessible accessibilityLabel={text}>
      <Text style={[noteText, n.mark]}>{mark}</Text>
      {/* flex 를 주지 않으면 긴 줄이 카드 밖으로 밀려 나간다 */}
      <Text style={[noteText, n.lineBody, strong && n.strong]}>
        {head}
        {at >= 0 ? <Text style={n.hi}>{emphasis}</Text> : null}
        {tail}
      </Text>
    </View>
  );
}

const n = StyleSheet.create({
  sheet: {
    marginTop: space.xl,
    backgroundColor: color.paper,
    // 종이 모서리. 각지면 딱딱하고 많이 둥글면 종이가 아니라 카드로 보인다.
    borderRadius: 12,
    overflow: 'hidden',
    // 종이에는 테두리가 없다. 얹혀 있는 느낌만 그림자로 만든다.
    shadowColor: '#2A2416',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  // 줄은 마진선 안쪽에서만 긋는다. 끝까지 그으면 칸이 닫혀 표처럼 읽힌다.

  edge: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 6 },
  body: {
    paddingTop: space.xxl,
    paddingLeft: space.xxl,
    paddingRight: space.xxl,
    paddingBottom: space.xxl,
  },

  line: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  mark: { width: 20, color: color.primaryText },
  lineBody: { flex: 1 },
  /*
   * 형광펜.
   *
   * 줄 높이만큼 칠하면 띠가 두꺼워 형광펜이 아니라 색칠한 칸으로 보인다.
   * 행간을 줄여 글자보다 조금 낮게 그어지도록 했다.
   */
  hi: {
    backgroundColor: color.marker,
    lineHeight: RULE - 14,
    fontFamily: family.bold,
    color: color.paperInk,
  },
  strong: { fontFamily: family.bold },
});
