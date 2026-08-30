/**
 * 앱이 소리로 읽어주는 고정 문장을 전부 모아 voice-lines.json 으로 쓴다.
 *
 * 손으로 목록을 관리하면 문항을 고칠 때마다 음성이 어긋난다. 그래서 도메인 모듈에서
 * 직접 긁어온다. 질문을 하나 고치면 이 스크립트가 알아서 새 문장을 집어낸다.
 *
 *   npm run voice:lines
 */
import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

const root = path.join(import.meta.dirname, '..');
const out = path.join(root, '.engine-build');

execSync(
  'npx tsc --ignoreConfig src/domain/questions.ts src/domain/matching.ts ' +
    'src/domain/voiceMatch.ts src/domain/types.ts ' +
    '--outDir .engine-build --module commonjs --target es2020 --skipLibCheck --esModuleInterop',
  { cwd: root, stdio: 'inherit' },
);

const require = createRequire(import.meta.url);
const Q = require(path.join(out, 'questions'));
const M = require(path.join(out, 'matching'));

/** 코드에서 긁어올 수 없는 화면 문구는 여기 적는다. */
const EXTRA = [
  // 시작 · 안내
  '열림. 들어갈 수 있는 집인지, 가기 전에 알려드려요.',
  '맞는 집을 찾으려고 두세 가지만 여쭤볼게요. 천천히 고르셔도 됩니다. 시간 제한은 없어요.',
  '어떤 집을 찾으세요? 아직 정하지 않으셨으면 비워두고 넘어가셔도 됩니다.',

  // 말로 답하기
  '조용한 곳에서 천천히 말씀해 주세요. 한 마디만 하셔도 돼요.',
  '제가 못 알아들은 거예요. 조용한 곳에서 한 번만 더 말씀해 주시겠어요?',
  '이게 맞나요?',
  '어느 쪽인가요?',
  '듣고 있어요',
  '잘 못 들었어요',

  // 판정 카드에 붙는 고정 문장
  '조건이 모두 맞아요',
  '경사판을 놓으면 들어갈 수 있어요',
  '작은 경사판으로 넘을 수 있어요',
  '문턱을 없애거나 문짝을 바꾸면 넓어져요',
  '이 집은 안 가셔도 돼요',
  '부동산에 요청해 보실 수 있어요',
  '확인이 끝난 집이에요',
  '아직 중개사 실측 전이에요',
  '중앙현관 앞에 경사로가 있어요',
  '중앙현관 앞에 계단 없음',
  '중앙현관 안에 계단 없음',
  '화장실 문턱 없음',
  '1층이라 승강기가 필요 없어요',

  // 보낸 뒤
  '요청서를 보냈어요. 중개사가 매물을 재보고 나면 바로 알려드릴게요.',
  '덜 잰 집은 아직 알려드리지 않아요. 확실할 때만 말씀드릴게요.',
];

const lines = new Set();
const add = (t) => {
  const s = String(t ?? '').replace(/\s+/g, ' ').trim();
  if (s) lines.add(s);
};

// 프로필 문항 — 제목과 선택지
for (const q of [Q.WHEELCHAIR_Q, Q.WALK_AID_Q, Q.CONTACT_Q]) {
  add(q.title);
  add(q.hint);
  for (const c of q.choices) add(c.label);
}

// 요청서 머리말
for (const v of Object.values(Q.MOBILITY_SENTENCE)) add(v);
for (const v of Object.values(Q.CONTACT_SENTENCE)) add(v);

// 이동 방법마다 자동으로 붙는 조건 문장
for (const m of ['power', 'manual', 'cane', 'crutch', 'walker', 'none']) {
  for (const r of Q.deriveRequirements(m)) add(r.cardText);
}

// 판정 3단계와 보류
for (const v of Object.values(M.VERDICT_LABEL)) add(v);
add(M.PENDING_LABEL);

EXTRA.forEach(add);

/** src/speech/hash.ts 의 lineId 와 반드시 같은 규칙이어야 한다. */
function lineId(text) {
  const s = String(text).replace(/\s+/g, ' ').trim();
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

const list = [...lines].sort().map((text) => ({ id: lineId(text), text }));

// 해시가 겹치면 한쪽 음성이 다른 문장으로 재생된다. 조용히 넘어가면 안 된다.
const seen = new Map();
for (const l of list) {
  if (seen.has(l.id)) {
    console.error(`해시 충돌: "${seen.get(l.id)}" 와 "${l.text}"`);
    process.exit(1);
  }
  seen.set(l.id, l.text);
}

const target = path.join(root, 'voice-lines.json');
writeFileSync(target, JSON.stringify(list, null, 2) + '\n', 'utf8');

const chars = list.reduce((n, l) => n + l.text.length, 0);
console.log(`문장 ${list.length}개 · 글자 ${chars}자 → voice-lines.json`);
console.log('다음: npm run voice:make');
