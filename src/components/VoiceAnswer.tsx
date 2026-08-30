import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import {
  ACCEPT,
  biasingStrings,
  matchVoice,
  type VoiceChoice,
  type VoiceMatch,
} from '../domain/voiceMatch';
import { GhostButton, PrimaryButton, useSteadyPress } from './ui';
import { color, family, font, HIT, radius, space, TAP_BIG } from '../theme';

/**
 * 말로 답하기.
 *
 * 손으로 버튼을 누르기 어려운 분을 위한 두 번째 경로다. 탭을 대체하는 것이 아니라
 * 나란히 둔다 — 어느 쪽이 편한지는 사람마다 다르고, 같은 사람도 날마다 다르다.
 *
 * 설계에서 물러서지 않는 두 가지
 *
 *  1. 앱이 대신 고르지 않는다.
 *     인식 결과를 그대로 저장하면 잘못 들은 채로 요청서가 통째로 틀어진다.
 *     항상 "이렇게 들었어요, 맞나요?"라고 묻고 확인을 받은 뒤에만 저장한다.
 *     (특강: 대신 결정하지 말고 선택지를 이해할 수 있게 지원할 것)
 *
 *  2. 못 알아들어도 사용자 탓으로 돌리지 않는다.
 *     구음장애가 있으면 인식률이 크게 떨어진다. 실패는 예외가 아니라 자주 있는 일이므로
 *     "다시 말하기"와 "손으로 고르기"를 실패 화면에 나란히 둔다.
 */

type Phase = 'listening' | 'confirm' | 'choose' | 'unclear' | 'blocked';

