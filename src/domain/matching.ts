import type { FactKey, Property, PropertyFacts, Requirement } from './types';

/**
 * 규칙 기반 매칭 판정 엔진.
 *
 * 이 파일에는 AI가 개입하지 않는다. 통화 녹음 분석(LLM·STT)은 facts 를 '채우는'
 * 보조 기능일 뿐이고, 갈 수 있는 집인지 아닌지의 판정은 여기 적힌 규칙만으로 정해진다.
 * AI의 오인식이 판정 결과를 뒤집지 못하게 하려는 분리다.
 *
 * 모르는 값(null)은 절대 추측하지 않는다. '확인 필요'로 남기고,
 * 판정 카드에 '일부 미확인'을 명시해 과신을 막는다.
 */

export type ItemVerdict = 'pass' | 'fixable' | 'fail' | 'unknown';
export type Verdict = 'go' | 'fix' | 'stop';

export interface ItemResult {
  key: FactKey;
  /** 요청서에 인쇄된 문장 그대로 */
  label: string;
  /** 그 문장에서 형광펜을 칠할 부분 */
  emphasis: string;
  verdict: ItemVerdict;
  /** 사용자에게 보여줄 쉬운 말 근거 */
  reason: string;
  /**
   * 고칠 수 있을 때 무엇을 하면 되는지.
   *
   * 당사자가 직접 할 수 있는 일은 거의 없다. 문턱을 없애는 것도 문을 바꾸는 것도
   * 임대인의 허락이 필요하다. 그래서 '이렇게 하면 됩니다'가 아니라
   * '이렇게 요청해 보세요'로 적는다. 실제로 할 수 있는 행동이어야 한다.
   */
  remedy?: string;
  isMust: boolean;
}

export interface MatchResult {
  verdict: Verdict;
  /**
   * '꼭 필요' 중 아직 확인되지 않은 것이 남아 '갈 수 있어요'를 말할 수 없는 상태.
   *
   * 확인 안 된 집을 초록으로 칠하면 앱이 확인하지 않은 안전을 단정하는 셈이 된다.
   * 그래서 통과·부분통과 판정은 근거가 다 모이기 전까지 보류로 표시한다.
   * 반면 '가지 마세요'는 이미 확실히 걸린 조건이 있는 것이므로 보류하지 않는다.
   */
  pending: boolean;
  /** 색에 기대지 않도록 글자로도 같은 정보를 준다 */
  title: string;
  /** 판정 카드 본문 두 줄 */
  lines: string[];
  /** 하단 강조 한 줄 */
  note: string;
  items: ItemResult[];
  /**
   * 맞은 조건의 수.
   *
   * 순위를 매기는 기준이다. 같은 '갈 수 있어요'라도 맞은 조건이 많은 집이
   * 먼저 나와야 한다 — 조건이 더 많이 맞을수록 실제로 살기 편한 집이기 때문이다.
   */
  passCount: number;
  /** 확인되지 않은 '꼭 필요' 항목 수 */
  unknownMustCount: number;
  checkedAt: string | null;
}

/** 판정 3단계의 표시 문구. 색 외에 이 글자와 도형이 함께 나간다. */
export const VERDICT_LABEL: Record<Verdict, string> = {
  go: '갈 수 있어요',
  fix: '조금 고치면 돼요',
  stop: '가지 마세요',
};

/** 색각 이상·흑백 출력에서도 구분되도록 도형을 함께 쓴다. */
export const VERDICT_SHAPE: Record<Verdict, string> = {
  go: '●',
  fix: '▲',
  stop: '■',
};

/** 판정을 아직 말할 수 없을 때의 표시 */
export const PENDING_LABEL = '아직 확인 중이에요';
export const PENDING_SHAPE = '○';

