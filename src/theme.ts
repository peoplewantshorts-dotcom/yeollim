import { Platform } from 'react-native';

/**
 * 열림 디자인 토큰.
 *
 * 접근성 기준(한국형 모바일 애플리케이션 접근성 지침 + 오리엔테이션 특강)을
 * 색·크기 단계에서부터 강제한다.
 *  - 본문/버튼 글자와 배경의 명도 대비 4.5:1 이상
 *  - 최소 터치 영역 48dp (특강 권고 44~48px)
 *  - 판정은 색만으로 전달하지 않는다: 색 + 글자 + 도형 + 음성
 */

export const color = {
  // 브랜드
  primary: '#6B5AE0',
  /**
   * 글자로 쓰는 보라.
   *
   * 브랜드 보라(#6B5AE0)를 글자색으로 쓰면 라벤더 바탕에서 4.44:1, 연보라 칩
   * 위에서 4.00:1 이라 기준(4.5:1)에 못 미친다. 채우는 색과 읽는 색은 요구
   * 조건이 달라서, 글자용으로 한 단계 어두운 값을 따로 둔다.
   */
  primaryText: '#5B49C8',
  primaryPressed: '#5647C2',
  primarySoft: '#E6E2FB',
  onPrimary: '#FFFFFF',

  // 바탕
  bg: '#F1EFFC',
  surface: '#FFFFFF',
  surfaceSoft: '#F6F4FE',

  // 글자 (bg/surface 위에서 모두 4.5:1 이상)
  text: '#1B1B2F',
  textSub: '#5C5C75',
  // 흰 카드 위에서 4.30:1, 라벤더 바탕에서 3.79:1 로 기준(4.5:1)에 미달했다.
  // 보랏빛은 유지하되 명도만 낮춰 두 바탕 모두에서 통과하게 잡았다.
  textMuted: '#63637C',
  onPrimarySoft: '#3B2FA0',

  // 선
  border: '#DCD7F5',
  borderStrong: '#B9B0EE',

  /**
   * 종이.
   *
   * 요청서와 판정 카드는 앱이 만들어 준 화면이 아니라 사람이 적어 둔 기록으로 읽혀야 한다.
   *
   * 처음에는 누런 크림색 종이를 썼는데 앱의 보라 톤과 따로 놀았다. 종이라는 신호는
   * 색의 온도가 아니라 마진선·줄·그림자에서 나온다. 그래서 색은 앱 쪽으로 되돌리고
   * 아주 옅은 보랏빛만 남겼다. 줄은 눈에 걸리지 않을 만큼만 옅게 둔다.
   */
  paper: '#FDFCFF',
  paperRule: '#EEEAFA',
  paperMargin: '#CFC5F0',
  paperInk: '#1B1B2F',
  paperInkSub: '#5C5C75',

  // 판정 3단계 — 각 단계는 색 외에 label/shape/tts로 중복 전달된다
  goBar: '#3E8E5A',
  goBg: '#E4F3E9',
  goText: '#1F6B3A',

  fixBar: '#C98A22',
  fixBg: '#FBF0DA',
  fixText: '#7A5410',

  stopBar: '#C2566B',
  stopBg: '#FAE7EB',
  stopText: '#8E2438',

  unknownBar: '#8A8AA3',
  unknownBg: '#EFEFF4',
  unknownText: '#4A4A5F',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export const radius = {
  chip: 999,
  card: 20,
  button: 18,
  sheet: 24,
} as const;

/**
 * 서체는 Pretendard.
 *
 * 안드로이드 기본 한글 서체는 굵게 쓸수록 획이 뭉개져 글자가 답답해진다.
 * Pretendard 는 굵기별로 자소 간격이 따로 설계돼 있어 큰 제목에서도 열려 보이고,
 * 작은 글씨에서도 획이 붙지 않는다. 저시력·인지 특성을 고려하면 이 차이가 크다.
 *
 * 안드로이드에서는 fontWeight 로 굵기를 흉내 내면 획이 뭉개지므로,
 * 굵기마다 별도의 파일을 쓰고 fontWeight 는 쓰지 않는다.
 */
export const family = {
  regular: 'Pretendard-Regular',
  semibold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
  extrabold: 'Pretendard-ExtraBold',
} as const;

/** 본문 최소 17sp. 저시력·인지 특성을 고려해 기본값을 크게 잡는다. */
export const font = {
  display: 30,
  h1: 26,
  h2: 21,
  body: 18,
  label: 17,
  caption: 15,
} as const;

/** 최소 터치 영역. 어떤 인터랙티브 요소도 이 값 아래로 내려가지 않는다. */
/**
 * 최소 터치 영역.
 *
 * 근거 — 장애계 전문가 특강(시립서울장애인종합복지관 최미영 관장) 11쪽,
 * PART 2 유형3 지체장애·뇌병변장애 개발 체크포인트
 *
 *     "터치 영역 최소 44~48px, 요소 간 간격도 넉넉히"
 *
 * 그리고 29쪽 '개발할 때 확인할 아홉 가지'
 *
 *     "터치 영역이 충분하고, 시간 제한이 있다면 연장할 수 있는가"
 *
 * 44~48px 은 넘지 말아야 할 바닥선이지 충분한 크기가 아니다. 같은 장에
 * "실제 장벽은 정밀 조작과 시간 제한인 경우가 훨씬 많다"고 적혀 있으므로,
 * 바닥선을 겨우 넘기는 대신 여유를 두고 잡는다.
 *
 *   HIT      56  모든 인터랙티브 요소의 하한 (기준의 1.17~1.27배)
 *   TAP_BIG  64  선택지 알약처럼 가장 자주, 가장 많이 누르는 것
 *   TAP_MAIN 68  화면을 넘기는 주 버튼
 *
 * 간격도 함께 넓힌다. 표적이 커도 서로 붙어 있으면 옆 것을 누르게 된다.
 */
export const HIT = 56;
export const TAP_BIG = 64;
export const TAP_MAIN = 68;
/** 인터랙티브 요소 사이의 최소 간격 */
export const TAP_GAP = 16;

/**
 * 손 떨림(근긴장도 항진·불수의 운동)으로 같은 버튼이 연속으로 눌리는 것을
 * '오류'가 아니라 '한 번의 의도'로 처리하기 위한 무시 구간(ms).
 */
export const DOUBLE_TAP_GUARD_MS = 550;

/**
 * 한글 줄바꿈.
 *
 * 브라우저와 안드로이드 모두 한글은 기본적으로 글자 단위로 끊어 넘긴다.
 * 그러면 '경사로가'가 '경사 / 로가'로 잘려 읽는 속도가 크게 떨어진다.
 * 어절 단위로 넘기도록 지정한다.
 */
export const keepAll = Platform.select({
  web: { wordBreak: 'keep-all' as const },
  android: { textBreakStrategy: 'balanced' as const },
  default: {},
});

export const shadow = {
  card: {
    shadowColor: '#3A2E7A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  button: {
    shadowColor: '#3A2E7A',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
} as const;
