import { useCallback, useEffect, useRef, useState } from 'react';
import * as Speech from 'expo-speech';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { CLIPS } from './clips';
import { lineId } from './hash';
import { useStore, type VoiceSex } from '../store';

/**
 * 소리로 읽어주기.
 *
 * 기기에 깔린 음성합성(TTS)은 한국어를 사람처럼 읽지 못한다. 억양이 없고 끊는
 * 자리가 어색해서 오래 들으면 피로해진다. 우승팀 피드백에도 "개인이 선호하는
 * 목소리를 활용하면 안정감이 높아진다"는 말이 있었다.
 *
 * 그런데 이 앱이 읽어주는 문장은 대부분 미리 정해져 있다 — 질문, 선택지, 안내문.
 * 그래서 그 문장들은 **좋은 목소리로 미리 만들어 앱에 넣어 두고 그대로 튼다.**
 * 여자 목소리와 남자 목소리 두 벌이 들어 있고 설정에서 고를 수 있다.
 * 매물 이름이나 치수처럼 그때그때 달라지는 문장만 기기 음성합성으로 읽는다.
 *
 * 이렇게 하면
 *   - 사람이 읽은 것 같은 소리가 난다
 *   - 인터넷이 없어도 된다 (실증 현장에서 중요하다)
 *   - 누를 때마다 곧바로 나온다. 합성을 기다리지 않는다
 *   - 쓸 때마다 돈이 들지 않는다
 */

/* ── 기기 음성합성 (미리 만든 파일이 없을 때) ─────────────────── */

let chosenVoice: string | null | undefined;

async function pickSystemVoice(sex: VoiceSex): Promise<string | null> {
  if (chosenVoice !== undefined) return chosenVoice;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const ko = voices.filter((v) => (v.language ?? '').toLowerCase().startsWith('ko'));
    // 이름에 network 가 붙은 것이 안드로이드의 신경망 음성이다. 확연히 낫다.
    const network = ko.filter((v) => /network/i.test(v.identifier ?? ''));
    const pool = network.length ? network : ko;
    // 기기 음성은 성별 정보를 주지 않는 경우가 많다. 알 수 있으면 맞춰 고른다.
    const matched = pool.find((v) =>
      sex === 'male' ? /male|-x-(kod|ism)/i.test(v.identifier ?? '') : true,
    );
    chosenVoice = (matched ?? pool[0])?.identifier ?? null;
  } catch {
    chosenVoice = null;
  }
  return chosenVoice;
}

/* ── 미리 만든 파일 재생 ──────────────────────────────────── */

let player: AudioPlayer | null = null;

function releasePlayer() {
  if (!player) return;
  try {
    player.remove();
  } catch {
    // 이미 정리됐으면 그만이다
  }
  player = null;
}

/** 이 문장의 음성 파일이 앱 안에 있나? */
export function hasClip(text: string, sex: VoiceSex = 'female'): boolean {
  return CLIPS[sex][lineId(text)] !== undefined;
}

/* ── 쓰는 쪽 ─────────────────────────────────────────────── */

export function useSpeak() {
  const { voiceSex, voiceRate } = useStore();
  const [speaking, setSpeaking] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // 목소리를 바꾸면 다음에 고를 기기 음성도 다시 정한다
  useEffect(() => {
    chosenVoice = undefined;
  }, [voiceSex]);

  const done = useCallback(() => {
    if (alive.current) setSpeaking(false);
  }, []);

  const stop = useCallback(() => {
    Speech.stop();
    releasePlayer();
    done();
  }, [done]);

  /** 미리 만든 파일 하나를 끝까지 튼다. */
  const playClip = useCallback(
    (clip: number) =>
      new Promise<void>((resolve, reject) => {
        try {
          releasePlayer();
          player = createAudioPlayer(clip);
          player.addListener('playbackStatusUpdate', (st) => {
            if (st.didJustFinish) {
              releasePlayer();
              resolve();
            }
          });
          // 미리 만든 파일은 이미 조금 느리게 읽혀 있다. 설정은 그 위에 얹는다.
          if (voiceRate !== 1) player.setPlaybackRate(voiceRate);
          player.play();
        } catch (e) {
          releasePlayer();
          reject(e);
        }
      }),
    [voiceRate],
  );

  /** 기기 음성합성으로 한 문장을 읽는다. */
  const speakSystem = useCallback(
    async (text: string) =>
      new Promise<void>((resolve) => {
        pickSystemVoice(voiceSex).then((voice) => {
          Speech.speak(text, {
            language: 'ko-KR',
            ...(voice ? { voice } : null),
            rate: 0.94 * voiceRate,
            pitch: 1.0,
            onDone: () => resolve(),
            onStopped: () => resolve(),
            onError: () => resolve(),
          });
        });
      }),
    [voiceSex, voiceRate],
  );

  /**
   * 소리로 읽어준다.
   *
   * 여러 문장을 넘기면 문장마다 미리 만든 음성을 찾아 차례로 튼다.
   * 통째로 이어 붙인 긴 문장은 미리 만들어 둘 수 없어서 기기 음성으로 읽히는데,
   * 그러면 앞뒤가 사람 목소리인데 가운데만 기계 소리가 나서 오히려 더 어색하다.
   * 문장 단위로 쪼개 두면 대부분이 사람 목소리로 나온다.
   */
  const speak = useCallback(
    async (input: string | string[]) => {
      // 이미 말하는 중이면 멈춘다. 같은 버튼이 재생과 정지를 겸한다.
      if (player || (await Speech.isSpeakingAsync())) {
        stop();
        return;
      }

      const lines = (Array.isArray(input) ? input : [input])
        .map((t) => t.trim())
        .filter(Boolean);
      if (!lines.length) return;

      setSpeaking(true);
      for (const line of lines) {
        if (!alive.current) break;
        const clip = CLIPS[voiceSex][lineId(line)];
        if (clip !== undefined) {
          try {
            await playClip(clip);
            continue;
          } catch {
            // 파일 재생이 안 되면 조용히 기기 음성합성으로 넘어간다
          }
        }
        await speakSystem(line);
      }
      done();
    },
    [done, stop, voiceSex, playClip, speakSystem],
  );

  return { speak, speaking, stop };
}
