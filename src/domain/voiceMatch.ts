/**
 * 말한 내용을 선택지에 맞춰보는 엔진.
 *
 * 이 기능을 쓰는 분들은 발음이 또렷하지 않은 경우가 많다. 구음장애가 있으면
 * 음성 인식기가 "전동휠체어"를 "전동 힐체아"로 받아 적는다. 글자가 정확히 맞기를
 * 기대하면 아무것도 못 고른다. 그래서 세 겹으로 맞춘다.
 *
 *   1) 인식기가 돌려준 여러 후보(maxAlternatives)를 전부 본다
 *   2) 각 선택지의 여러 표현(키워드)과 대조한다
 *   3) 그래도 안 맞으면 자모 단위로 얼마나 닮았는지를 잰다
 *
 * 그리고 무슨 일이 있어도 앱이 대신 고르지 않는다. 후보를 제안하고 확인만 받는다.
 * 잘못 들은 채로 넘어가면 그 사람의 요청서가 통째로 틀어진다.
 */

export interface VoiceChoice {
  /** 선택지 id */
  id: string;
  /** 화면에 보이는 말 */
  label: string;
  /** 이렇게 말할 수도 있다는 표현들. label 은 자동으로 포함된다. */
  keywords?: string[];
}

export interface VoiceMatch {
  id: string;
  label: string;
  score: number;
}

export interface VoiceMatchResult {
  /** 점수가 높은 순. 비어 있을 수 있다. */
  ranked: VoiceMatch[];
  /**
   * 'confirm'   — 하나가 뚜렷하다. 이걸로 맞는지 물어본다.
   * 'choose'    — 둘이 비슷하다. 둘 중 어느 쪽인지 물어본다.
   * 'unclear'   — 못 알아들었다. 다시 말하거나 손으로 고르게 한다.
   */
  action: 'confirm' | 'choose' | 'unclear';
}

/* ── 한글 다루기 ───────────────────────────────────────────── */

const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
const JONG = ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ';

