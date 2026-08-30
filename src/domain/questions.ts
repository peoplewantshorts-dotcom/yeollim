import type { VoiceChoice } from './voiceMatch';
import type { ContactId, GeneralTerms, MobilityId, Requirement } from './types';

/**
 * 프로필 문항.
 *
 * 설계 원칙 — 사용자에게는 '본인이 확실히 아는 사실'만 묻는다.
 *
 * 처음에는 "문턱이 있으면 걸리세요?" "미끄러우면 위험하세요?" 처럼
 * 결과를 되물었다. 그건 아픈 사람에게 아프냐고 묻는 것과 같아서
 * 답이 정해져 있거나 본인이 객관적으로 판단할 수 없다.
 *
 * 그래서 묻는 것을 '쓰는 것'과 '편한 것' 둘로만 좁혔다.
 * 집이 갖춰야 할 조건은 아래 deriveRequirements 가 문헌 근거대로 자동으로 붙인다.
 * 이 구조는 Housing Enabler(Iwarsson 1999)와 같다 — ① 기능 평가 ② 환경 평가
 * ③ 둘의 대조는 미리 정해진 규칙이 하고, 당사자에게 되묻지 않는다.
 */

export interface Choice {
  id: string;
  /** 화면에 보이는 말 */
  label: string;
}

/**
 * 선택지에 붙는 그림은 화면 쪽에서 붙인다.
 * 도메인이 자산 파일을 들고 있으면 판정 규칙만 따로 떼어 시험할 수 없다.
 */

export interface ProfileQuestion {
  id: 'mobility' | 'contact';
  title: string;
  /** 제목 아래 작은 글씨 */
  hint?: string;
  choices: Choice[];
}

/**
 * 이동 방법.
 *
 * 처음에는 휠체어를 먼저 묻고 '타지 않아요'를 고른 분에게만 지팡이·목발을
 * 보여줬다. 화면은 짧아지지만 누르기 전에는 뒤에 뭐가 있는지 알 수 없고,
 * 지팡이를 쓰는 분이 '타지 않아요'를 한 번 더 눌러야 했다.
 * 여섯 개를 한 화면에 펼쳐 두면 자기 것을 바로 찾는다.
 */
export const MOBILITY_Q: ProfileQuestion = {
  id: 'mobility',
  title: '이 중에 사용하시는 것이 있으세요?',
  choices: [
    { id: 'power', label: '전동휠체어를 타요' },
    { id: 'manual', label: '수동휠체어를 타요' },
    { id: 'cane', label: '지팡이를 사용해요' },
    { id: 'crutch', label: '목발을 사용해요' },
    { id: 'walker', label: '보행기를 사용해요' },
    { id: 'none', label: '아무것도 사용하지 않아요' },
  ],
};

export const CONTACT_Q: ProfileQuestion = {
  id: 'contact',
  title: '중개사와 어떻게 연락하는 게 편하세요?',
  choices: [
    { id: 'text', label: '글로 받는 게 편해요' },
    { id: 'phone', label: '전화통화도 괜찮아요' },
  ],
};

export const MOBILITY_LABEL: Record<MobilityId, string> = {
  power: '전동휠체어',
  manual: '수동휠체어',
  cane: '지팡이',
  crutch: '목발',
  walker: '보행기',
  none: '보조기구 없이',
};

/** 요청서 머리말에 그대로 들어가는 문장 */
export const MOBILITY_SENTENCE: Record<MobilityId, string> = {
  power: '전동휠체어를 타고 다닙니다',
  manual: '수동휠체어를 타고 다닙니다',
  cane: '지팡이를 짚고 다닙니다',
  crutch: '목발을 짚고 다닙니다',
  walker: '보행기를 밀고 다닙니다',
  none: '보조기구 없이 걸어 다닙니다',
};

/**
 * 프로필 화면 맨 아래에서 고른 것을 되짚어 주는 한 줄.
 *
 * 처음에는 고른 보조기구를 그대로 되읽어 줬는데('지팡이에 맞춰 찾아드릴게요'),
 * 화면에 방금 고른 것이 이미 보이는데 또 말하는 셈이었다. 그보다는 이 답으로
 * 무엇을 해드릴 것인지를 말하는 편이 낫다.
 */
export const MOBILITY_ECHO = '본인에게 적합한 집을 찾아드릴게요';

export const CONTACT_SENTENCE: Record<ContactId, string> = {
  text: '전화가 어려우십니다. 문자로 연락 주세요',
  phone: '전화통화도 괜찮습니다',
};

const WHEELED: MobilityId[] = ['power', 'manual'];
const WALKING_AID: MobilityId[] = ['cane', 'crutch', 'walker'];

