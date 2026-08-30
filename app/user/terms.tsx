import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Accent,
  AppBar,
  Card,
  H1,
  PickCard,
  PickList,
  PrimaryButton,
  Screen,
  SpeakLink,
  Sub,
  useSteadyPress,
} from '../../src/components/ui';
import { NEAR_OPTIONS } from '../../src/domain/questions';
import { emptyTerms, type GeneralTerms } from '../../src/domain/types';
import { useStore } from '../../src/store';
import { color, family, font, HIT, keepAll, radius, space, TAP_GAP } from '../../src/theme';

/**
 * 2단계 일반 조건.
 *
 * 1단계와 나눈 이유가 있다. 몸에 맞는 조건과 예산은 성격이 다르다.
 * 앞엣것은 안 맞으면 아예 못 들어가는 것이고, 뒤엣것은 안 맞으면 아쉬운 것이다.
 * 한 화면에 섞으면 둘의 무게가 같아 보이고, 판정도 예산 때문에 뒤집힌 것처럼 읽힌다.
 *
 * 그래서 여기 적은 값은 판정에 쓰지 않는다. 중개사가 매물을 고를 때 쓰도록
 * 요청서에 그대로 실어 보낸다.
 *
 * 전부 건너뛸 수 있다. 아직 정하지 못한 것을 억지로 적게 만들면 그 값이 거짓이 된다.
 */

export default function TermsScreen() {
  const router = useRouter();
  const { profile, saveProfile } = useStore();

  const [terms, setTerms] = useState<GeneralTerms>(
    () => profile?.terms ?? emptyTerms(),
  );

  if (!profile) {
    return (
      <Screen>
        <AppBar title="집 조건" />
        <H1>먼저 앞 단계를 채워요</H1>
        <View style={{ height: space.xl }} />
        <PrimaryButton label="요청서 만들기" onPress={() => router.replace('/user/profile')} />
      </Screen>
    );
  }

  const set = <K extends keyof GeneralTerms>(key: K, value: GeneralTerms[K]) =>
    setTerms((t) => ({ ...t, [key]: value }));

  const toggleNear = (id: string) =>
    setTerms((t) => ({
      ...t,
      near: t.near.includes(id) ? t.near.filter((x) => x !== id) : [...t.near, id],
    }));

  const next = () => {
    saveProfile({ ...profile, terms, updatedAt: new Date().toISOString() });
    router.push('/user/request');
  };

  return (
    <Screen
      scrollHint="아래로 내리면서 채워주세요"
      footer={<PrimaryButton label="다음으로" onPress={next} />}
    >
      <AppBar title="집 조건" />

      <H1>
        <Accent>어떤 집</Accent>을 찾으세요?
      </H1>
      <SpeakLink
        text="어떤 집을 찾으세요? 아직 정하지 않으셨으면 비워두고 넘어가셔도 됩니다."
        label="아직 안 정하셨으면 비워두셔도 돼요"
      />

      <Card>
        <Text style={s.q}>어느 동네에서 찾으세요?</Text>
        <Sub>중개사가 제일 먼저 보는 조건이에요</Sub>
        <TextInput
          value={terms.area}
          onChangeText={(v) => set('area', v)}
          placeholder="예: 익산시 신동, 원광대 근처"
          placeholderTextColor={color.textMuted}
          style={s.area}
          accessibilityLabel="찾으시는 동네나 지역을 넣어주세요. 비워두셔도 됩니다."
        />
      </Card>

      <Card>
        <Money
          label="보증금"
          value={terms.depositMan}
          onChange={(v) => set('depositMan', v)}
        />
        <Money label="월세" value={terms.rentMan} onChange={(v) => set('rentMan', v)} />
      </Card>

      <Card>
        <Text style={s.q}>방은 몇 개면 좋으세요?</Text>
        <PickList label="방은 몇 개면 좋으세요?">
          <PickCard
            label="한 개면 돼요"
            selected={terms.rooms === 'one'}
            onPress={() => set('rooms', terms.rooms === 'one' ? null : 'one')}
          />
          <PickCard
            label="두 개 이상이면 좋겠어요"
            selected={terms.rooms === 'two'}
            onPress={() => set('rooms', terms.rooms === 'two' ? null : 'two')}
          />
        </PickList>
      </Card>

      <Card>
        <Text style={s.q}>몇 층이 좋으세요?</Text>
        <PickList label="몇 층이 좋으세요?">
          <PickCard
            label="낮은 층이 좋아요"
            selected={terms.floorPref === 'low'}
            onPress={() => set('floorPref', terms.floorPref === 'low' ? null : 'low')}
          />
          <PickCard
            label="높은 층이 좋아요"
            selected={terms.floorPref === 'high'}
            onPress={() => set('floorPref', terms.floorPref === 'high' ? null : 'high')}
          />
          <PickCard
            label="상관없어요"
            selected={terms.floorPref === 'any'}
            onPress={() => set('floorPref', terms.floorPref === 'any' ? null : 'any')}
          />
        </PickList>
      </Card>

      <Card>
        <Text style={s.q}>걸어서 갈 수 있으면 좋은 곳이 있으세요?</Text>
        <Sub>여러 개 고르셔도 돼요</Sub>
        <View style={s.tagRow} accessibilityRole="list">
          {NEAR_OPTIONS.map((o) => (
            <Tag
              key={o.id}
              label={o.label}
              on={terms.near.includes(o.id)}
              onPress={() => toggleNear(o.id)}
            />
          ))}
        </View>
      </Card>
    </Screen>
  );
}