/** 항목 하나를 판정한다. */
function judgeItem(req: Requirement, f: PropertyFacts): ItemResult {
  const isMust = req.priority === 'must';
  const base = { key: req.key, label: req.cardText, emphasis: req.emphasis, isMust };
  const unknown = (what: string): ItemResult => ({
    ...base,
    verdict: 'unknown',
    reason: `${what} 아직 확인 안 됐어요`,
  });

  switch (req.key) {
    /**
     * 현관문 폭.
     *
     * BF 기준은 0.9m 하나뿐이지만 그 값을 그대로 통과선으로 쓰면 국내 원룸이
     * 통째로 탈락한다. 기준을 낮추는 대신 우리 판정 3단계에 얹었다.
     * 90 이상 갈 수 있어요 / 80~90 조금 고치면 돼요 / 80 미만 가지 마세요.
     */
    case 'doorWidth': {
      const cm = f.doorWidthCm;
      if (cm === null) return unknown('현관문 폭은');
      const need = req.threshold ?? 90;
      if (cm >= need) return { ...base, verdict: 'pass', reason: `현관문 폭 ${cm}cm` };
      if (cm >= need - 10) {
        return {
          ...base,
          verdict: 'fixable',
          reason: `현관문 폭이 ${cm}cm예요`,
          remedy: '문을 끝까지 열면 몇 cm 더 나와요',
        };
      }
      return { ...base, verdict: 'fail', reason: `현관문 폭이 ${cm}cm라 좁아요` };
    }

    /** ① 중앙현관문 앞. 경사로가 있으면 계단 수와 상관없이 통과한다. */
    case 'outStep': {
      if (f.outRamp === true) {
        return { ...base, verdict: 'pass', reason: '중앙현관 앞에 경사로가 있어요' };
      }
      const n = f.outStepCount;
      if (n === null) return unknown('중앙현관 앞 계단은');
      const allowed = req.threshold ?? 0;
      if (n <= allowed) {
        return {
          ...base,
          verdict: 'pass',
          reason: n === 0 ? '중앙현관 앞에 계단 없음' : `중앙현관 앞 계단 ${n}칸`,
        };
      }
      // 한 칸이면 경사판을 놓아 넘을 수 있다.
      if (n === 1) {
        return {
          ...base,
          verdict: 'fixable',
          reason: '중앙현관 앞에 계단 한 칸이 있어요',
          remedy: '경사판을 놓아 달라고 요청해 보세요',
        };
      }
      return { ...base, verdict: 'fail', reason: `중앙현관 앞에 계단이 ${n}칸 있어요` };
    }

    /**
     * ② 중앙현관 안쪽 반계단.
     *
     * 승강기가 있어도 여기서 막히면 못 들어간다. 원룸·빌라에서 가장 흔한 함정이라
     * ①과 따로 확인한다. 실내라서 경사판을 놓기 어려워 ①보다 엄하게 본다.
     */
    case 'inStep': {
      const n = f.inStepCount;
      if (n === null) return unknown('중앙현관 안쪽 계단은');
      const allowed = req.threshold ?? 0;
      if (n <= allowed) {
        return {
          ...base,
          verdict: 'pass',
          reason: n === 0 ? '중앙현관 안에 계단 없음' : `중앙현관 안 계단 ${n}칸`,
        };
      }
      return { ...base, verdict: 'fail', reason: `중앙현관 안에 계단이 ${n}칸 있어요` };
    }

    case 'bathroomSill': {
      const cm = f.bathroomSillCm;
      if (cm === null) return unknown('화장실 문턱은');
      const allowed = req.threshold ?? 0;
      if (cm <= allowed) {
        return {
          ...base,
          verdict: 'pass',
          reason: cm === 0 ? '화장실 문턱 없음' : `화장실 문턱 ${cm}cm`,
        };
      }
      if (cm <= 3) {
        return {
          ...base,
          verdict: 'fixable',
          reason: `화장실에 ${cm}cm 문턱이 있어요`,
          remedy: '작은 경사판을 놓아 달라고 요청해 보세요',
        };
      }
      return { ...base, verdict: 'fail', reason: `화장실 문턱이 ${cm}cm예요` };
    }

    /** 화장실 문 폭. 현관을 넘어도 여기서 막히면 혼자 씻지 못한다. */
    case 'bathroomDoor': {
      const cm = f.bathroomDoorCm;
      if (cm === null) return unknown('화장실 문 폭은');
      const need = req.threshold ?? 80;
      if (cm >= need) return { ...base, verdict: 'pass', reason: `화장실 문 폭 ${cm}cm` };
      if (cm >= need - 8) {
        return {
          ...base,
          verdict: 'fixable',
          reason: `화장실 문 폭이 ${cm}cm예요`,
          remedy: '문짝을 접이문으로 바꿔 달라고 요청해 보세요',
        };
      }
      return { ...base, verdict: 'fail', reason: `화장실 문 폭이 ${cm}cm라 좁아요` };
    }

    /** 승강기는 2층 이상일 때만 조건이 된다. 1층이면 물어볼 필요가 없다. */
    case 'elevator': {
      const floor = f.floor;
      if (floor === null) return unknown('몇 층인지는');
      if (floor <= 1) return { ...base, verdict: 'pass', reason: '1층이라 승강기가 필요 없어요' };
      const has = f.hasElevator;
      if (has === null) return unknown('승강기는');
      return has
        ? { ...base, verdict: 'pass', reason: `${floor}층 · 승강기 있음` }
        : { ...base, verdict: 'fail', reason: `${floor}층인데 승강기가 없어요` };
    }
  }
}