const req = (
  key: Requirement['key'],
  threshold: number | null,
  cardText: string,
  emphasis: string,
): Requirement => ({ key, threshold, priority: 'must', cardText, emphasis });

/**
 * 이동 방법에서 집이 갖춰야 할 조건을 도출한다.
 *
 * 근거
 *  - 문 폭 90cm : 장애물 없는 생활환경(BF) 인증심사기준 「출입구 유효폭 0.9m 이상」
 *  - 문턱 0cm   : BF 「출입구 바닥에 문턱이나 단차가 없을 것」
 *  - 문턱 2.5cm : 무장애 주택설계에 관한 국내외 국가표준의 비교 연구 「2~2.5cm 이하」
 *  - 화장실 문 80cm : 같은 연구의 「출입문 폭 0.8~0.95m」 가운데 낮은 값.
 *                     현관문에 BF 기준 0.9m 를 적용하면서 실내문까지 같은 값을 요구하면
 *                     남는 매물이 없다. 휠체어가 실제로 지나갈 수 있는 하한으로 잡았다.
 *  - 계단 두 곳 : 중개 실무. 승강기가 있어도 중앙현관 안쪽 반계단이 막으면 못 들어간다.
 *                 그래서 ①현관 앞과 ②현관 안을 따로 확인한다.
 */
export function deriveRequirements(mobility: MobilityId): Requirement[] {
  if (WHEELED.includes(mobility)) {
    return [
      req('doorWidth', 90, '현관문 폭 90cm 이상', '90cm 이상'),
      req('outStep', 0, '중앙현관 앞에 계단 없음', '계단 없음'),
      req('inStep', 0, '중앙현관 안에 계단 없음', '계단 없음'),
      req('bathroomSill', 0, '화장실 문턱 없음', '문턱 없음'),
      req('bathroomDoor', 80, '화장실 문 폭 80cm 이상', '80cm 이상'),
      req('elevator', null, '2층 이상이면 승강기', '승강기'),
    ];
  }
  if (WALKING_AID.includes(mobility)) {
    return [
      req('outStep', 3, '중앙현관 앞 계단 3칸까지', '3칸까지'),
      req('inStep', 3, '중앙현관 안 계단 3칸까지', '3칸까지'),
      req('bathroomSill', 2.5, '화장실 문턱 2.5cm 이하', '2.5cm 이하'),
    ];
  }
  return [];
}

/**
 * 보증금 구간.
 *
 * 말로 고를 때 구간 경계에 걸치는 금액(예: 삼백만원)은 어느 쪽인지 알 수 없다.
 * 그때는 한쪽으로 찍지 않고 되묻는다.
 *
 * 원룸 시세에 맞춰 아래쪽을 촘촘하게, 위쪽을 넓게 잡았다.
 * 숫자를 직접 적게 하면 손이 떨리는 분과 숫자에 어려움이 있는 분이 먼저 막힌다.
 */
export const DEPOSIT_BANDS: { id: string; label: string }[] = [
  { id: 'd0', label: '없어요' },
  { id: 'd100', label: '100~300만원' },
  { id: 'd300', label: '300~500만원' },
  { id: 'd500', label: '500~1000만원' },
  { id: 'd1000', label: '1000~2000만원' },
  { id: 'd2000', label: '2000만원 넘어도 돼요' },
];

/** 월세 구간 */
export const RENT_BANDS: { id: string; label: string }[] = [
  { id: 'r0', label: '없어요 (전세)' },
  { id: 'r20', label: '20만원 아래' },
  { id: 'r2030', label: '20~30만원' },
  { id: 'r3040', label: '30~40만원' },
  { id: 'r4050', label: '40~50만원' },
  { id: 'r50', label: '50만원 넘어도 돼요' },
];

const BAND_LABEL: Record<string, string> = Object.fromEntries(
  [...DEPOSIT_BANDS, ...RENT_BANDS].map((b) => [b.id, b.label]),
);

/** 구간이 실제로 가리키는 값의 범위 (만원). 말한 금액을 구간에 맞출 때 쓴다. */
const BAND_RANGE: Record<string, [number, number]> = {
  d0: [0, 0],
  d100: [100, 300],
  d300: [300, 500],
  d500: [500, 1000],
  d1000: [1000, 2000],
  d2000: [2000, Number.POSITIVE_INFINITY],
  r0: [0, 0],
  r20: [0, 20],
  r2030: [20, 30],
  r3040: [30, 40],
  r4050: [40, 50],
  r50: [50, Number.POSITIVE_INFINITY],
};