export function VoiceAnswer({
  title,
  choices,
  onPick,
  onClose,
  visible,
  freeText,
}: {
  /** 무엇을 묻는 중인지. 화면 위에 다시 보여준다. */
  title: string;
  choices: VoiceChoice[];
  onPick: (id: string) => void;
  onClose: () => void;
  visible: boolean;
  /**
   * 고르는 것이 아니라 받아쓰는 질문일 때 켠다. 동네 이름처럼 선택지를 미리
   * 만들 수 없는 답이 있다. 이때도 들은 것을 그대로 저장하지 않고 한 번 보여드리고
   * 확인을 받는다 — 잘못 들은 채로 요청서에 실리는 것을 막는 규칙은 똑같다.
   */
  freeText?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>('listening');
  const [heard, setHeard] = useState('');
  const [ranked, setRanked] = useState<VoiceMatch[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const running = useRef(false);

  const stop = useCallback(() => {
    if (!running.current) return;
    running.current = false;
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch {
      // 이미 멈춰 있으면 그만이다
    }
  }, []);

  const listen = useCallback(async () => {
    setHeard('');
    setRanked([]);
    setProblem(null);
    setPhase('listening');
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        setProblem('마이크를 쓸 수 있게 허용해 주셔야 말로 답할 수 있어요.');
        setPhase('blocked');
        return;
      }
      running.current = true;
      ExpoSpeechRecognitionModule.start({
        lang: 'ko-KR',
        interimResults: true,
        // 후보를 여러 개 받아 전부 맞춰본다. 1순위가 틀려도 3순위가 맞을 때가 있다.
        maxAlternatives: 5,
        // 어떤 말이 나올지 미리 귀띔한다. 발음이 흐려도 훨씬 잘 잡는다.
        contextualStrings: freeText ? [] : biasingStrings(choices),
        continuous: false,
      });
    } catch {
      setProblem('이 기기에서는 음성 인식을 쓸 수 없어요. 손으로 골라주세요.');
      setPhase('blocked');
    }
  }, [choices]);

  useEffect(() => {
    if (visible) listen();
    else stop();
    return stop;
  }, [visible, listen, stop]);

  useSpeechRecognitionEvent('result', (e) => {
    const alts = e.results.map((r) => r.transcript).filter(Boolean);
    if (alts[0]) setHeard(alts[0]);
    if (!e.isFinal) return;

    running.current = false;

    // 받아쓰기는 맞춰볼 후보가 없다. 들은 말을 그대로 보여드리고 확인만 받는다.
    if (freeText) {
      const said = alts[0]?.trim() ?? '';
      setRanked(said ? [{ id: said, label: said, score: 1 }] : []);
      setPhase(said ? 'confirm' : 'unclear');
      return;
    }

    const m = matchVoice(alts, choices);
    setRanked(m.ranked);
    setPhase(m.action === 'confirm' ? 'confirm' : m.action === 'choose' ? 'choose' : 'unclear');
  });

  useSpeechRecognitionEvent('error', (e) => {
    running.current = false;
    // 아무 말도 안 들린 것은 오류가 아니라 흔한 일이다. 같은 화면으로 안내한다.
    if (e.error === 'no-speech' || e.error === 'speech-timeout') {
      setPhase('unclear');
      return;
    }
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      setProblem('마이크를 쓸 수 있게 허용해 주셔야 말로 답할 수 있어요.');
      setPhase('blocked');
      return;
    }
    setProblem('소리를 듣는 데 문제가 생겼어요. 손으로 골라주셔도 돼요.');
    setPhase('blocked');
  });

  useSpeechRecognitionEvent('end', () => {
    running.current = false;
    // 결과 없이 끝났으면 못 알아들은 것이다
    setPhase((p) => (p === 'listening' ? 'unclear' : p));
  });

  const take = useSteadyPress((id: string) => {
    stop();
    onPick(id);
    onClose();
  });
  const retry = useSteadyPress(() => listen());
  const byHand = useSteadyPress(() => {
    stop();
    onClose();
  });

  const top = ranked[0];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={byHand}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <Text style={s.question} numberOfLines={2}>
            {title}
          </Text>

          {phase === 'listening' ? (
            <>
              <View style={s.micWrap}>
                <Text style={s.mic}>🎙️</Text>
              </View>
              <Text style={s.big}>듣고 있어요</Text>
              <Text style={s.calm}>
                조용한 곳에서 천천히 말씀해 주세요.{'\n'}
                한 마디만 하셔도 돼요.
              </Text>
              {heard ? <Text style={s.heard}>{heard}</Text> : null}
              <View style={s.gap} />
              <GhostButton label="그만할래요" onPress={byHand} />
            </>
          ) : null}

          {phase === 'confirm' && top ? (
            <>
              <Text style={s.calm}>이렇게 들었어요</Text>
              <View style={s.picked}>
                <Text style={s.pickedText}>{top.label}</Text>
              </View>
              <Text style={s.big}>이게 맞나요?</Text>
              {heard && heard !== top.label ? (
                <Text style={s.raw}>말씀하신 것: “{heard}”</Text>
              ) : null}
              <View style={s.gap} />
              <PrimaryButton label="네, 맞아요" onPress={() => take(top.id)} />
              <View style={s.gapSm} />
              <GhostButton label="아니에요, 다시 말할래요" onPress={retry} />
              <GhostButton label="손으로 고를래요" onPress={byHand} />
            </>
          ) : null}

          {phase === 'choose' ? (
            <>
              <Text style={s.big}>어느 쪽인가요?</Text>
              <Text style={s.calm}>비슷하게 들려서 확인이 필요해요</Text>
              {heard ? <Text style={s.raw}>말씀하신 것: “{heard}”</Text> : null}
              <View style={s.gap} />
              {ranked.slice(0, 2).map((r) => (
                <View key={r.id} style={s.gapSm}>
                  <PrimaryButton label={r.label} onPress={() => take(r.id)} />
                </View>
              ))}
              <GhostButton label="둘 다 아니에요, 다시 말할래요" onPress={retry} />
              <GhostButton label="손으로 고를래요" onPress={byHand} />
            </>
          ) : null}

          {phase === 'unclear' ? (
            <>
              <Text style={s.big}>잘 못 들었어요</Text>
              <Text style={s.calm}>
                제가 못 알아들은 거예요.{'\n'}
                조용한 곳에서 한 번만 더 말씀해 주시겠어요?
              </Text>
              {heard ? <Text style={s.raw}>이렇게 들렸어요: “{heard}”</Text> : null}
              <View style={s.gap} />
              <PrimaryButton label="다시 말할래요" onPress={retry} />
              <View style={s.gapSm} />
              <GhostButton label="손으로 고를래요" onPress={byHand} />
            </>
          ) : null}

          {phase === 'blocked' ? (
            <>
              <Text style={s.big}>말로 답하기를 쓸 수 없어요</Text>
              <Text style={s.calm}>{problem}</Text>
              <View style={s.gap} />
              <PrimaryButton label="손으로 고를래요" onPress={byHand} />
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

/**
 * 질문 카드에 붙는 말하기 버튼.
 *
 * 고르는 질문에서는 '말로 선택하기', 적어 넣는 칸에서는 '말로 넣기'로 부른다.
 * 무엇을 하는 버튼인지가 이름에 그대로 들어가야 한 번에 알아본다.
 */
export function VoiceButton({
  onPress,
  label = '말로 선택하기',
}: {
  onPress: () => void;
  label?: string;
}) {
  const press = useSteadyPress(onPress);
  return (
    <Pressable
      onPress={press}
      hitSlop={8}
      style={({ pressed }) => [s.trigger, pressed && s.triggerPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${label}. 버튼을 누르기 어려우시면 말로 하실 수 있어요.`}
    >
      <View style={s.triggerBadge}>
        <Text style={s.triggerGlyph}>🎙️</Text>
      </View>
      <Text style={s.triggerText}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(18,16,30,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.sheet + 6,
    borderTopRightRadius: radius.sheet + 6,
    paddingHorizontal: space.xxl,
    paddingTop: space.xxl,
    paddingBottom: space.xxxl,
  },

  question: {
    fontSize: font.caption + 1,
    lineHeight: (font.caption + 1) * 1.4,
    color: color.textMuted,
    fontFamily: family.semibold,
    marginBottom: space.xl,
  },

  micWrap: {
    alignSelf: 'center',
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: color.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.lg,
  },
  mic: { fontSize: 38 },

  big: {
    fontSize: font.h1 - 2,
    lineHeight: (font.h1 - 2) * 1.35,
    fontFamily: family.extrabold,
    color: color.text,
    letterSpacing: -0.5,
  },
  calm: {
    marginTop: space.md,
    fontSize: font.label,
    lineHeight: font.label * 1.55,
    color: color.textMuted,
    fontFamily: family.regular,
  },
  heard: {
    marginTop: space.xl,
    fontSize: font.body,
    lineHeight: font.body * 1.4,
    color: color.primaryText,
    fontFamily: family.semibold,
  },
  raw: {
    marginTop: space.md,
    fontSize: font.caption,
    color: color.textMuted,
    fontFamily: family.regular,
  },

  picked: {
    alignSelf: 'flex-start',
    marginTop: space.md,
    marginBottom: space.lg,
    backgroundColor: color.primarySoft,
    borderRadius: radius.chip,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
  },
  pickedText: {
    fontSize: font.h2,
    color: color.onPrimarySoft,
    fontFamily: family.extrabold,
  },

  gap: { height: space.xxl },
  gapSm: { marginTop: space.md },

  // '소리로 듣기'와 같은 크기·같은 생김새로 맞춘다. 둘은 한 짝이다.
  trigger: {
    minHeight: TAP_BIG,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.md,
    paddingLeft: space.sm,
    paddingRight: space.xl,
    borderRadius: radius.chip,
    borderWidth: 2,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
  },
  triggerPressed: { backgroundColor: color.primarySoft, borderColor: color.primary },
  triggerBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: color.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerGlyph: { fontSize: 22 },
  triggerText: { fontSize: font.label, color: color.primaryText, fontFamily: family.bold },
});

void ACCEPT;
