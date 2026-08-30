import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  AppBar,
  Card,
  GhostButton,
  H1,
  PrimaryButton,
  Screen,
  Sub,
  useSteadyPress,
} from '../../src/components/ui';
import { VoiceAnswer, VoiceButton } from '../../src/components/VoiceAnswer';
import { parseKoreanNumber } from '../../src/domain/koreanNumber';
import { voiceChoicesFor } from '../../src/domain/questions';
import type { Media, PropertyFacts } from '../../src/domain/types';
import { useStore } from '../../src/store';
import { color, family, font, HIT, radius, space, TAP_BIG, TAP_GAP } from '../../src/theme';

/**
 * 매물 실측 입력 (중개사 화면).
 *
 * 있다·없다가 아니라 잰 숫자를 받는다. 중개사는 줄자를 들고 다니고,
 * 30초면 끝나는 일이다. 숫자를 받으면 판정이 3단계로 정확히 갈리고
 * '언제 누가 쟀는지'가 판정 카드에 근거로 남는다.
 *
 * 항목을 다섯에서 늘리지 않으려 애썼지만 계단만은 두 곳으로 나눴다.
 * 승강기가 있어도 중앙현관 안쪽 반계단이 막으면 휠체어는 들어가지 못한다.
 * 한 항목으로 뭉치면 '승강기 있음 → 갈 수 있어요'라는 오판정이 나온다.
 *
 * 비워 두면 '모름'이다. 모르는 것을 0으로 적게 만들면 그 순간 데이터가 거짓이 된다.
 */
/** JSX 안에서 줄바꿈을 넣을 때 쓴다. */
const BR = String.fromCharCode(10);

