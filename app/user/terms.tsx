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
import { VoiceAnswer, VoiceButton } from '../../src/components/VoiceAnswer';
import {
  DEPOSIT_BANDS,
  NEAR_OPTIONS,
  RENT_BANDS,
  suggestAreas,
  voiceChoicesFor,
} from '../../src/domain/questions';
import { emptyTerms, type GeneralTerms } from '../../src/domain/types';
import { useStore } from '../../src/store';
import { color, family, font, keepAll, radius, space, TAP_BIG, TAP_GAP } from '../../src/theme';

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

/** 이미 추천에서 고른 값과 똑같이 적혀 있으면 목록을 또 띄우지 않는다. */
const NEAR_HIT = (v: string) => suggestAreas(v).some((a) => a === v.trim());

type VoiceKey = 'area' | 'deposit' | 'rent' | 'rooms' | 'floor' | 'near';

const VOICE_TITLE: Record<VoiceKey, string> = {
  area: '어느 동네에서 찾으세요?',
  deposit: '보증금은 얼마쯤 생각하세요?',
  rent: '월세는요?',
  rooms: '방은 몇 개면 좋으세요?',
  floor: '몇 층이 좋으세요?',
  near: '걸어서 갈 수 있으면 좋은 곳이 있으세요?',
};

export default function TermsScreen() {
  const router = useRouter();
  const { profile, saveProfile } = useStore();

  // 지금 말로 답하는 중인 질문. null 이면 열려 있지 않다.
  const [speaking, setSpeaking] = useState<VoiceKey | null>(null);

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
        <Text style={s.q}>중개사가 어떻게 부르면 될까요?</Text>
        <Sub>성 한 글자만 적으셔도 돼요</Sub>
        <TextInput
          value={terms.name}
          onChangeText={(v) => set('name', v)}
          placeholder="예: 김"
          placeholderTextColor={color.textMuted}
          style={s.area}
          accessibilityLabel="중개사가 부를 이름을 넣어주세요. 비워두셔도 됩니다."
        />
      </Card>

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
        {/*
          주소를 한 글자도 안 틀리게 적는 것은 부담이 크다. 몇 글자만 치면
          비슷한 것을 눌러서 고를 수 있게 한다.
        */}
        {suggestAreas(terms.area).length > 0 && !NEAR_HIT(terms.area) ? (
          <View style={s.suggest}>
            {suggestAreas(terms.area).map((a) => (
              <Tag key={a} label={a} on={false} onPress={() => set('area', a)} />
            ))}
          </View>
        ) : null}
        <View style={s.actions}>
          <VoiceButton onPress={() => setSpeaking('area')} />
        </View>
      </Card>

      <Card>
        <Text style={s.q}>보증금은 얼마쯤 생각하세요?</Text>
        <View style={s.tagRow}>
          {DEPOSIT_BANDS.map((b) => (
            <Tag
              key={b.id}
              label={b.label}
              on={terms.deposit === b.id}
              onPress={() => set('deposit', terms.deposit === b.id ? null : b.id)}
            />
          ))}
        </View>
        <View style={s.actions}>
          <VoiceButton onPress={() => setSpeaking('deposit')} />
        </View>
      </Card>

      <Card>
        <Text style={s.q}>월세는요?</Text>
        <View style={s.tagRow}>
          {RENT_BANDS.map((b) => (
            <Tag
              key={b.id}
              label={b.label}
              on={terms.rent === b.id}
              onPress={() => set('rent', terms.rent === b.id ? null : b.id)}
            />
          ))}
        </View>
        <View style={s.actions}>
          <VoiceButton onPress={() => setSpeaking('rent')} />
        </View>
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
        <View style={s.actions}>
          <VoiceButton onPress={() => setSpeaking('rooms')} />
        </View>
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
        <View style={s.actions}>
          <VoiceButton onPress={() => setSpeaking('floor')} />
        </View>
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
        <View style={s.actions}>
          <VoiceButton onPress={() => setSpeaking('near')} />
        </View>
      </Card>

      {/* 말로 답하기. 탭을 대체하지 않고 나란히 둔다. */}
      {speaking ? (
        <VoiceAnswer
          visible
          title={VOICE_TITLE[speaking]}
          freeText={speaking === 'area'}
          choices={
            speaking === 'deposit'
              ? voiceChoicesFor(DEPOSIT_BANDS)
              : speaking === 'rent'
                ? voiceChoicesFor(RENT_BANDS)
                : speaking === 'rooms'
                  ? voiceChoicesFor([
                      { id: 'one', label: '한 개면 돼요' },
                      { id: 'two', label: '두 개 이상이면 좋겠어요' },
                    ])
                  : speaking === 'floor'
                    ? voiceChoicesFor([
                        { id: 'low', label: '낮은 층이 좋아요' },
                        { id: 'high', label: '높은 층이 좋아요' },
                        { id: 'any', label: '상관없어요' },
                      ])
                    : voiceChoicesFor(NEAR_OPTIONS)
          }
          onPick={(id) => {
            if (speaking === 'area') set('area', id);
            else if (speaking === 'deposit') set('deposit', id);
            else if (speaking === 'rent') set('rent', id);
            else if (speaking === 'rooms') set('rooms', id as GeneralTerms['rooms']);
            else if (speaking === 'floor') set('floorPref', id as GeneralTerms['floorPref']);
            else toggleNear(id);
          }}
          onClose={() => setSpeaking(null)}
        />
      ) : null}
    </Screen>
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

  actions: { marginTop: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.lg },

  suggest: { marginTop: space.md, flexDirection: 'row', flexWrap: 'wrap', gap: space.md },

  tagRow: { marginTop: space.lg, flexDirection: 'row', flexWrap: 'wrap', gap: TAP_GAP },
  // 구간 버튼은 자주, 많이 누른다. 칩 하한(56)보다 한 단계 크게 잡았다.
  tag: {
    minHeight: TAP_BIG,
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
