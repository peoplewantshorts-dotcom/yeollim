/**
 * 문장을 파일 이름으로 바꾸는 해시.
 *
 * 앱과 음성 생성 스크립트가 같은 규칙으로 이름을 지어야 서로를 찾을 수 있다.
 * 이 함수를 고치면 scripts/make-voice.mjs 의 같은 함수도 똑같이 고쳐야 한다.
 */

/** 앞뒤 공백과 줄바꿈만 정리한다. 문장 내용은 건드리지 않는다. */
export function canon(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** FNV-1a 32비트. 짧은 문장 백여 개를 구분하는 데 충분하다. */
export function lineId(text: string): string {
  const s = canon(text);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