export default function Checklist() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { properties, updateFacts, updateInfo } = useStore();
  const property = properties.find((p) => p.id === id);

  const [draft, setDraft] = useState<PropertyFacts | null>(property?.facts ?? null);
  const [memo, setMemo] = useState(property?.memo ?? '');
  const [deposit, setDeposit] = useState<number | null>(property?.depositMan ?? null);
  const [rent, setRent] = useState<number | null>(property?.rentMan ?? null);
  const [media, setMedia] = useState<Media[]>(property?.media ?? []);
  const [nearby, setNearby] = useState(property?.nearby ?? '');

  /*
   * 말로 넣기.
   *
   * 중개사는 줄자를 들고 서 있다. 그 자세로 작은 칸을 정확히 누르라고 하면
   * 그 자리에서 앱을 닫는다. 재면서 "구십이" 하고 말하면 들어가야 한다.
   * 화면에는 들은 값을 먼저 보여주고 확인을 받는다 — 틀린 숫자가 그대로
   * 판정에 쓰이는 것을 막는 규칙은 여기서도 같다.
   */
  const [voice, setVoice] = useState<VoiceTask | null>(null);

  // 다른 화면에서 이 매물의 값이 바뀌면(통화 분석 저장 등) 입력칸도 따라간다.
  const loaded = useRef(false);
  useEffect(() => {
    if (property && !loaded.current) {
      setDraft(property.facts);
      loaded.current = true;
    }
  }, [property]);

  if (!property || !draft) {
    return (
      <Screen>
        <AppBar title="매물 확인" badge="중개사" />
        <H1>매물을 찾을 수 없어요</H1>
        <View style={{ height: space.xl }} />
        <PrimaryButton label="목록으로" onPress={() => router.replace('/agent')} />
      </Screen>
    );
  }

  const set = <K extends keyof PropertyFacts>(key: K, value: PropertyFacts[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));


  const save = () => {
    updateFacts(property.id, draft);
    updateInfo(property.id, {
      memo,
      depositMan: deposit,
      rentMan: rent,
      media,
      nearby,
    });
    router.replace('/agent');
  };

  return (
    <Screen
      scrollHint="아래로 내리면서 재신 값을 넣어주세요"
      footer={
        <>
          <PrimaryButton label="저장하기" onPress={save} />
          <GhostButton
            label="통화 녹음으로 채우기"
            onPress={() =>
              router.push({ pathname: '/agent/call', params: { id: property.id } })
            }
          />
        </>
      }
    >
      <AppBar title="매물 확인" badge="중개사" />

      <H1>{property.name}</H1>
      <Sub>모르시는 칸은 비워두시면 됩니다</Sub>

      {/*
        가격.
        사용자는 구간 버튼으로 고르지만 중개사에게는 500/33 이 매물을 부르는 이름이다.
        정확한 숫자를 그대로 받는다.
      */}
      <Card>
        <Text style={s.section}>보증금 · 월세</Text>
        <Num label="보증금" unit="만원" value={deposit} onChange={setDeposit} ask={setVoice} />
        <Num label="월세" unit="만원" value={rent} onChange={setRent} ask={setVoice} />
      </Card>

      {/* ① ② 계단 두 곳 — 한 장의 그림으로 어디를 보는지 알려준다 */}
      <Card>
        <Text style={s.section}>계단</Text>
        <Image source={require('../../assets/fig-entry.jpg')} style={s.fig} resizeMode="contain" />
        <Text style={s.figCap}>
          ① 중앙현관문 앞 · ② 현관 들어가서 1층 집 앞{BR}
          두 곳을 따로 봐주세요
        </Text>

        <Num
          label="① 중앙현관문 앞 계단"
          unit="칸"
          value={draft.outStepCount}
          onChange={(v) => set('outStepCount', v)}
          ask={setVoice}
        />
        <Toggle
          label="중앙현관문 앞에 경사로가 있다"
          value={draft.outRamp}
          onChange={(v) => set('outRamp', v)}
          ask={setVoice}
        />
        <Num
          label="② 현관 들어가서 1층 집 앞까지"
          hint="흔히 반계단이라고 하는 그것"
          unit="칸"
          value={draft.inStepCount}
          onChange={(v) => set('inStepCount', v)}
          ask={setVoice}
        />
      </Card>

      {/* ③ 현관문 폭 */}
      <Card>
        <Text style={s.section}>현관문 폭</Text>
        <Image
          source={require('../../assets/fig-doorwidth.jpg')}
          style={s.fig}
          resizeMode="contain"
        />
        <Text style={s.figCap}>문 활짝 열고 문틀 안쪽에서 안쪽까지</Text>
        <Num
          label="현관문 폭"
          unit="cm"
          value={draft.doorWidthCm}
          onChange={(v) => set('doorWidthCm', v)}
          ask={setVoice}
        />
      </Card>

      {/* ④ 화장실 문턱 */}
      <Card>
        <Text style={s.section}>화장실</Text>
        <Image
          source={require('../../assets/fig-threshold.jpg')}
          style={s.fig}
          resizeMode="contain"
        />
        <Text style={s.figCap}>턱의 옆면 높이. 턱이 없으면 0을 넣어주세요</Text>
        <Num
          label="화장실 문턱 높이"
          unit="cm"
          value={draft.bathroomSillCm}
          onChange={(v) => set('bathroomSillCm', v)}
          ask={setVoice}
        />
        <Num
          label="화장실 문 폭"
          unit="cm"
          value={draft.bathroomDoorCm}
          onChange={(v) => set('bathroomDoorCm', v)}
          ask={setVoice}
        />
      </Card>

      {/* ⑤ 승강기와 층 */}
      <Card>
        <Text style={s.section}>승강기와 층</Text>
        <Num label="이 집은" unit="층" value={draft.floor} onChange={(v) => set('floor', v)} />
        <Toggle
          label="승강기가 있다"
          value={draft.hasElevator}
          onChange={(v) => set('hasElevator', v)}
          ask={setVoice}
        />
      </Card>

      {/*
        걸어서 몇 분인지.
        판정에는 쓰지 않는다. 몇 분이면 충분한지에 대한 기준값은 근거가 없다.
        다만 지역사회 접근성이 삶의 질에 미치는 영향은 문헌이 반복해서 말하고 있어
        재어 두고 그대로 전한다.
      */}
      <Card>
        <Text style={s.section}>
          걸어서 갈 수 있는 곳 <Text style={s.optional}>선택</Text>
        </Text>
        <Text style={s.figCap}>무엇이 얼마나 가까운지 그대로 적어 주시면 됩니다</Text>
        <TextInput
          value={nearby}
          onChangeText={setNearby}
          multiline
          placeholder="예: 버스정류장 걸어서 4분, 편의점 3분, ○○의원 9분"
          placeholderTextColor={color.textMuted}
          style={s.memo}
          accessibilityLabel="걸어서 갈 수 있는 곳을 적어주세요. 비워두셔도 됩니다."
        />
        <Mic
          label="걸어서 갈 수 있는 곳, 말로 넣기"
          onPress={() =>
            setVoice({
              title: '걸어서 갈 수 있는 곳이 어디인가요?',
              kind: 'text',
              apply: (v) => setNearby((t) => (t ? `${t}, ${v as string}` : (v as string))),
            })
          }
        />
      </Card>

      {/* 참고 정보. 판정에는 쓰지 않는다. */}
      <Card>
        <Text style={s.section}>
          주차 <Text style={s.optional}>선택</Text>
        </Text>
        <Toggle
          label="주차 자리가 있다"
          value={draft.parking}
          onChange={(v) => set('parking', v)}
          ask={setVoice}
        />
      </Card>

      {/*
        영상.

        재는 것과 보여주는 것은 서로를 대신하지 못한다. 90cm 라는 숫자로는
        현관까지 가는 동선이나 반계단의 실제 높이가 전해지지 않는다.
        다만 판정은 여전히 잰 숫자로만 한다 — 영상은 근거이지 판정 재료가 아니다.
      */}
      <Card>
        <Text style={s.section}>
          사진 · 영상 <Text style={s.optional}>선택</Text>
        </Text>
        <Text style={s.figCap}>
          급하시면 사진 몇 장, 여유 있으시면 현관 앞부터 집 안까지 영상 한 번이면 됩니다
        </Text>

        {media.length > 0 ? (
          <View style={s.mediaRow}>
            {media.map((m, i) => (
              <MediaThumb
                key={m.uri + i}
                item={m}
                onRemove={() => setMedia((xs) => xs.filter((_, j) => j !== i))}
              />
            ))}
          </View>
        ) : null}

        <View style={s.mediaBtns}>
          <SmallButton label="사진 찍기" onPress={() => shoot('image', setMedia)} />
          <SmallButton label="영상 찍기" onPress={() => shoot('video', setMedia)} />
        </View>
        <GhostButton label="앨범에서 고르기" onPress={() => choose(setMedia)} />
      </Card>

      {/*
        숫자로 담기지 않는 것들이 있다. 채광, 관리비, 입주 가능일 같은 것.
        실제 중개사는 이런 것을 글로 적어 보낸다. 그대로 적을 자리를 둔다.
      */}
      <Card>
        <Text style={s.section}>
          덧붙일 말 <Text style={s.optional}>선택</Text>
        </Text>
        <Text style={s.figCap}>채광, 관리비, 입주 가능일처럼 재서 담기지 않는 것들</Text>
        <TextInput
          value={memo}
          onChangeText={setMemo}
          multiline
          placeholder="예: 남향이라 낮에 밝습니다. 관리비 5만원 별도."
          placeholderTextColor={color.textMuted}
          style={s.memo}
          accessibilityLabel="매물에 덧붙일 말을 적어주세요. 비워두셔도 됩니다."
        />
      </Card>

      {/* 말로 넣기. 손으로 넣는 것을 대신하지 않고 나란히 둔다. */}
      {voice ? (
        <VoiceAnswer
          visible
          title={voice.title}
          freeText={voice.kind !== 'bool'}
          choices={
            voice.kind === 'bool'
              ? voiceChoicesFor([
                  { id: 'yes', label: '있어요' },
                  { id: 'no', label: '없어요' },
                ])
              : []
          }
          onPick={(said) => {
            if (voice.kind === 'bool') {
              voice.apply(said === 'yes');
              return;
            }
            if (voice.kind === 'text') {
              voice.apply(said);
              return;
            }
            // 못 알아들으면 채우지 않는다. 틀린 숫자보다 빈 칸이 낫다.
            const n = parseKoreanNumber(said);
            if (n !== null) voice.apply(n);
          }}
          onClose={() => setVoice(null)}
        />
      ) : null}
    </Screen>
  );
}

