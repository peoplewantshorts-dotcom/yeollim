import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Accent,
  AppBar,
  Card,
  H1,
  PickCard,
  PickList,
  PrimaryButton,
  Progress,
  Screen,
  SpeakLink,
} from '../../src/components/ui';
import { VoiceAnswer, VoiceButton } from '../../src/components/VoiceAnswer';
import {
  CONTACT_Q,
  deriveRequirements,
  MOBILITY_ECHO,
  voiceChoicesFor,
  WALK_AID_Q,
  WHEELCHAIR_Q,
  type ProfileQuestion,
} from '../../src/domain/questions';
import { emptyTerms, type ContactId, type MobilityId } from '../../src/domain/types';
import { useStore } from '../../src/store';

import { color, family, font, keepAll, space } from '../../src/theme';

/**
 * 선택지에 붙는 그림.
 *
 * '보행기'나 '목발' 같은 말은 아는 사람만 안다. 글자만 두면 모르는 분은 찍게 되고,
 * 찍은 답이 그대로 요청서에 실린다. 그래서 물건을 묻는 선택지에는 그림을 함께 둔다.
 */
const AID_IMAGE: Record<string, number> = {
  power: require('../../assets/aid-power.png'),
  manual: require('../../assets/aid-manual.jpg'),
  cane: require('../../assets/aid-cane.jpg'),
  crutch: require('../../assets/aid-crutch.jpg'),
  walker: require('../../assets/aid-walker.jpg'),
};
/**
 * 요청서 만들기.
 *
 * 묻는 것은 '쓰는 것'과 '편한 것' 둘뿐이다.
 *
 * 처음에는 장애 유형을 고르게 하고 "문턱이 있으면 걸리세요?" 같은 문항을 이어 붙였다.
 * 그건 아픈 사람에게 아프냐고 묻는 것과 같아서, 답이 이미 정해져 있거나
 * 본인이 객관적으로 판단할 수 없는 것을 떠넘기는 질문이었다.
 * 집이 갖춰야 할 조건은 문헌 근거대로 deriveRequirements 가 대신 붙인다.
 *
 * 장애 유형도 등급도 묻지 않는다. 등급은 2019년 폐지 이후 등록증에
 * '정도가 심한 장애인' 한 줄로만 표기돼 판정에 쓸 정보가 나오지 않고,
 * 묻는 행위 자체가 낙인이 된다.
 *
 * 시간 제한이 없고, 중간에 멈췄다가 다시 와도 답이 남는다.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const { profile, saveProfile } = useStore();

  // 저장된 프로필에서 화면 상태를 되살린다.
  const [wheelchair, setWheelchair] = useState<string | null>(() => {
    const m = profile?.mobility;
    if (m === 'power' || m === 'manual') return m;
    return m ? 'no' : null;
  });
  const [walkAid, setWalkAid] = useState<string | null>(() => {
    const m = profile?.mobility;
    return m === 'cane' || m === 'crutch' || m === 'walker' || m === 'none' ? m : null;
  });
  const [contact, setContact] = useState<string | null>(() => profile?.contact ?? null);

  // 지금 말로 답하는 중인 질문. null 이면 열려 있지 않다.
  const [speaking, setSpeaking] = useState<ProfileQuestion['id'] | null>(null);

  const needsWalkAid = wheelchair === 'no';

  const mobility: MobilityId | null = useMemo(() => {
    if (wheelchair === 'power' || wheelchair === 'manual') return wheelchair;
    if (wheelchair === 'no' && walkAid) return walkAid as MobilityId;
    return null;
  }, [wheelchair, walkAid]);

  const total = needsWalkAid ? 3 : 2;
  const done =
    (wheelchair ? 1 : 0) + (needsWalkAid && walkAid ? 1 : 0) + (contact ? 1 : 0);
  const complete = mobility !== null && contact !== null;

  const submit = () => {
    if (!mobility || !contact) return;
    saveProfile({
      mobility,
      contact: contact as ContactId,
      // 2단계에서 채운다. 이미 채워 둔 것이 있으면 그대로 둔다.
      terms: profile?.terms ?? emptyTerms(),
      requirements: deriveRequirements(mobility),
      updatedAt: new Date().toISOString(),
    });
    router.push('/user/terms');
  };

  const openVoice = (id: ProfileQuestion['id']) => setSpeaking(id);

  return (
    <Screen
      scrollHint="아래로 내리면서 하나씩 골라주세요"
      footer={
        <>
          <Progress done={done} total={total} />
          <View style={{ height: space.lg }} />
          <PrimaryButton label="다음으로" onPress={submit} disabled={!complete} />
        </>
      }
    >
      <AppBar title="요청서 만들기" />

      <H1>
        맞는 집을 찾으려고{'\n'}
        <Accent>두세 가지</Accent>만 여쭤볼게요
      </H1>
      <SpeakLink
        text="맞는 집을 찾으려고 두세 가지만 여쭤볼게요. 천천히 고르셔도 됩니다. 시간 제한은 없어요."
        label="질문을 소리로 들으실 수 있어요"
      />

      <Card>
        <Text style={s.qTitle}>{WHEELCHAIR_Q.title}</Text>
        <PickList label={WHEELCHAIR_Q.title}>
          {WHEELCHAIR_Q.choices.map((c) => (
            <PickCard
              key={c.id}
              label={c.label}
              image={AID_IMAGE[c.id]}
              selected={wheelchair === c.id}
              onPress={() => {
                setWheelchair(c.id);
                // 휠체어를 탄다고 바꾸면 앞서 고른 지팡이 답은 뜻이 없어진다.
                if (c.id !== 'no') setWalkAid(null);
              }}
              a11yLabel={`${WHEELCHAIR_Q.title} ${c.label}`}
            />
          ))}
        </PickList>
        <View style={s.actions}>
          <SpeakLink text={WHEELCHAIR_Q.title} label="들어보기" />
          <VoiceButton onPress={() => openVoice('wheelchair')} />
        </View>
      </Card>

      {needsWalkAid ? (
        <Card>
          <Text style={s.qTitle}>{WALK_AID_Q.title}</Text>
          <PickList label={WALK_AID_Q.title}>
            {WALK_AID_Q.choices.map((c) => (
              <PickCard
                key={c.id}
                label={c.label}
                image={AID_IMAGE[c.id]}
                selected={walkAid === c.id}
                onPress={() => setWalkAid(c.id)}
                a11yLabel={`${WALK_AID_Q.title} ${c.label}`}
              />
            ))}
          </PickList>
          <View style={s.actions}>
            <SpeakLink text={WALK_AID_Q.title} label="들어보기" />
            <VoiceButton onPress={() => openVoice('walkAid')} />
          </View>
        </Card>
      ) : null}

      <Card>
        <Text style={s.qTitle}>{CONTACT_Q.title}</Text>
        <PickList label={CONTACT_Q.title}>
          {CONTACT_Q.choices.map((c) => (
            <PickCard
              key={c.id}
              label={c.label}
              selected={contact === c.id}
              onPress={() => setContact(c.id)}
              a11yLabel={`${CONTACT_Q.title} ${c.label}`}
            />
          ))}
        </PickList>
        <View style={s.actions}>
          <SpeakLink text={CONTACT_Q.title} label="들어보기" />
          <VoiceButton onPress={() => openVoice('contact')} />
        </View>
      </Card>

      {mobility ? (
        <Text style={s.echo}>{MOBILITY_ECHO[mobility]}</Text>
      ) : null}

      {/* 말로 답하기. 탭을 대체하지 않고 나란히 둔다. */}
      {speaking ? (
        (() => {
          const q =
            speaking === 'wheelchair'
              ? WHEELCHAIR_Q
              : speaking === 'walkAid'
                ? WALK_AID_Q
                : CONTACT_Q;
          const pick = (id: string) => {
            if (speaking === 'wheelchair') {
              setWheelchair(id);
              if (id !== 'no') setWalkAid(null);
            } else if (speaking === 'walkAid') {
              setWalkAid(id);
            } else {
              setContact(id);
            }
          };
          return (
            <VoiceAnswer
              visible
              title={q.title}
              choices={voiceChoicesFor(q.choices)}
              onPick={pick}
              onClose={() => setSpeaking(null)}
            />
          );
        })()
      ) : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  actions: {
    marginTop: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    flexWrap: 'wrap',
  },
  qTitle: {
    fontSize: font.body,
    lineHeight: font.body * 1.4,
    fontFamily: family.bold,
    color: color.text,
  },
  echo: {
    ...keepAll,
    marginTop: space.xl,
    fontSize: font.caption + 1,
    color: color.textMuted,
    textAlign: 'center',
    fontFamily: family.semibold,
  },
});