/**
 * 요청서와 매물 데이터를 대조해 3단계로 판정한다.
 *
 *  - '꼭 필요' 중 하나라도 fail 이면 → 가지 마세요
 *  - fail 은 없고 fixable 이 있으면 → 조금 고치면 돼요
 *  - '꼭 필요'가 전부 pass 면 → 갈 수 있어요
 *  - unknown 은 판정을 뒤집지 않고 '일부 미확인'으로 덧붙인다
 */
export function match(requirements: Requirement[], property: Property): MatchResult {
  const items = requirements
    .filter((r) => r.cardText.length > 0)
    .map((r) => judgeItem(r, property.facts));

  const musts = items.filter((i) => i.isMust);
  const failed = musts.filter((i) => i.verdict === 'fail');
  const fixable = musts.filter((i) => i.verdict === 'fixable');
  const unknownMusts = musts.filter((i) => i.verdict === 'unknown');

  let verdict: Verdict;
  let lines: string[];
  let note: string;

  if (failed.length > 0) {
    verdict = 'stop';
    lines = failed.slice(0, 2).map((i) => i.reason);
    note = '이 집은 안 가셔도 돼요';
  } else if (fixable.length > 0) {
    verdict = 'fix';
    lines = [fixable[0].reason, fixable[0].remedy ?? ''].filter(Boolean);
    note = '부동산에 요청해 보실 수 있어요';
  } else {
    verdict = 'go';
    const passed = musts.filter((i) => i.verdict === 'pass');
    lines = [passed.map((i) => i.reason).slice(0, 2).join(' · '), '조건이 모두 맞아요'].filter(
      Boolean,
    );
    note = '확인이 끝난 집이에요';
  }

  const pending = verdict !== 'stop' && unknownMusts.length > 0;

  if (pending) {
    // 아직 말할 수 없는 것을 말하지 않는다. 무엇이 남았는지만 알려준다.
    lines = unknownMusts.slice(0, 2).map((i) => i.reason);
    note = `${unknownMusts.length}가지만 더 확인하면 알려드릴게요`;
  }

  return {
    verdict,
    pending,
    title: pending ? PENDING_LABEL : VERDICT_LABEL[verdict],
    lines,
    note,
    items,
    passCount: musts.filter((i) => i.verdict === 'pass').length,
    unknownMustCount: unknownMusts.length,
    checkedAt: property.checkedAt,
  };
}

/**
 * 판정 카드를 소리로 읽어줄 문장 목록으로 만든다.
 *
 * 한 덩어리로 이어 붙이면 미리 만들어 둔 음성을 못 찾아 전부 기계 소리로 읽힌다.
 * 문장으로 나눠 두면 조건 문장처럼 미리 만들어 둔 것은 사람 목소리로 나온다.
 */
export function speakableResult(propertyName: string, r: MatchResult): string[] {
  const musts = r.items.filter((i) => i.isMust);
  const ok = musts.filter((i) => i.verdict === 'pass').map((i) => i.label);
  /*
   * 고칠 항목은 지금 상태에 잰 숫자가 들어 있어 미리 만들어 둘 수 없다.
   * 그 문장을 그대로 읽으면 앞뒤는 사람 목소리인데 가운데만 기계 소리가 나서
   * 오히려 더 어색하다. 숫자는 화면에 보이니 소리로는 조건과 요청만 읽는다.
   */
  const todo = musts
    .filter((i) => i.verdict === 'fixable')
    .flatMap((i) => [i.label, i.remedy].filter(Boolean) as string[]);

  return [
    propertyName,
    ...(r.pending ? [PENDING_LABEL, ...r.lines] : []),
    ...(ok.length ? ['맞는 조건', ...ok] : []),
    ...(todo.length ? ['고치면 되는 것', ...todo] : []),
  ];
}