/** 띄어쓰기와 문장부호를 걷어낸다. 인식기는 띄어쓰기를 제멋대로 넣는다. */
export function normalize(text: string): string {
  return text.replace(/[\s.,!?~·'"()[\]]/g, '');
}

/**
 * 한글을 자모로 풀어헤친다.
 * '휠'과 '힐'은 글자로는 남남이지만 자모로 보면 ㅎ/ㅝ/ㄹ 과 ㅎ/ㅣ/ㄹ 로 두 칸만 다르다.
 * 발음이 흐려서 생긴 오인식을 이 수준에서 붙잡는다.
 */
export function toJamo(text: string): string {
  let out = '';
  for (const ch of normalize(text)) {
    const code = ch.charCodeAt(0) - 0xac00;
    if (code >= 0 && code <= 11171) {
      out += CHO[Math.floor(code / 588)];
      out += JUNG[Math.floor((code % 588) / 28)];
      const jong = JONG[code % 28];
      if (jong !== ' ') out += jong;
    } else {
      out += ch;
    }
  }
  return out;
}

/** 두 글자열이 얼마나 닮았는지 0~1 로 잰다 (편집거리 기반). */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return 1 - prev[b.length] / Math.max(a.length, b.length);
}

/* ── 맞춰보기 ──────────────────────────────────────────────── */

/** 이 점수를 넘어야 '들었다'고 본다. 낮추면 엉뚱한 걸 고르고 높이면 아무것도 못 고른다. */
export const ACCEPT = 0.62;
/** 1등과 2등이 이만큼 안에 붙어 있으면 둘 중 뭔지 되묻는다. */
export const AMBIGUOUS_GAP = 0.09;

function scoreOne(said: string, choice: VoiceChoice): number {
  /*
   * 숫자가 들어간 라벨은 맞춰보는 데 쓰지 않는다.
   *
   * '100~300만원'과 '300~500만원'은 숫자를 걷어내면 둘 다 '만원'만 남는다.
   * 그러면 "사백만원"이라고 말했을 때 모든 구간이 똑같이 들어맞는 것으로 나와
   * 앞에 있는 것이 뽑힌다. 구간을 가르는 것은 숫자인데 그 숫자를 못 읽으니
   * 라벨로는 판단할 수 없다. 이런 선택지는 미리 적어 둔 말버릇으로만 맞춘다.
   */
  const labelHasDigits = /\d/.test(choice.label);
  const words = labelHasDigits
    ? (choice.keywords ?? [])
    : [choice.label, ...(choice.keywords ?? [])];
  const saidN = normalize(said);
  const saidJ = toJamo(said);
  if (!saidN) return 0;

  let best = 0;
  for (const w of words) {
    const wN = normalize(w);
    if (!wN) continue;

    /*
     * 그대로 들어 있으면 확실하다 — 다만 길이가 비슷할 때만.
     *
     * '사백만원' 안에는 '백만원'이 들어 있다. 글자만 보면 100~300 구간에
     * 들어맞지만 실제로 말한 값은 400이다. 짧은 조각이 우연히 박혀 있는 것을
     * 확신으로 치면 앞 구간이 늘 이긴다. 짧은 쪽이 긴 쪽의 대부분을 차지할 때만
     * 확실한 것으로 본다. 나머지는 아래에서 닮은 정도로 따진다.
     */
    if (saidN.includes(wN) || wN.includes(saidN)) {
      const shorter = Math.min(saidN.length, wN.length);
      const longer = Math.max(saidN.length, wN.length);
      if (shorter / longer >= 0.8) {
        best = Math.max(best, 1);
        continue;
      }
    }

    // 자모로 풀어 닮은 정도를 본다
    const wJ = toJamo(w);
    best = Math.max(best, similarity(saidJ, wJ));

    // 긴 문장 안에 짧은 키워드가 묻혀 있을 수 있다.
    // 키워드 길이만큼 창을 밀어가며 가장 닮은 구간을 찾는다.
    if (wJ.length >= 4 && saidJ.length > wJ.length) {
      for (let i = 0; i + wJ.length <= saidJ.length; i++) {
        best = Math.max(best, similarity(saidJ.slice(i, i + wJ.length), wJ) * 0.97);
      }
    }
  }
  return best;
}

/**
 * 인식기가 돌려준 후보들을 선택지에 맞춰본다.
 *
 * @param alternatives 인식 후보. 앞쪽일수록 인식기가 확신하는 것이다.
 */
export function matchVoice(alternatives: string[], choices: VoiceChoice[]): VoiceMatchResult {
  const said = alternatives.map((t) => t.trim()).filter(Boolean);
  if (!said.length || !choices.length) return { ranked: [], action: 'unclear' };

  const ranked = choices
    .map((c) => {
      let best = 0;
      said.forEach((t, i) => {
        // 뒤 순위 후보는 조금 깎는다. 인식기가 덜 확신한 것이다.
        const penalty = 1 - Math.min(i, 4) * 0.03;
        best = Math.max(best, scoreOne(t, c) * penalty);
      });
      return { id: c.id, label: c.label, score: Number(best.toFixed(3)) };
    })
    .sort((a, b) => b.score - a.score);

  const [first, second] = ranked;
  if (!first || first.score < ACCEPT) return { ranked, action: 'unclear' };
  if (second && first.score - second.score < AMBIGUOUS_GAP) return { ranked, action: 'choose' };
  return { ranked, action: 'confirm' };
}

/**
 * 인식기에 미리 알려줄 말들.
 * 이 단어들이 나올 거라고 귀띔하면 또렷하지 않은 발음도 훨씬 잘 잡는다.
 */
export function biasingStrings(choices: VoiceChoice[]): string[] {
  const out = new Set<string>();
  for (const c of choices) {
    out.add(c.label);
    for (const k of c.keywords ?? []) out.add(k);
  }
  return [...out];
}
