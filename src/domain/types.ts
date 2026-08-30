/** 열림 도메인 타입 */

/** 요청서 항목의 우선순위. 판정에 직접 쓰인다. */
export type Priority = 'must' | 'nice';

/**
 * 이동 방법.
 *
 * 프로필에서 사용자에게 직접 묻는 유일한 몸 정보다.
 * 진단명이나 장애 등급은 묻지 않는다 — 등록증에 '정도가 심한 장애인' 한 줄로만
 * 표기돼 물어봐야 판정에 쓸 정보가 나오지 않고, 묻는 행위 자체가 낙인이 된다.
 */
export type MobilityId = 'power' | 'manual' | 'cane' | 'crutch' | 'walker' | 'none';

/** 중개사와 주고받는 방식. 청각장애와 언어장애가 이 한 문항으로 함께 처리된다. */
export type ContactId = 'text' | 'phone';

/**
 * 매물에서 확인하는 접근성 지표 키.
 *
 * BF(장애물 없는 생활환경) 인증심사기준과 국내 무장애 주택설계 연구에서 도출하고,
 * 팀장의 중개 실무에서 '줄자로 30초 안에 잴 수 있는가'로 한 번 더 걸렀다.
 * 매물마다 답이 갈리지 않는 항목(화장실 손잡이·시각경보기)은 물어봐야
 * 전부 같은 답이 나오므로 넣지 않았다.
 */
export type FactKey =
  | 'doorWidth' // 현관문 폭
  | 'outStep' // 중앙현관문 앞 계단 (경사로가 있으면 면제)
  | 'inStep' // 중앙현관 들어가서 1층 집 앞까지의 계단, 이른바 반계단
  | 'bathroomSill' // 화장실 문턱
  | 'bathroomDoor' // 화장실 문 폭
  | 'elevator'; // 승강기

/** 사용자의 이동 방법에서 자동으로 도출된 조건 하나. */
export interface Requirement {
  key: FactKey;
  /** 판정에 쓰는 수치 임계값. 예: 허용 계단 수 0칸, 필요한 문 폭 90cm */
  threshold: number | null;
  priority: Priority;
  /** 요청서에 그대로 인쇄되는 쉬운 말 */
  cardText: string;
  /**
   * 그 문장에서 형광펜을 칠할 부분.
   *
   * 줄 전체를 칠하면 어디가 핵심인지 알 수 없다. 실제로 중요한 것은 수치다 —
   * '현관문 폭'이 아니라 '90cm 이상'이 이 줄의 내용이다.
   * 규칙으로 잘라내려 하면 문장을 고칠 때마다 어긋나므로 여기 적어 둔다.
   */
  emphasis: string;
}

/**
 * 2단계 일반 조건.
 *
 * 판정에는 쓰지 않는다. 여기 적힌 값이 안 맞는다고 '가지 마세요'가 되지는 않는다.
 * 헛걸음을 만드는 것은 몸에 맞지 않는 구조이지 예산이 아니기 때문이다.
 * 대신 중개사가 매물을 고르는 단계에서 쓰도록 요청서에 그대로 실어 보낸다.
 */
export interface GeneralTerms {
  /**
   * 찾는 동네.
   *
   * 중개사가 매물을 고를 때 가장 먼저 보는 조건인데 처음 설계에서 빠져 있었다.
   * 자유롭게 적게 둔다 — '익산시 신동'처럼 행정동으로 적는 사람도 있고
   * '원광대 근처'처럼 아는 곳을 기준으로 적는 사람도 있다.
   */
  area: string;
  /**
   * 보증금과 월세는 숫자가 아니라 구간으로 받는다.
   *
   * 숫자 입력은 그 자체가 장벽이다. 손이 떨리면 자릿수가 어긋나고,
   * 0을 몇 개 적어야 하는지 세는 일도 부담이다. 중개사가 매물을 고를 때
   * 필요한 것은 정확한 금액이 아니라 대략의 범위이므로 구간이면 충분하다.
   */
  /*
   * 여러 개 고를 수 있다. 예산은 하나로 딱 떨어지지 않는다 —
   * 300~500 도 보고 500~1000 도 본다고 말하는 편이 실제에 가깝다.
   */
  deposit: string[];
  rent: string[];
  /** 방 개수도 여러 개 고를 수 있다. '두 개나 세 개'가 자연스러운 조건이다. */
  rooms: string[];
  floorPref: 'any' | 'low' | 'high' | null;
  /** 걸어서 갈 수 있으면 좋은 곳 */
  near: string[];
}

export const emptyTerms = (): GeneralTerms => ({
  area: '',
  deposit: [],
  rent: [],
  rooms: [],
  floorPref: null,
  near: [],
});

export interface UserProfile {
  mobility: MobilityId;
  contact: ContactId;
  terms: GeneralTerms;
  /** 이동 방법에서 규칙으로 도출한 조건들. 사용자가 직접 고르지 않는다. */
  requirements: Requirement[];
  updatedAt: string;
}

/**
 * 매물의 접근성 사실.
 *
 * null 은 '모름'이며 절대 추측으로 채우지 않는다.
 * (특강: AI가 확실하지 않으면 "모르겠습니다·확인이 필요합니다"라고 말할 수 있어야 한다)
 *
 * 중개사는 줄자를 들고 다닌다. 그래서 있다·없다가 아니라 잰 숫자를 받는다.
 * 숫자를 받으면 판정이 3단계로 갈리고 '언제 누가 쟀는지'가 근거로 남는다.
 */