/**
 * 말한 금액 범위에 걸치는 구간을 전부 돌려준다.
 *
 * "100만 원에서 500만 원 사이"라고 하면 100~300 과 300~500 이 함께 켜져야 한다.
 * 한 값만 말했는데 그 값이 두 구간의 경계면(예: 300만원) 역시 둘 다 켠다 —
 * 어느 쪽인지 우리가 정할 일이 아니고, 둘 다 보겠다는 뜻으로 받는 편이 맞다.
 */
export function bandsInRange(
  bands: { id: string }[],
  range: { min: number; max: number },
): string[] {
  return bands
    .filter(({ id }) => {
      const r = BAND_RANGE[id];
      if (!r) return false;
      const [lo, hi] = r;
      // 값 하나만 말한 경우에는 그 값을 품는 구간
      if (range.min === range.max) return lo <= range.min && range.min <= hi;
      // 범위로 말한 경우에는 겹치는 구간
      return lo < range.max && hi > range.min;
    })
    .map((b) => b.id);
}

/**
 * 동네 이름 추천 목록.
 *
 * 주소를 한 글자도 안 틀리게 적는 것은 부담이 크다. 몇 글자만 치면 비슷한 것을
 * 골라 누를 수 있게 한다.
 *
 * 지금은 실증 지역(익산)을 손으로 적어 둔 목록이다. 도로명주소 API(juso.go.kr)로
 * 바꾸려면 아래 suggestAreas 안쪽만 갈아 끼우면 되고, 화면은 손대지 않아도 된다.
 * 목록이 비어 있어도 직접 적어 넣을 수 있으므로 이 기능이 없다고 막히지는 않는다.
 */
export const AREA_SUGGESTIONS: string[] = [];

/** 몇 글자만 쳐도 비슷한 것을 골라 준다. 없으면 빈 목록이고 직접 적으면 된다. */
export function suggestAreas(query: string, limit = 3): string[] {
  const q = query.replace(/\s+/g, '');
  if (q.length < 1) return [];
  return AREA_SUGGESTIONS.filter((a) => a.replace(/\s+/g, '').includes(q)).slice(0, limit);
}

/** 방 개수 */
export const ROOM_OPTIONS: { id: string; label: string }[] = [
  { id: 'one', label: '원룸' },
  { id: 'two', label: '방 두 개' },
  { id: 'three', label: '방 세 개 이상' },
];

/** 층 */
export const FLOOR_OPTIONS: { id: string; label: string }[] = [
  { id: 'low', label: '낮은 층' },
  { id: 'high', label: '높은 층' },
  { id: 'any', label: '상관없어요' },
];

/** 걸어서 갈 수 있으면 좋은 곳 */
export const NEAR_OPTIONS: { id: string; label: string }[] = [
  { id: 'stop', label: '버스나 지하철 정류장' },
  { id: 'store', label: '편의점이나 마트' },
  { id: 'hospital', label: '병원' },
];

const NEAR_LABEL: Record<string, string> = Object.fromEntries(
  NEAR_OPTIONS.map((o) => [o.id, o.label]),
);

/**
 * 일반 조건을 요청서에 실을 문장으로 바꾼다.
 *
 * 비워 둔 항목은 줄 자체를 만들지 않는다. '보증금 미정' 같은 줄을 넣으면
 * 중개사가 읽어야 할 줄만 늘고 얻는 정보는 없다.
 */