/**
 * 영상을 찍거나 고른다.
 *
 * 권한을 거절당해도 앱이 멈추지 않는다. 영상은 있으면 좋은 것이지 없으면
 * 매물을 못 올리는 것이 아니다.
 */
type Add = (fn: (xs: Media[]) => Media[]) => void;

const toMedia = (assets: ImagePicker.ImagePickerAsset[]): Media[] =>
  assets.map((a) => ({ uri: a.uri, kind: a.type === 'video' ? 'video' : 'image' }));

async function shoot(kind: 'image' | 'video', add: Add) {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return;
  const res = await ImagePicker.launchCameraAsync({
    mediaTypes: kind === 'video' ? ['videos'] : ['images'],
    quality: 0.7,
  });
  if (!res.canceled) add((xs) => [...xs, ...toMedia(res.assets)]);
}

async function choose(add: Add) {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    allowsMultipleSelection: true,
    selectionLimit: 5,
    quality: 0.7,
  });
  if (!res.canceled) add((xs) => [...xs, ...toMedia(res.assets)]);
}

function MediaThumb({ item, onRemove }: { item: Media; onRemove: () => void }) {
  const remove = useSteadyPress(onRemove);
  return (
    <View>
      {item.kind === 'video' ? (
        <VideoThumb uri={item.uri} />
      ) : (
        <Image source={{ uri: item.uri }} style={s.thumb} resizeMode="cover" />
      )}
      <Pressable
        onPress={remove}
        style={s.thumbX}
        accessibilityRole="button"
        accessibilityLabel={item.kind === 'video' ? '이 영상 빼기' : '이 사진 빼기'}
      >
        <Text style={s.thumbXText}>✕</Text>
      </Pressable>
    </View>
  );
}

