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
import { color, family, font, keepAll, space } from '../../src/theme';

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
  const { profile, sendRequest } = useStore();

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
  /*
   * 이름을 받지 않는다.
   *
   * 이름은 개인정보라 받는 순간 동의·보관·파기 절차가 따라붙는데, 우리가 이름으로
   * 하는 일은 요청서를 구분하는 것뿐이다. 그건 날짜로 충분하다.
   */
  const title = '제가 찾는 집';

  const spoken = [
    `${title}.`,
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
        <Text style={[noteText, s.title]}>{title}</Text>
        <Text style={noteText}>{MOBILITY_SENTENCE[profile.mobility]}</Text>

        {/* 전화가 어려운 분에게 전화를 걸면 그 자리에서 중개가 끊긴다. 밑줄로 세워 둔다. */}
        {profile.contact === 'text' ? (
          <NoteLine text="전화가 어려워요. 문자로 연락 주세요" highlight />
        ) : null}

        <Text style={[noteText, s.section]}>꼭 필요해요</Text>
        {musts.length > 0 ? (
          musts.map((r) => <NoteLine key={r.key} text={r.cardText} highlight />)
        ) : (
          <Text style={noteText}>집 구조에서 꼭 필요한 조건은 없으세요</Text>
        )}

        {terms.length > 0 ? (
          <>
            <Text style={[noteText, s.section]}>이런 집이면 좋겠어요</Text>
            {terms.map((t) => (
              <NoteLine key={t} text={t} mark="·" />
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
    fontSize: font.label,
    lineHeight: font.label * 1.5,
    color: color.textSub,
    fontFamily: family.regular,
    ...keepAll,
  },
  title: { fontSize: font.display, fontFamily: family.extrabold, letterSpacing: -0.6 },

  /*
   * 종이 위에서 세 가지를 서로 다른 방법으로 구분한다.
   * 제목은 크기로, 구획은 밑줄로, 꼭 봐야 할 한 줄은 형광펜으로.
   * 전부 색으로만 나누면 색이 비슷해 눈이 어디를 봐야 할지 못 찾는다.
   */
  /*
   * 형광펜.
   *
   * 노란색을 썼더니 이 줄만 앱에서 떨어져 나와 보였다. 강조는 눈에 띄어야 하는 것이지
   * 다른 데서 온 것처럼 보여야 하는 것이 아니다. 같은 보라 계열에서 가장 연한 값으로
   * 칠하고, 대신 글자를 굵게 해 강조를 만든다.
   *
   * 한 줄로 두면 '전화가 어려워요. 문자로' 에서 끊겨 읽기가 나빠서 두 줄로 나눴다.
   */
  section: {
    marginTop: RULE - 10,
    fontFamily: family.extrabold,
    color: color.paperInk,
    textDecorationLine: 'underline',
  },
});
