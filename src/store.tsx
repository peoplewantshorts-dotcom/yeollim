import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SEED_PROPERTIES } from './domain/seed';

/**
 * 시연용 매물에 딸린 사진.
 *
 * 이 사진들은 기기에 없고 앱에 함께 들어 있다. 도메인(seed)은 자산 파일을
 * 들고 있지 않아야 판정 규칙만 따로 떼어 시험할 수 있으므로 여기서 붙인다.
 */
const SEED_MEDIA: Record<string, Media[]> = {
  p1: [
    { uri: '', kind: 'image', asset: require('../assets/p1-ramp.jpg') },
    { uri: '', kind: 'image', asset: require('../assets/p1-door.jpg') },
    { uri: '', kind: 'image', asset: require('../assets/p1-sill.jpg') },
  ],
  p2: [
    { uri: '', kind: 'image', asset: require('../assets/p2-entry.jpg') },
    { uri: '', kind: 'image', asset: require('../assets/p2-door.jpg') },
    { uri: '', kind: 'image', asset: require('../assets/p2-sill.jpg') },
    { uri: '', kind: 'image', asset: require('../assets/p2-bath.jpg') },
  ],
};

const seeded: Property[] = SEED_PROPERTIES.map((p) => ({
  ...p,
  media: SEED_MEDIA[p.id] ?? p.media,
}));
import { emptyFacts } from './domain/types';
import type { Media, Property, PropertyFacts, RequestCard, UserProfile } from './domain/types';

// 프로필과 매물 데이터 구조가 바뀌었다. 예전에 저장된 값을 그대로 읽으면
// 없는 항목을 참조하다 판정이 어긋나므로 저장 키를 올려 새로 시작한다.
const KEY = 'yeollim.state.v11';

export type Role = 'user' | 'agent';

/** 읽어주는 목소리. 어느 쪽이 편한지는 사람마다 다르므로 고를 수 있게 둔다. */
export type VoiceSex = 'female' | 'male';

interface AppState {
  role: Role | null;
  userName: string;
  voiceSex: VoiceSex;
  /** 읽는 속도. 1 이 기본, 0.8 이면 조금 느리게 */
  voiceRate: number;
  /** 움직이는 안내를 끄고 싶을 때. 자폐성 장애 사용자에게 필요한 설정이다. */
  reduceMotion: boolean;
  profile: UserProfile | null;
  properties: Property[];
  requests: RequestCard[];
}

const initial: AppState = {
  role: null,
  userName: '이○○',
  voiceSex: 'female',
  voiceRate: 1,
  reduceMotion: false,
  profile: null,
  properties: seeded,
  requests: [],
};

interface Store extends AppState {
  ready: boolean;
  setRole: (r: Role) => void;
  setVoiceSex: (v: VoiceSex) => void;
  setVoiceRate: (r: number) => void;
  setReduceMotion: (v: boolean) => void;
  saveProfile: (p: UserProfile) => void;
  sendRequest: () => RequestCard | null;
  /** 중개사가 확인 질문에 답하거나 통화 분석 결과를 저장할 때 */
  updateFacts: (propertyId: string, facts: PropertyFacts) => void;
  /** 판정에 쓰지 않는 매물 정보(메모·가격)를 갱신한다. */
  updateInfo: (propertyId: string, patch: Partial<Pick<Property, 'memo' | 'depositMan' | 'rentMan' | 'media' | 'nearby'>>) => void;
  /** 중개사가 매물을 직접 올릴 때. 우리에게는 매물 데이터베이스가 없다. */
  addProperty: (name: string, address: string) => string;
  /** 당사자가 보러 가겠다고 고른 집을 요청서에 담는다. */
  setVisitIds: (ids: string[]) => void;
  reset: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<AppState>;
          // 읽는 속도 단계를 좁혔다. 예전에 저장된 값이 그대로면 어느 칸도 안 켜진다.
          const saved = parsed.voiceRate ?? 1;
          const rate = [0.9, 1, 1.1].includes(saved) ? saved : 1;
          setState({ ...initial, ...parsed, voiceRate: rate });
        }
      } catch {
        // 저장된 값을 못 읽어도 앱은 그냥 처음 상태로 뜬다.
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
  }, [state, ready]);

  const value = useMemo<Store>(
    () => ({
      ...state,
      ready,
      setRole: (role) => setState((s) => ({ ...s, role })),
      setVoiceSex: (voiceSex) => setState((s) => ({ ...s, voiceSex })),
      setVoiceRate: (voiceRate) => setState((s) => ({ ...s, voiceRate })),
      setReduceMotion: (reduceMotion) => setState((s) => ({ ...s, reduceMotion })),
      saveProfile: (profile) => setState((s) => ({ ...s, profile })),
      sendRequest: () => {
        let created: RequestCard | null = null;
        // setState 콜백 안에서 채워지므로 타입을 좁히지 않는다
        setState((s) => {
          if (!s.profile) return s;
          created = {
            id: `r${Date.now()}`,
            userName: s.userName,
            mobility: s.profile.mobility,
            contact: s.profile.contact,
            terms: s.profile.terms,
            requirements: s.profile.requirements,
            sentAt: new Date().toISOString(),
            propertyIds: s.properties.map((p) => p.id),
            visitIds: [],
          };
          return { ...s, requests: [created as RequestCard, ...s.requests] };
        });
        return created;
      },
      updateFacts: (propertyId, facts) =>
        setState((s) => ({
          ...s,
          properties: s.properties.map((p) =>
            p.id === propertyId
              ? { ...p, facts, checkedAt: new Date().toISOString().slice(0, 10) }
              : p,
          ),
        })),
      updateInfo: (propertyId, patch) =>
        setState((s) => ({
          ...s,
          properties: s.properties.map((p) => (p.id === propertyId ? { ...p, ...patch } : p)),
        })),
      addProperty: (name, address) => {
        const id = `p${Date.now()}`;
        setState((s) => ({
          ...s,
          properties: [
            ...s.properties,
            {
            id,
            name,
            address,
            checkedAt: null,
            memo: '',
            depositMan: null,
            rentMan: null,
            media: [],
            nearby: '',
            facts: emptyFacts(),
          },
          ],
        }));
        return id;
      },
      setVisitIds: (ids) =>
        setState((s) => ({
          ...s,
          requests: s.requests.map((r, i) => (i === 0 ? { ...r, visitIds: ids } : r)),
        })),
      reset: () => setState(initial),
    }),
    [state, ready],
  );

  // 저장된 값을 다 읽기 전에는 화면을 그리지 않는다.
  // 먼저 그리면 화면이 '아직 아무것도 없는 상태'를 붙잡아 버리고,
  // 그대로 저장하는 순간 중개사가 이미 확인해 둔 매물 정보가 지워진다.
  return <Ctx.Provider value={value}>{ready ? children : null}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error('StoreProvider 안에서만 useStore 를 쓸 수 있습니다.');
  return v;
}
