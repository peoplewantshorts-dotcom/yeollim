/**
 * 말한 것을 숫자로 바꾼다.
 *
 * 중개사에게 줄자를 들고 서서 화면의 작은 칸을 정확히 누르라고 하면 그 자리에서
 * 앱을 닫는다. 재면서 "구십이" 하고 말하면 들어가야 한다.
 *
 * 인식기는 같은 말을 여러 형태로 받아 적는다. "92", "구십이", "구십 이",
 * "구십이 센티" 가 전부 나온다. 셋 다 92 로 읽어야 한다.
 *
 * 못 알아들으면 null 을 돌려준다. 화면은 그것을 그대로 두고 다시 묻는다 —
 * 틀린 숫자를 채워 넣는 것보다 비워 두는 편이 낫다.
 */

/** 한자어 수 — 구십이, 백오십 */
const SINO: Record<string, number> = {
  영: 0,
  공: 0,
  일: 1,
  이: 2,
  삼: 3,
  사: 4,
  오: 5,
  육: 6,
  륙: 6,
  칠: 7,
  팔: 8,
  구: 9,
};

/** 고유어 수 — 한 칸, 세 칸. 계단을 셀 때 이렇게 말한다. */
const NATIVE: Record<string, number> = {
  한: 1,
  하나: 1,
  두: 2,
  둘: 2,
  세: 3,
  셋: 3,
  네: 4,
  넷: 4,
  다섯: 5,
  여섯: 6,
  일곱: 7,
  여덟: 8,
  아홉: 9,
  열: 10,
};

/** "구십이" 처럼 한자어로 이어 말한 것을 읽는다. */
function readSino(text: string): number | null {
  let total = 0;
  let current = 0;
  let read = false;

  for (const ch of text) {
    if (ch in SINO) {
      current = SINO[ch];
      read = true;
      continue;
    }
    if (ch === '십') {
      total += (current || 1) * 10;
      current = 0;
      read = true;
      continue;
    }
    if (ch === '백') {
      total += (current || 1) * 100;
      current = 0;
      read = true;
      continue;
    }
    if (ch === '천') {
      total += (current || 1) * 1000;
      current = 0;
      read = true;
      continue;
    }
    return null; // 숫자로 읽을 수 없는 글자가 섞였다
  }

  if (!read) return null;
  return total + current;
}

/**
 * 말한 것에서 숫자 하나를 뽑는다.
 *
 * 단위(센티·칸·층·만원)와 조사는 떼어 내고 본다. "없어요"는 0으로 읽는다 —
 * 문턱이나 계단을 물었을 때 가장 흔한 답이기 때문이다.
 */
export function parseKoreanNumber(said: string): number | null {
  const text = said.replace(/\s+/g, '');
  if (!text) return null;

  // 없다고 말한 것은 0이다. 이 앱에서 0과 '모름'은 전혀 다른 값이라
  // 말로 '없다'고 한 것만 0으로 받고, 아무 말도 못 알아들으면 비워 둔다.
  if (/없|제로|영이|평지|평평/.test(text)) return 0;

  // 숫자로 받아 적힌 경우가 가장 흔하다
  const digits = text.match(/\d+(?:\.\d+)?/);
  if (digits) return Number(digits[0]);

  // 고유어 — 한 칸, 세 칸
  for (const [word, n] of Object.entries(NATIVE)) {
    if (text.startsWith(word)) return n;
  }

  // 한자어 — 구십이, 백오십
  const stripped = text.replace(/센티미터|센티|센치|밀리|칸|개|층|만원|원|정도|쯤|요|입니다|이에요|예요|에요/g, '');
  return readSino(stripped);
}
