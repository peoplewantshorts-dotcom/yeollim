/**
 * 판정 엔진·조건 도출·통화 분석 동작 확인.
 *
 * 이 앱에서 사람의 헛걸음 여부를 실제로 가르는 코드는 src/domain 이다.
 * 화면은 바뀌어도 이 규칙은 바뀌면 안 되므로 여기에 못을 박아 둔다.
 *
 *   npm run test:engine
 */
const path = require('path');
const OUT = path.join(__dirname, '..', '.engine-build');

const { match } = require(path.join(OUT, 'matching'));
const {
  analyzeTranscript,
  applyExtractions,
  CONFIDENCE_FLOOR,
} = require(path.join(OUT, 'callAnalysis'));
const { deriveRequirements } = require(path.join(OUT, 'questions'));
const { SEED_PROPERTIES, SAMPLE_TRANSCRIPT } = require(path.join(OUT, 'seed'));

let fail = 0;
const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fail++;
  console.log(
    `${ok ? '  ok' : 'FAIL'}  ${label}` +
      (ok ? '' : `\n        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`),
  );
};
const group = (t) => console.log(`\n${t}`);

/*
 * 판정 규칙을 시험하려면 여러 상태의 매물이 필요한데, 씨앗 데이터는 시연용이라
 * 한 채뿐이고 앞으로도 바뀐다. 시험에 필요한 매물은 여기서 직접 만든다.
 */
const house = (facts) => ({
  id: 't',
  name: '시험용',
  address: '',
  checkedAt: '2026-08-30',
  memo: '',
  depositMan: null,
  rentMan: null,
  media: [],
  stopMin: null,
  storeMin: null,
  hospitalMin: null,
  facts: {
    doorWidthCm: null,
    outStepCount: null,
    outRamp: null,
    inStepCount: null,
    bathroomSillCm: null,
    bathroomDoorCm: null,
    hasElevator: null,
    floor: null,
    parking: null,
    ...facts,
  },
});

/** 아무것도 재지 않은 집 */
const p1 = { ...house({}), checkedAt: null };

/** 경사로가 있어 통과하는 집 */
const p2 = house({
  doorWidthCm: 92,
  outStepCount: 2,
  outRamp: true,
  inStepCount: 0,
  bathroomSillCm: 0,
  bathroomDoorCm: 82,
  hasElevator: false,
  floor: 1,
});

/** 문도 좁고 반계단도 있는 집 */
const p3 = house({
  doorWidthCm: 78,
  outStepCount: 4,
  outRamp: false,
  inStepCount: 5,
  bathroomSillCm: 4,
  bathroomDoorCm: 65,
  hasElevator: false,
  floor: 2,
});

/** 조금 고치면 되는 집 */
const p4 = house({
  doorWidthCm: 85,
  outStepCount: 1,
  outRamp: false,
  inStepCount: 0,
  bathroomSillCm: 2,
  bathroomDoorCm: 76,
  hasElevator: false,
  floor: 1,
});

// 씨앗 데이터는 화면에 실제로 뜨는 값이라 판정이 서는지만 확인한다.
const [seed] = SEED_PROPERTIES;

/* ------------------------------------------------------------------ */
group('조건 도출 — 사용자에게 되묻지 않고 규칙이 붙인다');

const power = deriveRequirements('power');
eq('전동휠체어는 6가지 조건이 붙는다', power.length, 6);
eq('  문 폭은 BF 기준 90cm', power.find((r) => r.key === 'doorWidth').threshold, 90);
eq('  화장실 문턱은 0cm', power.find((r) => r.key === 'bathroomSill').threshold, 0);
eq('  화장실 문 폭 80cm — 현관을 넘어도 여기서 막히면 못 쓴다', power.find((r) => r.key === 'bathroomDoor').threshold, 80);
eq('  전부 꼭 필요', power.every((r) => r.priority === 'must'), true);
eq('수동휠체어도 같은 조건', deriveRequirements('manual').length, 6);

const cane = deriveRequirements('cane');
eq('지팡이는 3가지 — 화장실 문 폭은 걸어 들어가므로 따지지 않는다', cane.length, 3);
eq('  계단 3칸까지 허용', cane.find((r) => r.key === 'outStep').threshold, 3);
eq('  문턱은 무장애 표준 2.5cm', cane.find((r) => r.key === 'bathroomSill').threshold, 2.5);
eq('목발과 보행기도 같은 조건', deriveRequirements('walker').length, 3);
eq('보조기구를 안 쓰면 조건이 붙지 않는다', deriveRequirements('none').length, 0);

/* ------------------------------------------------------------------ */
group('판정 — 실측이 끝난 매물');

const m2 = match(power, p2);
eq('경사로가 있으면 계단 2칸이어도 갈 수 있어요', m2.verdict, 'go');
eq('  보류가 아니다', m2.pending, false);

const m3 = match(power, p3);
eq('문 폭 78cm에 반계단 5칸은 가지 마세요', m3.verdict, 'stop');
eq('  가지 않아도 된다고 알려준다', m3.note, '이 집은 안 가셔도 돼요');

const m4 = match(power, p4);
eq('문 폭 85cm는 조금 고치면 돼요', m4.verdict, 'fix');
eq('  고치는 방법을 함께 준다', m4.lines[1], '문턱만 없애도 지나가기 수월해져요');
eq('  부동산에 요청하라고 안내한다', m4.note, '부동산에 요청해 보실 수 있어요');

eq('지팡이 사용자에게 p4는 통과', match(cane, p4).verdict, 'go');
eq('  같은 집이라도 몸에 따라 판정이 갈린다', match(cane, p4).verdict !== m4.verdict, true);

/* ------------------------------------------------------------------ */
group('반계단 — 승강기가 있어도 못 들어가는 경우');