export interface PropertyFacts {
  doorWidthCm: number | null;
  /** ① 중앙현관문 앞 */
  outStepCount: number | null;
  outRamp: boolean | null;
  /** ② 중앙현관 들어가서 1층 집 앞까지 (반계단) */
  inStepCount: number | null;
  bathroomSillCm: number | null;
  bathroomDoorCm: number | null;
  hasElevator: boolean | null;
  floor: number | null;
  /** 판정에는 쓰지 않는 참고 정보 */
  parking: boolean | null;
}

export const emptyFacts = (): PropertyFacts => ({
  doorWidthCm: null,
  outStepCount: null,
  outRamp: null,
  inStepCount: null,
  bathroomSillCm: null,
  bathroomDoorCm: null,
  hasElevator: null,
  floor: null,
  parking: null,
});

/** 매물에 붙는 사진 한 장 또는 영상 하나 */
export interface Media {
  /** 기기 안의 파일 주소. 중개사가 방금 찍은 것. */
  uri: string;
  kind: 'image' | 'video';
  /**
   * 앱에 함께 넣어 둔 사진.
   *
   * 시연용 매물의 사진은 기기에 없으므로 앱 안에 넣어 둔다.
   * 이 값이 있으면 uri 대신 이것을 쓴다.
   */
  asset?: number;
}

export interface Property {
  id: string;
  name: string;
  address: string;
  /** 중개사가 실측을 마친 시각. 판정 카드에 근거로 함께 보여준다. */
  checkedAt: string | null;
  /**
   * 중개사가 글로 덧붙이는 매물 설명.
   *
   * 우리에게는 매물 데이터베이스가 없다. 실제 중개사는 공실 목록을 사진으로 보내거나
   * 글로 적어 준다. 재서 넣는 숫자만으로 담기지 않는 것들 — 채광, 관리비, 입주 가능일 —
   * 을 여기에 그대로 적게 둔다. 판정에는 쓰지 않는다.
   */
  memo: string;
  /**
   * 보증금과 월세 (만원).
   *
   * 사용자는 구간 버튼으로 고르고 중개사는 숫자로 정확히 넣는다.
   * 고르는 쪽과 적는 쪽의 부담이 다르기 때문이다 — 손이 떨리는 사람에게 숫자를
   * 치게 하면 그 자리에서 막히지만, 중개사에게는 500/33 이 매물을 부르는 이름이다.
   */
  depositMan: number | null;
  rentMan: number | null;
  /**
   * 중개사가 붙인 사진과 영상.
   *
   * 숫자로는 담기지 않는 것이 있다. 현관까지 가는 동선, 반계단의 실제 높이,
   * 문턱을 넘는 느낌 같은 것들. 재는 것과 보여주는 것은 서로를 대신하지 못해서
   * 둘 다 둔다. 판정은 여전히 잰 숫자로만 한다 — 사진과 영상은 근거이지
   * 판정 재료가 아니다.
   *
   * 사진과 영상을 함께 받는 이유는 실무가 그렇기 때문이다. 급하면 사진 몇 장을
   * 찍어 보내고, 여유가 있으면 동선을 한 번에 담은 영상을 보낸다.
   *
   * 지금은 기기 안의 파일 주소를 그대로 들고 있다. 실제 서비스로 가려면
   * 서버에 올리고 주소를 받아 와야 한다.
   */
  media: Media[];
  /**
   * 걸어서 갈 수 있는 곳. 판정에는 쓰지 않는다.
   *
   * 처음에는 정류장·마트·병원까지 몇 분인지 숫자 세 칸으로 받았는데, 실제로
   * 중개사가 답하는 방식이 아니었다. '○○의원이 걸어서 5분'처럼 무엇이
   * 있는지와 함께 말한다. 칸을 나누지 않고 그대로 적게 둔다.
   *
   * 지적장애인의 주거 연구에서 지역사회 접근성이 삶의 질 변수로 반복 보고된다
   * (Quesada-Cubo et al. 2025, JARID 73편 체계적 문헌고찰). 다만 몇 분이면
   * 충분한지에 대한 기준값은 근거가 없어 판정선으로 삼지 않고 그대로 전한다.
   */
  nearby: string;
  facts: PropertyFacts;
}

/** 사용자가 중개사에게 보낸 요청서 */
export interface RequestCard {
  id: string;
  userName: string;
  mobility: MobilityId;
  contact: ContactId;
  terms: GeneralTerms;
  requirements: Requirement[];
  sentAt: string;
  /** 중개사가 붙인 매물 후보 */
  propertyIds: string[];
  /**
   * 당사자가 직접 보러 가겠다고 고른 집.
   *
   * 판정은 갈 수 있는지를 알려줄 뿐이고 어디로 갈지는 본인이 정한다.
   * 고른 것을 중개사에게 전해 두면 그 집만 준비하면 되므로 서로 헛수고가 줄어든다.
   */
  visitIds: string[];
}

/** 통화 녹음에서 뽑아낸 한 항목. 근거 구간을 반드시 함께 남긴다. */
export interface CallExtraction {
  key: FactKey;
  label: string;
  /**
   * true = 사용자 조건에 걸리지 않는 쪽(계단 없음, 턱 없음, 폭 충분함).
   *
   * 이 불리언은 항목마다 '있음'을 뜻하기도 하고 '없음'을 뜻하기도 해서
   * 화면에서 그대로 읽으면 뜻이 뒤집힌다. 그래서 화면에 쓸 말은
   * stateLabel 로 함께 내려보내고, UI 는 이 불리언을 해석하지 않는다.
   */
  value: boolean | null;
  /** 화면에 그대로 찍는 말. 예: '없음', '있음', '넘음'. 확인 필요면 null */
  stateLabel: string | null;
  quote: string | null;
  atSecond: number | null;
  confidence: number;
}