/**
 * 돈을 적는 칸.
 *
 * 만원 단위로만 받는다. 0을 몇 개 적어야 하는지 세는 일이 사라지고,
 * 잘못 적어서 자릿수가 어긋나는 일도 줄어든다.
 */
function Money({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const [text, setText] = useState(value === null ? '' : String(value));

  const commit = (raw: string) => {
    setText(raw);
    const cleaned = raw.replace(/[^0-9]/g, '');
    onChange(cleaned === '' ? null : Number(cleaned));
  };

  return (
    <View style={s.moneyRow}>
      <Text style={s.moneyLabel}>{label}</Text>
      <View style={s.moneyInputWrap}>
        <TextInput
          value={text}
          onChangeText={commit}
          keyboardType="number-pad"
          placeholder="—"
          placeholderTextColor={color.textMuted}
          style={s.moneyInput}
          accessibilityLabel={`${label}. 만원 단위 숫자로 넣어주세요. 아직 안 정하셨으면 비워두세요.`}
        />
        <Text style={s.moneyUnit}>만원</Text>
      </View>
    </View>
  );
}

function Tag({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const press = useSteadyPress(onPress);
  return (
    <Pressable
      onPress={press}
      style={[s.tag, on && s.tagOn]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      aria-checked={on}
      accessibilityLabel={label}
    >
      <Text style={[s.tagText, on && s.tagTextOn]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  q: { fontSize: font.body, lineHeight: font.body * 1.4, fontFamily: family.bold, color: color.text, ...keepAll },

  area: {
    marginTop: space.lg,
    height: 72,
    borderRadius: radius.button,
    borderWidth: 2,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceSoft,
    paddingHorizontal: space.lg,
    fontSize: font.body,
    fontFamily: family.semibold,
    color: color.text,
  },

  moneyRow: {
    marginTop: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.lg,
  },
  moneyLabel: { fontSize: font.h2, fontFamily: family.bold, color: color.text },
  moneyInputWrap: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  // 숫자를 적는 칸은 크게. 손이 떨려도 들어가고, 적은 값이 멀리서도 읽힌다.
  moneyInput: {
    width: 132,
    height: 72,
    borderRadius: radius.button,
    borderWidth: 2,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceSoft,
    paddingHorizontal: space.md,
    textAlign: 'right',
    fontSize: 26,
    fontFamily: family.extrabold,
    color: color.text,
  },
  moneyUnit: { fontSize: font.label, fontFamily: family.semibold, color: color.textSub },

  tagRow: { marginTop: space.lg, flexDirection: 'row', flexWrap: 'wrap', gap: TAP_GAP },
  tag: {
    minHeight: HIT,
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    borderRadius: radius.chip,
    borderWidth: 2,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  tagOn: { borderColor: color.primary, backgroundColor: color.primarySoft },
  tagText: { fontSize: font.label, fontFamily: family.bold, color: color.textSub },
  tagTextOn: { color: color.onPrimarySoft },
});