const halfStair = house({
  doorWidthCm: 95,
  bathroomDoorCm: 85,
  outStepCount: 0,
  outRamp: false,
  inStepCount: 4,
  bathroomSillCm: 0,
  hasElevator: true,
  floor: 3,
});
const hs = match(power, halfStair);
eq('승강기가 있어도 안쪽 반계단이 막으면 가지 마세요', hs.verdict, 'stop');
eq('  이유를 반계단으로 짚어준다', hs.lines[0], '중앙현관 안에 계단이 4칸 있어요');

/* ------------------------------------------------------------------ */
group('화장실 문 폭 — 현관을 넘어도 여기서 막힌다');

const narrowBath = {
  ...p2,
  facts: { ...p2.facts, bathroomDoorCm: 62 },
};
eq('62cm 는 가지 마세요', match(power, narrowBath).verdict, 'stop');
eq('  이유를 화장실 문으로 짚어준다', match(power, narrowBath).lines[0], '화장실 문 폭이 62cm라 좁아요');
eq('76cm 는 조금 고치면 돼요', match(power, { ...p2, facts: { ...p2.facts, bathroomDoorCm: 76 } }).verdict, 'fix');
eq('지팡이 사용자에게는 조건이 아니다', match(cane, narrowBath).verdict, 'go');

/* ------------------------------------------------------------------ */
group('판정 — 모르는 것을 아는 척하지 않는다');

const m1 = match(power, p1);
eq('꼭 필요 6가지가 미확인', m1.unknownMustCount, 6);
eq('  확인 전에는 갈 수 있어요라고 말하지 않는다', m1.pending, true);
eq('  대신 확인 중이라고 말한다', m1.title, '아직 확인 중이에요');
eq('  무엇이 남았는지 알려준다', m1.note, '6가지만 더 확인하면 알려드릴게요');
eq('가지 마세요는 보류하지 않는다', m3.pending, false);

/* ------------------------------------------------------------------ */
group('통화 분석 — 근거 없는 값은 채우지 않는다');

const ex = analyzeTranscript(SAMPLE_TRANSCRIPT);
const by = (k) => ex.find((e) => e.key === k);

eq('중앙현관 앞을 계단 없음으로 읽어냄', by('outStep').value, true);
eq('  판단 근거가 된 발화', by('outStep').quote, '계단은 없고 바로 평지예요.');
eq('  근거 구간(초)', by('outStep').atSecond, 134);
eq('  화면에 찍히는 말', by('outStep').stateLabel, '계단 없음');

eq('안쪽 반계단을 있음으로 읽어냄', by('inStep').value, false);
eq('  화면에 찍히는 말', by('inStep').stateLabel, '계단 있음');
eq('  근거 발화', by('inStep').quote, '아 거기는 반계단 세 칸 올라갑니다.');

eq('화장실 턱을 없음으로 읽어냄', by('bathroomSill').value, true);
eq('임대인이 모른다고 하면 비워 둔다', by('doorWidth').value, null);
eq('  화면에 찍을 말도 비운다', by('doorWidth').stateLabel, null);
eq('  확신도가 기준 아래', by('doorWidth').confidence < CONFIDENCE_FLOOR, true);

const filled = applyExtractions(p1.facts, ex, SAMPLE_TRANSCRIPT);
eq('반영: 중앙현관 앞 계단 0칸', filled.outStepCount, 0);
eq('반영: 안쪽 반계단 3칸 — 한국어 수사를 숫자로', filled.inStepCount, 3);
eq('반영: 화장실 턱 0cm', filled.bathroomSillCm, 0);
eq('반영 안 함: 문 폭은 여전히 모름', filled.doorWidthCm, null);

const after = match(power, { ...p1, facts: filled });
eq('통화만으로도 못 가는 집인 것이 드러난다', after.verdict, 'stop');
eq('  이유는 반계단', after.lines[0], '중앙현관 안에 계단이 3칸 있어요');

/* ------------------------------------------------------------------ */
group('실측 입력으로 판정이 완성된다');

const measured = house({
  ...filled,
  inStepCount: 0,
  doorWidthCm: 91,
  bathroomDoorCm: 84,
  floor: 1,
  hasElevator: false,
});
const done = match(power, measured);
eq('전부 확인되면 갈 수 있어요', done.verdict, 'go');
eq('  보류 해제', done.pending, false);
eq('  미확인 0', done.unknownMustCount, 0);
eq('  1층이면 승강기를 따지지 않는다', done.items.find((i) => i.key === 'elevator').verdict, 'pass');

/* ------------------------------------------------------------------ */
group('시연용 매물 — 화면에 실제로 뜨는 값');

const seedResult = match(power, seed);
eq('중앙원룸은 전동휠체어로 갈 수 있다', seedResult.verdict, 'go');
eq('  재지 않은 항목이 없다', seedResult.unknownMustCount, 0);
eq('지팡이 사용자에게도 통과', match(cane, seed).verdict, 'go');

/* ------------------------------------------------------------------ */
group('순위 — 조건이 많이 맞은 집이 앞에 온다');

const [a, b] = SEED_PROPERTIES;
const ra = match(power, a);
const rb = match(power, b);
eq('중앙원룸은 여섯 가지가 다 맞는다', ra.passCount, 6);
eq('새봄원룸은 두 가지만 맞는다', rb.passCount, 2);
eq('  그래서 중앙원룸이 앞에 온다', ra.passCount > rb.passCount, true);
eq('아무것도 안 잰 집은 맞은 것이 없다', match(power, p1).passCount, 0);

console.log(fail === 0 ? '\n모두 통과' : `\n${fail}건 실패`);
process.exit(fail ? 1 : 0);
