/**
 * voice-lines.json 의 문장을 사람이 읽은 것 같은 목소리로 만들어 앱에 넣는다.
 *
 *   npm run voice:make              # .env.local 의 설정대로
 *   npm run voice:make -- --google  # 구글로 강제
 *   npm run voice:make -- --clova   # 클로바로 강제
 *
 * 한 번 만들어 두면 앱은 인터넷 없이도 그 목소리로 읽는다.
 * 매물 이름처럼 그때그때 달라지는 문장만 기기 음성합성으로 넘어간다.
 */
import { mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import path from 'node:path';

const root = path.join(import.meta.dirname, '..');

/**
 * 키는 .env.local 에서 읽는다.
 *
 * 이 파일은 git 에 올라가지 않는다. 키가 코드나 대화 기록에 남지 않게 하려는 것이다.
 * .env.local.example 을 복사해 쓰면 된다.
 */
const envPath = path.join(root, '.env.local');
if (existsSync(envPath)) {
  for (const raw of readFileSync(envPath, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const at = line.indexOf('=');
    if (at < 1) continue;
    const key = line.slice(0, at).trim();
    const value = line.slice(at + 1).trim().replace(/^["']|["']$/g, '');
    if (value && !process.env[key]) process.env[key] = value;
  }
  console.log('.env.local 에서 설정을 읽었습니다.');
}

const linesPath = path.join(root, 'voice-lines.json');
const outDir = path.join(root, 'assets', 'voice');
const manifestPath = path.join(root, 'src', 'speech', 'clips.ts');

if (!existsSync(linesPath)) {
  console.error('voice-lines.json 이 없습니다. 먼저 npm run voice:lines 를 실행하세요.');
  process.exit(1);
}
const lines = JSON.parse(readFileSync(linesPath, 'utf8'));

/* ── 목소리 만드는 곳 ─────────────────────────────────────── */

const providers = {
  /** 구글 클라우드 음성합성. Chirp3 계열이 가장 자연스럽다. */
  async google(text, voice) {
    const key = process.env.GOOGLE_TTS_KEY;
    if (!key) throw new Error('GOOGLE_TTS_KEY 가 없습니다');
    const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: 'ko-KR', name: voice },
        // 조금 느리게. 급하게 읽으면 알아듣기 어렵다.
        audioConfig: { audioEncoding: 'MP3', speakingRate: 0.95, pitch: 0 },
      }),
    });
    if (!res.ok) throw new Error(`구글 응답 ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const j = await res.json();
    return Buffer.from(j.audioContent, 'base64');
  },

  /** 네이버 클로바 보이스. 한국어 억양이 가장 사람 같다. */
  async clova(text, voice) {
    const id = process.env.CLOVA_ID;
    const secret = process.env.CLOVA_SECRET;
    if (!id || !secret) throw new Error('CLOVA_ID / CLOVA_SECRET 이 없습니다');
    const res = await fetch('https://naveropenapi.apigw.ntruss.com/tts-premium/v1/tts', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'X-NCP-APIGW-API-KEY-ID': id,
        'X-NCP-APIGW-API-KEY': secret,
      },
      body: new URLSearchParams({
        speaker: voice,
        text,
        format: 'mp3',
        speed: '1', // 클로바는 값이 클수록 느리다. 1 = 조금 느리게
      }).toString(),
    });
    if (!res.ok) throw new Error(`클로바 응답 ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return Buffer.from(await res.arrayBuffer());
  },
};

const which = process.argv.includes('--clova')
  ? 'clova'
  : process.argv.includes('--google')
    ? 'google'
    : process.env.CLOVA_ID
      ? 'clova'
      : 'google';

const synth = providers[which];

/**
 * 여자 목소리와 남자 목소리를 각각 한 벌씩 만든다.
 *
 * 어떤 목소리가 편한지는 사람마다 다르다. 앱에서 고를 수 있게 하려면
 * 두 벌이 다 들어 있어야 한다. 82문장 x 2 = 164개, 2,372자다.
 */
