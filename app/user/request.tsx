import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Accent,
  AppBar,
  GhostButton,
  H1,
  NoteLine,
  NoteSheet,
  noteText,
  PrimaryButton,
  RULE,
  Screen,
  SpeakLink,
  Sub,
} from '../../src/components/ui';
import { CONTACT_SENTENCE, MOBILITY_SENTENCE, termLines } from '../../src/domain/questions';
import { useStore } from '../../src/store';
import { color, family, font, space } from '../../src/theme';

/**
 * 내 요청서.
 *
 * 프로필에서 도출된 조건을 종이 한 장으로 만든다. 이 종이가 중개사에게 그대로 가고,
 * 중개사 화면에서는 재야 할 항목으로 이어진다.
 *
 * 생김새를 노트로 잡은 것은 멋 때문이 아니다. 이건 앱이 뱉어낸 결과가 아니라
 * 당사자가 자기 조건을 적어 건네는 문서다. 화면처럼 보이면 '앱이 판단한 것'이 되고,
 * 종이처럼 보이면 '이 사람이 요청한 것'이 된다. 중개사가 받아 드는 태도가 달라진다.
 */
export default function RequestScreen() {
  const router = useRouter();
  const { profile, userName, sendRequest } = useStore();

  if (!profile) {
    return (
      <Screen>
        <AppBar title="내 요청서" />
        <H1>먼저 요청서를 만들어요</H1>
        <Sub>두세 가지만 고르면 요청서가 자동으로 만들어져요</Sub>
        <View style={{ height: space.xl }} />
        <PrimaryButton label="요청서 만들기" onPress={() => router.replace('/user/profile')} />
      </Screen>
    );
  }

  const musts = profile.requirements.filter((r) => r.priority === 'must' && r.cardText);
  const terms = termLines(profile.terms);

  const spoken = [
    `${userName} 님이 찾는 집.`,
    `${MOBILITY_SENTENCE[profile.mobility]}.`,
    `${CONTACT_SENTENCE[profile.contact]}.`,
    musts.length ? `꼭 필요한 것. ${musts.map((r) => r.cardText).join(', ')}.` : '',
    terms.length ? `이런 집이면 좋겠어요. ${terms.join(', ')}.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const send = () => {
    sendRequest();
    router.replace('/user/sent');
  };

  return (
    <Screen
      footer={
        <>
          <PrimaryButton label="부동산에 보내기" onPress={send} />
          <Text style={s.footNote}>보낸 뒤에는 전화 없이 문자로 이야기하실 수 있어요</Text>
        </>
      }
    >
      <AppBar title="내 요청서" />

      <H1>
        이대로 <Accent>보내면</Accent> 돼요
      </H1>
      <Sub>필요한 것만 뽑아서 정리했어요</Sub>

      <NoteSheet>
        <Text style={[noteText, s.title]}>{userName} 님이 찾는 집</Text>
        <Text style={noteText}>{MOBILITY_SENTENCE[profile.mobility]}</Text>

        {/* 전화가 어려운 분에게 전화를 걸면 그 자리에서 중개가 끊긴다. 밑줄로 세워 둔다. */}
        {profile.contact === 'text' ? (
          <Text style={[noteText, s.underline]}>전화가 어려워요. 문자로 연락 주세요</Text>
        ) : null}

        <Text style={[noteText, s.section]}>꼭 필요해요</Text>
        {musts.length > 0 ? (
          musts.map((r) => <NoteLine key={r.key} text={r.cardText} />)
        ) : (
          <Text style={noteText}>집 구조에서 꼭 필요한 조건은 없으세요</Text>
        )}

        {terms.length > 0 ? (
          <>
            <Text style={[noteText, s.section]}>이런 집이면 좋겠어요</Text>
            {terms.map((t) => (
              <NoteLine key={t} text={t} />
            ))}
          </>
        ) : null}

        <View style={{ height: RULE - 12 }} />
        <SpeakLink text={spoken} label="요청서를 소리로 들으실 수 있어요" />
      </NoteSheet>

      <GhostButton
        label="요청서 수정하기"
        onPress={() => router.push('/user/profile')}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  footNote: {
    marginTop: space.md,
    textAlign: 'center',
    fontSize: font.caption,
    color: color.textMuted,
    fontFamily: family.regular,
  },
  title: { fontSize: font.h2 + 2, fontFamily: family.extrabold, letterSpacing: -0.5 },
  underline: { textDecorationLine: 'underline', fontFamily: family.bold },
  section: { marginTop: RULE - 10, fontFamily: family.extrabold, color: color.primaryText },
});
