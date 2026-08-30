/**
 * 말한 내용 → 선택지 맞추기 동작 확인.
 *
 * 구음장애가 있으면 인식기가 받아 적은 글자부터 흔들린다. 여기 적힌 오인식 예시는
 * 실제로 흔한 형태(된소리 탈락, 종성 누락, 모음 단순화, 조사 붙어 나옴)를 본뜬 것이다.
 * 실증에서 실제 오인식 사례가 나오면 여기에 계속 추가한다.
 *
 *   npm run test:voice
 */
const path = require('path');
const OUT = path.join(__dirname, '..', '.engine-build');
const { matchVoice, toJamo, similarity, ACCEPT } = require(path.join(OUT, 'voiceMatch'));
const {
  voiceChoicesFor,
  MOBILITY_Q,
  CONTACT_Q,
  DEPOSIT_BANDS,
  ROOM_OPTIONS,
} = require(path.join(OUT, 'questions'));
const { parseKoreanNumber } = require(path.join(OUT, 'koreanNumber'));

let fail = 0;
const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log(`${ok ? '  ok' : 'FAIL'}  ${label}` +
    (ok ? '' : `\n        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`));
};
const group = (t) => console.log(`\n${t}`);

const MOBILITY = voiceChoicesFor(MOBILITY_Q.choices);
const CONTACT = voiceChoicesFor(CONTACT_Q.choices);
const DEPOSIT = voiceChoicesFor(DEPOSIT_BANDS);
const ROOMS = voiceChoicesFor(ROOM_OPTIONS);

const pick = (said, choices = MOBILITY) => {
  const r = matchVoice(Array.isArray(said) ? said : [said], choices);
  return {
    top: r.ranked[0] && r.ranked[0].id,
    action: r.action,
    score: r.ranked[0] && r.ranked[0].score,
  };
};

group('한글 자모 분해');
eq('휠 → ㅎㅟㄹ', toJamo('휠'), 'ㅎㅟㄹ');
eq('띄어쓰기와 부호를 걷어낸다', toJamo('전동 휠체어!'), toJamo('전동휠체어'));
eq('휠 과 힐 은 자모로 보면 한 칸 차이', similarity(toJamo('휠'), toJamo('힐')) > 0.6, true);

group('또렷하게 말한 경우 — 한 화면에 여섯 가지');
eq('"전동휠체어를 타요"', pick('전동휠체어를 타요').top, 'power');
eq('"수동휠체어를 타요"', pick('수동휠체어를 타요').top, 'manual');
eq('"지팡이를 사용해요"', pick('지팡이를 사용해요').top, 'cane');
eq('"목발을 사용해요"', pick('목발을 사용해요').top, 'crutch');
eq('"보행기를 사용해요"', pick('보행기를 사용해요').top, 'walker');

group('실제로 하는 말 — 화면 문구와 다르게 말한다');
eq('"전동" 한 마디만', pick('전동').top, 'power');
eq('"수동이요"', pick('수동이요').top, 'manual');
eq('"목발 짚어요"', pick('목발 짚어요').top, 'crutch');

group('발음이 흐려 잘못 받아 적힌 경우');
eq('"전동 힐체아" → 전동', pick('전동 힐체아').top, 'power');
eq('"수동 휠체아" → 수동', pick('수동 휠체아').top, 'manual');
eq('1순위가 틀리고 3순위가 맞아도 잡는다',
   pick(['정도 일체어', '전등 휠체어', '전동 휠체어']).top, 'power');

group('수동과 전동을 헷갈리지 않는다');
eq('  두 답이 서로 다르다',
   pick('수동휠체어를 타요').top !== pick('전동휠체어를 타요').top, true);
eq('"휠체어 타요"만으로는 확정하지 않는다', pick('휠체어 타요').action !== 'confirm', true);

group('흐린 발음도 잡는다');
eq('"보행기 밀고 다녀요"', pick('보행기 밀고 다녀요').top, 'walker');
eq('"지파이 써요" → 지팡이', pick('지파이 써요').top, 'cane');
eq('"보앵기" → 보행기', pick('보앵기').top, 'walker');

group('금액 구간과 방 개수');
eq('"사백만원"', pick('사백만원', DEPOSIT).top, 'd300');
// 300만원은 100~300 과 300~500 의 경계라 어느 쪽인지 알 수 없다.
// 한쪽으로 찍지 않고 되묻는 것이 맞다.
eq('경계값은 찍지 않고 되묻는다', pick('삼백만원', DEPOSIT).action, 'choose');
eq('"원룸"', pick('원룸', ROOMS).top, 'one');
eq('"쓰리룸"', pick('쓰리룸', ROOMS).top, 'three');

group('연락 방식');
eq('"문자로 주세요"', pick('문자로 주세요', CONTACT).top, 'text');
eq('"글이 편해요"', pick('글이 편해요', CONTACT).top, 'text');
eq('"전화 괜찮아요"', pick('전화 괜찮아요', CONTACT).top, 'phone');
eq('  두 답이 서로 다르다',
   pick('문자로 주세요', CONTACT).top !== pick('전화 괜찮아요', CONTACT).top, true);

group('못 알아들었으면 고르지 않는다');
eq('전혀 상관없는 말', pick('오늘 날씨가 좋네요').action, 'unclear');
eq('빈 소리', pick('').action, 'unclear');
eq('  못 알아들으면 확정하지 않는다', pick('음...').action !== 'confirm', true);
eq('  금액 질문에서도 마찬가지', pick('그게 저기', DEPOSIT).action !== 'confirm', true);

group('말한 숫자를 알아듣는다 — 중개사가 재면서 말한다');
const num = (t) => parseKoreanNumber(t);
eq('"92"', num('92'), 92);
eq('"구십이"', num('구십이'), 92);
eq('"구십이 센티"', num('구십이 센티'), 92);
eq('"팔십오"', num('팔십오'), 85);
eq('"백오십"', num('백오십'), 150);
eq('"세 칸"', num('세 칸'), 3);
eq('"한 칸"', num('한 칸'), 1);
eq('"없어요" 는 0', num('없어요'), 0);
eq('"평지예요" 도 0', num('평지예요'), 0);
eq('못 알아들으면 비워 둔다', num('그게 저기'), null);
eq('빈 소리도 비워 둔다', num(''), null);

group('통과 기준');
eq('기준값이 지나치게 낮지 않다', ACCEPT >= 0.55, true);
eq('확정된 것은 기준을 넘는다', pick('전동휠체어를 타요').score >= ACCEPT, true);

console.log(fail === 0 ? '\n모두 통과' : `\n${fail}건 실패`);
process.exit(fail ? 1 : 0);