const VOICES = {
  female:
    process.env.TTS_VOICE_FEMALE ||
    (which === 'clova' ? 'nara' : 'ko-KR-Chirp3-HD-Leda'),
  male:
    process.env.TTS_VOICE_MALE ||
    (which === 'clova' ? 'jinho' : 'ko-KR-Chirp3-HD-Charon'),
};

if (which === 'google' && !process.env.GOOGLE_TTS_KEY) {
  console.error('\nGOOGLE_TTS_KEY 가 없습니다.');
  console.error('.env.local.example 을 .env.local 로 복사하고 키를 채워 넣으세요.\n');
  process.exit(1);
}

console.log(`\n${which === 'clova' ? '네이버 클로바' : '구글'}`);
console.log(`  여자 목소리  ${VOICES.female}`);
console.log(`  남자 목소리  ${VOICES.male}`);
console.log(`\n문장 ${lines.length}개 x 2 = ${lines.length * 2}개를 만듭니다\n`);

/* ── 만들기 ──────────────────────────────────────────────── */

rmSync(outDir, { recursive: true, force: true });

const made = { female: [], male: [] };
let firstError = null;

for (const [sex, voiceName] of Object.entries(VOICES)) {
  const dir = path.join(outDir, sex);
  mkdirSync(dir, { recursive: true });
  console.log(`[${sex === 'female' ? '여자' : '남자'} — ${voiceName}]`);

  for (let i = 0; i < lines.length; i++) {
    const { id, text } = lines[i];
    const label = text.length > 30 ? text.slice(0, 29) + '…' : text;
    const n = `${String(i + 1).padStart(3)}/${lines.length}`;
    try {
      const audio = await synth(text, voiceName);
      writeFileSync(path.join(dir, `${id}.mp3`), audio);
      made[sex].push(id);
      console.log(`  ${n}  ${label}`);
    } catch (e) {
      // 한 문장이 실패해도 나머지는 만든다. 없는 문장은 기기 음성합성으로 읽힌다.
      console.error(`  ${n}  실패 — ${label}`);
      if (!firstError) {
        firstError = e.message;
        console.error(`       ${e.message}`);
      }
    }
    // 초당 요청 제한에 걸리지 않게 조금 쉰다
    await new Promise((r) => setTimeout(r, 110));
  }
  console.log('');
}

/* ── 목록 파일 다시 쓰기 ──────────────────────────────────── */

const block = (sex) =>
  made[sex].map((id) => `    '${id}': require('../../assets/voice/${sex}/${id}.mp3'),`).join('\n');

writeFileSync(
  manifestPath,
  `/**
 * 미리 만들어 둔 음성 파일 목록.
 *
 * 이 파일은 손으로 고치지 않는다. 아래 명령이 다시 써 준다.
 *
 *     npm run voice:lines    # 앱이 읽어주는 고정 문장을 전부 모은다
 *     npm run voice:make     # 그 문장들을 음성 파일로 만들고 이 파일을 갱신한다
 *
 * 여기 없는 문장은 기기에 깔린 음성합성으로 읽는다.
 */

export type VoiceSex = 'female' | 'male';

/** 목소리 → 문장 해시 → 번들에 들어간 음성 파일 */
export const CLIPS: Record<VoiceSex, Record<string, number>> = {
  female: {
${block('female')}
  },
  male: {
${block('male')}
  },
};

/** 어떤 목소리로 몇 개나 만들어 뒀는지. 확인용이다. */
export const CLIP_INFO = {
  provider: ${JSON.stringify(which)},
  female: ${JSON.stringify(VOICES.female)},
  male: ${JSON.stringify(VOICES.male)},
  count: { female: ${made.female.length}, male: ${made.male.length} },
  builtAt: ${JSON.stringify(new Date().toISOString().slice(0, 10))},
};
`,
  'utf8',
);

const total = made.female.length + made.male.length;
console.log(`${total}/${lines.length * 2}개 완료 → assets/voice/`);
if (total < lines.length * 2) {
  console.log(`만들지 못한 ${lines.length * 2 - total}개는 기기 음성합성으로 읽힙니다.`);
}