export function termLines(t: GeneralTerms | undefined | null): string[] {
  // 예전 구조로 저장된 값이 넘어오면 이 항목이 아예 없다. 화면이 죽는 것보다
  // 일반 조건 줄이 비는 편이 낫다.
  if (!t) return [];
  const out: string[] = [];
  if (t.area.trim()) out.push(`${t.area.trim()}에서 찾고 있어요`);
  const band = (ids: string[]) => ids.map((id) => BAND_LABEL[id] ?? id).join(', ');
  const money = [
    t.deposit?.length ? `보증금 ${band(t.deposit)}` : '',
    t.rent?.length ? `월세 ${band(t.rent)}` : '',
  ].filter(Boolean);
  if (money.length) out.push(money.join(' · '));
  if (t.rooms === 'one') out.push('원룸이면 돼요');
  if (t.rooms === 'two') out.push('방 두 개면 좋겠어요');
  if (t.rooms === 'three') out.push('방 세 개 이상이면 좋겠어요');
  if (t.floorPref === 'low') out.push('낮은 층이 좋아요');
  if (t.floorPref === 'high') out.push('높은 층이 좋아요');
  if (t.near.length) {
    out.push(`걸어서 갈 수 있으면 좋은 곳 — ${t.near.map((id) => NEAR_LABEL[id] ?? id).join(', ')}`);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * 말로 답할 때 쓰는 어휘
 *
 * 화면에 적힌 말 그대로 또박또박 말하는 사람은 없다. "전동휠체어를 타요"라고
 * 쓰여 있어도 실제로는 "전동", "전동차", "휠체어 타요"라고 한다.
 * 게다가 구음장애가 있으면 인식기가 받아 적은 글자부터 흔들린다.
 *
 * 그래서 선택지마다 그 사람이 실제로 할 법한 말을 여러 개 적어 둔다.
 * 이 목록은 맞춰보는 데도 쓰이고, 인식기에 미리 귀띔하는 데도 쓰인다.
 * ------------------------------------------------------------------ */
const VOICE_WORDS: Record<string, string[]> = {
  // '휠체어 타요'는 전동인지 수동인지 알 수 없다. 양쪽에 함께 두어
  // 한쪽으로 단정하지 않고 어느 쪽인지 되묻게 한다.
  power: ['전동', '전동 휠체어', '전동차', '휠체어 타요'],
  manual: ['수동', '수동 휠체어', '손으로 미는 휠체어', '휠체어 타요'],

  cane: ['지팡이', '지팡이 짚어요', '단장', '지팡이 써요'],
  crutch: ['목발', '목발 짚어요', '크러치'],
  walker: ['보행기', '워커', '보행 보조기', '밀고 다녀요'],
  none: ['아무것도 안 써요', '안 써요', '그냥 걸어요', '아니요'],

  text: ['글로', '문자로', '글이 편해요', '문자가 편해요', '전화 말고'],
  phone: ['전화', '전화도 괜찮아요', '통화', '전화 괜찮아요'],

  // 보증금
  // 구간 경계에 걸치는 말은 한쪽에만 둔다. 양쪽에 다 넣으면 어느 쪽인지
  // 못 가려서 늘 되묻게 된다.
  d0: ['없어요', '보증금 없어요', '무보증'],
  d100: ['백만원', '이백만원'],
  d300: ['삼백만원', '사백만원'],
  d500: ['오백만원', '육백만원', '칠백만원', '팔백만원', '구백만원'],
  d1000: ['천만원', '천오백만원'],
  d2000: ['이천만원', '이천만원 이상', '더 돼요'],

  // 월세
  r0: ['전세', '월세 없어요', '전세로'],
  r20: ['십만원', '십오만원', '싼 거'],
  r2030: ['이십만원', '이십오만원'],
  r3040: ['삼십만원', '삼십오만원'],
  r4050: ['사십만원', '사십오만원'],
  r50: ['오십만원', '육십만원', '더 돼요'],

  // 방 개수 · 층
  one: ['원룸', '한 개', '하나', '한 칸'],
  two: ['투룸', '두 개', '둘', '방 두 개'],
  three: ['쓰리룸', '세 개', '셋', '방 세 개', '세 개 이상'],
  low: ['낮은 층', '아래층', '일층', '저층'],
  high: ['높은 층', '위층', '고층'],
  any: ['상관없어요', '아무거나', '괜찮아요'],

  // 걸어서 갈 수 있으면 좋은 곳
  stop: ['정류장', '버스', '지하철', '버스 정류장'],
  store: ['편의점', '마트', '가게'],
  hospital: ['병원', '의원', '보건소'],

  // 중개사가 있다·없다를 말로 답할 때
  yes: ['있어요', '있습니다', '네', '있음', '예'],
  no: ['없어요', '없습니다', '아니요', '없음', '아니'],
};

/**
 * 질문과 선택지를 함께 읽어주는 문장.
 *
 * 질문만 읽어주면 무엇을 고를 수 있는지 모른 채 화면을 더듬게 된다.
 * 눈으로 목록을 훑을 수 없는 분에게는 이것이 목록을 보는 유일한 방법이다.
 * 화면에 붙은 번호를 그대로 불러 주어 '세 번째 것'이라고 짚을 수 있게 한다.
 */
export function spokenWithChoices(title: string, labels: string[]): string {
  const items = labels.map((l, i) => `${i + 1}번, ${readable(l)}.`).join(' ');
  return `${title} ${items}`;
}

/** 화면에 쓰는 기호를 소리로 읽을 수 있는 말로 바꾼다. */
function readable(label: string): string {
  return label.replace(/~/g, '에서 ').replace(/\s+/g, ' ').trim();
}

/** 이 질문을 말로 답할 때 쓸 후보 목록 */
export function voiceChoicesFor(choices: Choice[]): VoiceChoice[] {
  return choices.map((c) => ({
    id: c.id,
    label: c.label,
    keywords: VOICE_WORDS[c.id] ?? [],
  }));
}
