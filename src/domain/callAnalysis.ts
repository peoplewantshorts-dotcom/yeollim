import type { CallExtraction, FactKey, PropertyFacts } from './types';

/**
 * 통화 내용에서 접근성 답변을 뽑아낸다.
 *
 * 원칙 — 틀린 정보를 채우지 않는다.
 *  - 확신도가 기준(0.7) 아래면 값을 비우고 '확인 필요'로 남긴다.
 *  - 어떤 항목이든 판단 근거가 된 발화와 시각을 함께 돌려준다. 중개사가 즉시 검수한다.
 *  - 임대인이 모른다고 답한 것은 '없음'이 아니라 '모름'이다. 둘을 절대 섞지 않는다.
 *
 * 지금은 규칙 기반 추출이며, LLM으로 교체할 때도 이 반환 형태와
 * '확신 없으면 비운다'는 계약은 그대로 유지한다.
 */

type Turn = { at: number; who: string; text: string };

interface Probe {
  key: FactKey;
  label: string;
  /** 이 항목을 묻는 질문인지 판별 */
  asked: RegExp;
  /** 부정 = 장벽 없음 */
  negative: RegExp;
  /** 긍정 = 장벽 있음 */
  positive: RegExp;
  /** true 로 기록되는 쪽. outStep 은 '없음'이 좋은 값이다. */
  negativeMeans: boolean;
  /** 화면에 찍을 말. value=true 일 때 / false 일 때 */
  passLabel: string;
  failLabel: string;
}

const UNKNOWN = /모르|글쎄|재본 적|확인해\s*볼|안 재|잘 몰라|기억이 안/;

const PROBES: Probe[] = [
  {
    key: 'outStep',
    label: '중앙현관 앞',
    asked: /중앙현관\s*앞|입구.*계단|경사로/,
    negative: /계단(은|이)?\s*없|평지|턱\s*없|바로\s*들어|경사로.*있/,
    positive: /계단(이|은)?\s*(있|한|두|세|네|다섯|\d)/,
    negativeMeans: true,
    passLabel: '계단 없음',
    failLabel: '계단 있음',
  },
  {
    key: 'inStep',
    label: '중앙현관 안 반계단',
    asked: /반계단|들어가서|1층\s*집|현관\s*들어/,
    negative: /반계단\s*없|계단\s*없|바로\s*(집|들어)|평평/,
    positive: /반계단.*(있|올라|한|두|세|네|다섯|\d)|올라갑|올라가야/,
    negativeMeans: true,
    passLabel: '계단 없음',
    failLabel: '계단 있음',
  },
  {
    key: 'bathroomSill',
    label: '화장실 문턱',
    asked: /화장실|욕실/,
    negative: /턱\s*없|문턱\s*없|평평|없습니다|없어요/,
    positive: /턱(이|은)?\s*(있|좀|조금|\d)/,
    negativeMeans: true,
    passLabel: '없음',
    failLabel: '있음',
  },
  {
    key: 'doorWidth',
    label: '현관문 폭',
    asked: /문\s*폭|현관문|폭이|넓이/,
    negative: /넘(어|습니다|어요)|충분|넓/,
    positive: /좁|안\s*넘|미만/,
    negativeMeans: true,
    passLabel: '넘음',
    failLabel: '좁음',
  },
];

/** "3센치", "3cm", "80센티" 같은 표현에서 수치를 뽑는다. */
function numberInCm(text: string): number | null {
  const m = text.match(/(\d+(?:\.\d+)?)\s*(?:cm|센치|센티|센티미터)/i);
  return m ? Number(m[1]) : null;
}

const KOREAN_COUNT: Record<string, number> = {
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
};

/** "세 칸", "3칸", "다섯 개" 같은 표현에서 계단 수를 뽑는다. */
function stepCount(text: string): number | null {
  const digit = text.match(/(\d+)\s*(?:칸|개|계단)/);
  if (digit) return Number(digit[1]);
  const korean = text.match(/(한|하나|두|둘|세|셋|네|넷|다섯|여섯)\s*(?:칸|개)/);
  if (korean) return KOREAN_COUNT[korean[1]] ?? null;
  return null;
}

export function analyzeTranscript(turns: Turn[]): CallExtraction[] {
  const out: CallExtraction[] = [];

  for (const probe of PROBES) {
    // 중개사가 그 항목을 물은 지점을 찾고, 그 뒤 임대인의 첫 답을 본다.
    const qIndex = turns.findIndex((t) => t.who === '중개사' && probe.asked.test(t.text));
    if (qIndex === -1) {
      out.push({
        key: probe.key,
        label: probe.label,
        value: null,
        stateLabel: null,
        quote: null,
        atSecond: null,
        confidence: 0,
      });
      continue;
    }
    const answer = turns.slice(qIndex + 1).find((t) => t.who !== '중개사');
    if (!answer) {
      out.push({
        key: probe.key,
        label: probe.label,
        value: null,
        stateLabel: null,
        quote: null,
        atSecond: null,
        confidence: 0,
      });
      continue;
    }

    // 임대인이 모른다고 했으면 절대 채우지 않는다.
    if (UNKNOWN.test(answer.text)) {
      out.push({
        key: probe.key,
        label: probe.label,
        value: null,
        stateLabel: null,
        quote: answer.text,
        atSecond: answer.at,
        confidence: 0.2,
      });
      continue;
    }

    const neg = probe.negative.test(answer.text);
    const pos = probe.positive.test(answer.text);

    // 긍정·부정 신호가 함께 잡히면 애매한 것이다. 비워 둔다.
    if (neg === pos) {
      out.push({
        key: probe.key,
        label: probe.label,
        value: null,
        stateLabel: null,
        quote: answer.text,
        atSecond: answer.at,
        confidence: 0.4,
      });
      continue;
    }

    const value = neg ? probe.negativeMeans : !probe.negativeMeans;
    out.push({
      key: probe.key,
      label: probe.label,
      value,
      stateLabel: value ? probe.passLabel : probe.failLabel,
      quote: answer.text,
      atSecond: answer.at,
      confidence: 0.86,
    });
  }

  return out;
}

/** 확신도가 기준을 넘은 항목만 매물 데이터에 반영한다. */
export const CONFIDENCE_FLOOR = 0.7;

export function applyExtractions(
  facts: PropertyFacts,
  extractions: CallExtraction[],
  transcript: Turn[],
): PropertyFacts {
  const next = { ...facts };
  for (const e of extractions) {
    if (e.value === null || e.confidence < CONFIDENCE_FLOOR) continue;
    const quote = e.quote ?? '';
    switch (e.key) {
      case 'outStep':
        // '있음'이라고만 답하면 몇 칸인지 모른다. 판정이 헐겁게 통과하지 않도록 1칸으로 둔다.
        next.outStepCount = e.value ? 0 : (stepCount(quote) ?? 1);
        if (e.value) next.outRamp = next.outRamp ?? false;
        break;
      case 'inStep':
        next.inStepCount = e.value ? 0 : (stepCount(quote) ?? 1);
        break;
      case 'bathroomSill':
        next.bathroomSillCm = e.value ? 0 : (numberInCm(quote) ?? 5);
        break;
      case 'doorWidth': {
        const cm = numberInCm(quote);
        next.doorWidthCm = cm ?? (e.value ? 90 : null);
        break;
      }
      default:
        break;
    }
  }
  void transcript;
  return next;
}

/** 초를 02:14 꼴로 */
export function mmss(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