function VideoThumb({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri);
  return <VideoView player={player} style={s.thumb} nativeControls contentFit="cover" />;
}

/** 나란히 두는 작은 주 버튼 */
function SmallButton({ label, onPress }: { label: string; onPress: () => void }) {
  const press = useSteadyPress(onPress);
  return (
    <Pressable
      onPress={press}
      style={({ pressed }) => [s.small, pressed && s.smallPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={s.smallText}>{label}</Text>
    </Pressable>
  );
}

/** 숫자 한 칸. 비우면 '모름'으로 남는다. */
type VoiceTask = { title: string; kind: 'num' | 'bool' | 'text'; apply: (v: unknown) => void };

/** 줄 끝에 붙는 작은 말하기 단추 */
function Mic({ label, onPress }: { label: string; onPress: () => void }) {
  const press = useSteadyPress(onPress);
  return (
    <Pressable
      onPress={press}
      style={({ pressed }) => [s.mic, pressed && s.micPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={s.micGlyph}>🎙️</Text>
    </Pressable>
  );
}

function Num({
  label,
  hint,
  unit,
  value,
  onChange,
  ask,
}: {
  label: string;
  hint?: string;
  unit: string;
  value: number | null;
  onChange: (v: number | null) => void;
  /** 말로 넣기를 열어 주는 함수. 없으면 말하기 버튼을 붙이지 않는다. */
  ask?: (t: VoiceTask) => void;
}) {
  const [text, setText] = useState(value === null ? '' : String(value));

  const commit = (raw: string) => {
    setText(raw);
    const cleaned = raw.replace(/[^0-9.]/g, '');
    if (cleaned === '') {
      onChange(null);
      return;
    }
    const n = Number(cleaned);
    onChange(Number.isFinite(n) ? n : null);
  };

  return (
    <View style={s.rowWrap}>
      <View style={s.row}>
        <View style={s.rowText}>
          <Text style={s.rowLabel}>{label}</Text>
          {hint ? <Text style={s.rowHint}>{hint}</Text> : null}
        </View>
        <View style={s.inputWrap}>
          <TextInput
            value={text}
            onChangeText={commit}
            keyboardType="decimal-pad"
            placeholder="—"
            placeholderTextColor={color.textMuted}
            style={s.input}
            accessibilityLabel={`${label}. 숫자로 넣어주세요. 단위는 ${unit}. 모르시면 비워두세요.`}
          />
          <Text style={s.unit}>{unit}</Text>
          {/* 말하기 버튼을 줄 아래에 따로 두었더니 칸마다 두 줄이 되어 어지러웠다.
              같은 줄 끝에 작은 단추로 붙인다. */}
          {ask ? (
            <Mic
              label={`${label}, 말로 넣기`}
              onPress={() =>
                ask({
                  title: `${label}은 얼마인가요?`,
                  kind: 'num',
                  apply: (v) => {
                    const n = v as number;
                    setText(String(n));
                    onChange(n);
                  },
                })
              }
            />
          ) : null}
      </View>
      </View>
    </View>
  );
}

/**
 * 있다·없다·모름 세 가지.
 *
 * 체크박스 하나로 두면 '안 누른 것'과 '없다고 답한 것'이 구분되지 않는다.
 * 모르는 것을 없음으로 저장하지 않으려면 세 번째 칸이 반드시 있어야 한다.
 */
function Toggle({
  label,
  value,
  onChange,
  ask,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean | null) => void;
  ask?: (t: VoiceTask) => void;
}) {
  const pick = useSteadyPress((v: boolean | null) => onChange(v));
  const opts: { v: boolean | null; text: string }[] = [
    { v: true, text: '있음' },
    { v: false, text: '없음' },
    { v: null, text: '모름' },
  ];
  return (
    <View style={s.toggleBlock}>
      <Text style={s.rowLabel}>{label}</Text>
      <View style={s.toggleRow} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {opts.map((o) => {
          const on = value === o.v;
          return (
            <Pressable
              key={o.text}
              onPress={() => pick(o.v)}
              style={[s.toggle, on && s.toggleOn]}
              accessibilityRole="radio"
              accessibilityState={{ checked: on, selected: on }}
              aria-checked={on}
              accessibilityLabel={`${label} ${o.text}`}
            >
              <Text style={[s.toggleText, on && s.toggleTextOn]}>{o.text}</Text>
            </Pressable>
          );
        })}
      </View>
      {ask ? (
        <VoiceButton
          onPress={() =>
            ask({
              title: label,
              kind: 'bool',
              apply: (v) => onChange(v as boolean | null),
            })
          }
        />
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  section: { fontSize: font.body, fontFamily: family.extrabold, color: color.text },
  optional: { fontSize: font.caption, fontFamily: family.regular, color: color.textMuted },

  fig: {
    width: '100%',
    height: 170,
    marginTop: space.md,
    borderRadius: radius.button,
    backgroundColor: color.bg,
  },
  figCap: {
    marginTop: space.sm,
    fontSize: font.caption,
    lineHeight: font.caption * 1.5,
    color: color.textMuted,
    fontFamily: family.regular,
  },

  rowWrap: { marginTop: space.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.lg,
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: font.label, fontFamily: family.bold, color: color.text },
  rowHint: {
    marginTop: 2,
    fontSize: font.caption,
    color: color.textMuted,
    fontFamily: family.regular,
  },

  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  mic: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
  },
  micPressed: { backgroundColor: color.primarySoft, borderColor: color.primary },
  micGlyph: { fontSize: 20 },
  input: {
    width: 84,
    height: TAP_BIG,
    borderRadius: radius.button,
    borderWidth: 2,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceSoft,
    paddingHorizontal: space.md,
    textAlign: 'center',
    fontSize: font.h2,
    fontFamily: family.bold,
    color: color.text,
  },
  unit: { fontSize: font.caption + 1, fontFamily: family.semibold, color: color.textSub, width: 34 },

  mediaRow: { marginTop: space.lg, flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  thumb: { width: 96, height: 96, borderRadius: radius.button, backgroundColor: color.bg },
  thumbX: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: color.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbXText: { color: '#FFFFFF', fontSize: font.caption, fontFamily: family.bold },

  mediaBtns: { marginTop: space.lg, flexDirection: 'row', gap: space.md },
  small: {
    flex: 1,
    minHeight: TAP_BIG,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.button,
    backgroundColor: color.primary,
  },
  smallPressed: { backgroundColor: color.primaryPressed },
  smallText: { color: color.onPrimary, fontSize: font.label, fontFamily: family.bold },

  memo: {
    marginTop: space.md,
    minHeight: 110,
    borderRadius: radius.button,
    borderWidth: 2,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceSoft,
    padding: space.lg,
    fontSize: font.label,
    lineHeight: font.label * 1.55,
    fontFamily: family.regular,
    color: color.text,
    textAlignVertical: 'top',
  },

  toggleBlock: { marginTop: space.xl },
  // 표적이 커도 서로 붙어 있으면 옆 것을 누르게 된다. 간격도 기준(16)을 지킨다.
  toggleRow: { marginTop: space.md, flexDirection: 'row', gap: TAP_GAP },
  toggle: {
    flex: 1,
    minHeight: HIT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.button,
    borderWidth: 2,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  toggleOn: { borderColor: color.primary, backgroundColor: color.primarySoft },
  toggleText: { fontSize: font.label, fontFamily: family.bold, color: color.textSub },
  toggleTextOn: { color: color.onPrimarySoft },
});
