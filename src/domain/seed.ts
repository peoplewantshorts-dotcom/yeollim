import { emptyFacts, type Property } from './types';

/**
 * 실증 시연용 초기 매물.
 *
 * 제안서의 리스크 대응 그대로다 — 초기 매물 데이터가 없으면 첫 사용자에게
 * 보여줄 것이 하나도 없으므로, 협력 중개사무소 보유 매물 하나를 미리 재어 둔
 * 상태에서 시작한다.
 *
 * 이름만 그럴듯한 매물을 여러 채 늘어놓지 않는다. 실제로 재고 사진을 붙인
 * 한 채가 이름만 있는 네 채보다 낫다. 나머지는 중개사가 직접 올린다.
 */
export const SEED_PROPERTIES: Property[] = [
  {
    id: 'p1',
    name: '중앙원룸 3동',
    address: '전북 익산시 신동',
    checkedAt: '2026-08-29',
    memo: '남향이라 낮에 밝아요 · 관리비 5만원',
    depositMan: 500,
    rentMan: 40,
    media: [],
    stopMin: 4,
    storeMin: 3,
    hospitalMin: 9,
    facts: {
      doorWidthCm: 92,
      outStepCount: 2,
      outRamp: true, // 계단 옆에 경사로가 함께 있는 흔한 형태
      inStepCount: 0,
      bathroomSillCm: 0,
      bathroomDoorCm: 82,
      hasElevator: false,
      floor: 1,
      parking: true,
    },
  },
  {
    id: 'p2',
    name: '새봄원룸 102호',
    address: '전북 익산시 신동',
    checkedAt: '2026-08-30',
    memo: '9월 중순 입주 가능 · 관리비 3만원',
    depositMan: 1000,
    rentMan: 45,
    media: [],
    stopMin: 8,
    storeMin: 5,
    hospitalMin: 15,
    facts: {
      doorWidthCm: 85,
      outStepCount: 1,
      outRamp: false,
      inStepCount: 0,
      bathroomSillCm: 2,
      bathroomDoorCm: 76,
      hasElevator: false,
      floor: 1,
      parking: false,
    },
  },
];

/**
 * 통화 녹음 분석 시연용 대본.
 *
 * 실제 앱에서는 중개사가 이미 사용 중인 통화 녹음 파일을 직접 골라 STT를 태우고,
 * 그 결과 텍스트가 이 자리에 들어간다. 추출 로직(analyzeTranscript)은 텍스트를
 * 실제로 읽고 판단하므로 녹음이 실물로 바뀌어도 그대로 동작한다.
 */
export const SAMPLE_TRANSCRIPT: { at: number; who: '중개사' | '임대인'; text: string }[] = [
  { at: 118, who: '중개사', text: '사장님 101호 말인데요, 중앙현관 앞에 계단이나 경사로 있나요?' },
  { at: 134, who: '임대인', text: '계단은 없고 바로 평지예요.' },
  { at: 142, who: '중개사', text: '현관 들어가서 1층 집까지는요? 반계단 있나요?' },
  { at: 149, who: '임대인', text: '아 거기는 반계단 세 칸 올라갑니다.' },
  { at: 158, who: '중개사', text: '아 네. 화장실 문턱은 어떤가요?' },
  { at: 164, who: '임대인', text: '아 거긴 턱 없습니다.' },
  { at: 176, who: '중개사', text: '현관문 폭이 혹시 90센치 넘나요?' },
  { at: 183, who: '임대인', text: '그건 재본 적이 없어서 잘 모르겠네요.' },
  { at: 195, who: '중개사', text: '네 알겠습니다. 제가 가서 재보겠습니다.' },
];
