import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Accent,
  AppBar,
  Card,
  GhostButton,
  H1,
  PrimaryButton,
  Screen,
  Sub,
} from '../../src/components/ui';
import {
  analyzeTranscript,
  applyExtractions,
  CONFIDENCE_FLOOR,
  mmss,
} from '../../src/domain/callAnalysis';
import { SAMPLE_TRANSCRIPT } from '../../src/domain/seed';
import type { CallExtraction } from '../../src/domain/types';
import { useStore } from '../../src/store';
import { color, family, font, radius, space } from '../../src/theme';

/**
 * 통화 녹음 자동 분석 (중개사 화면 · 보조 기능).
 *
 * 기본 입력은 어디까지나 탭이고, 이 화면은 그것을 대신하지 않는다.
 * 뽑아낸 항목마다 판단 근거가 된 발화와 시각을 함께 보여 즉시 검수할 수 있게 하며,
 * 확신도가 낮으면 채우지 않고 '확인 필요'로 남긴다.
 * 틀린 정보를 채우지 않는 것이 원칙이다.
 */
export default function CallAnalysis() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { properties, updateFacts } = useStore();
  const property = properties.find((p) => p.id === id);

  const [analyzed, setAnalyzed] = useState(false);
  const extractions = useMemo(() => analyzeTranscript(SAMPLE_TRANSCRIPT), []);
  const found = extractions.filter((e) => e.value !== null && e.confidence >= CONFIDENCE_FLOOR);
  const pending = extractions.filter((e) => e.value === null || e.confidence < CONFIDENCE_FLOOR);

  if (!property) {
    return (
      <Screen>
        <AppBar title="통화 분석" badge="중개사" />
        <H1>매물을 찾을 수 없어요</H1>
        <View style={{ height: space.xl }} />
        <PrimaryButton label="목록으로" onPress={() => router.replace('/agent')} />
      </Screen>
    );
  }

  if (!analyzed) {
    return (
      <Screen
        footer={<PrimaryButton label="이 통화 분석하기" onPress={() => setAnalyzed(true)} />}
      >
        <AppBar title="통화 분석" badge="중개사" />
        <H1>분석할 통화를 골라주세요</H1>
        <Sub>이미 갖고 계신 녹음 파일만 씁니다. 앱이 통화를 엿듣거나 자동으로 모으지 않아요.</Sub>

        <Card>
          <View style={s.fileRow}>
            <Text style={s.fileName}>임대인 김○○ 통화</Text>
            <Text style={s.fileMeta}>14:20 · 3분</Text>
          </View>
          <Text style={s.fileSub}>{property.name}</Text>
        </Card>

        <View style={s.privacy}>
          <Text style={s.privacyTitle}>보내기 전에 이렇게 처리해요</Text>
          <Text style={s.privacyLine}>· 전화번호와 이름은 자동으로 가려요</Text>
          <Text style={s.privacyLine}>· 글자로 옮긴 뒤 녹음 원본은 바로 지워요</Text>
          <Text style={s.privacyLine}>· 확실하지 않은 항목은 채우지 않고 비워 둬요</Text>
        </View>
      </Screen>
    );
  }

  const save = () => {
    updateFacts(property.id, applyExtractions(property.facts, extractions, SAMPLE_TRANSCRIPT));
    router.replace('/agent');
  };

  return (
    <Screen
      footer={
        <>
          <PrimaryButton label="이대로 저장하기" onPress={save} />
          <GhostButton
            label="직접 고쳐서 입력할게요"
            onPress={() => router.replace({ pathname: '/agent/checklist', params: { id: property.id } })}
          />
        </>
      }
    >
      <AppBar title="통화 분석" badge="중개사" />

      <H1>
        통화에서 <Accent>{found.length}가지</Accent>를 찾았어요
      </H1>
      <Sub>맞는지 확인만 해주세요</Sub>

      <Card style={s.headCard}>
        <View style={s.fileRow}>
          <Text style={s.fileName}>임대인 김○○ 통화</Text>
          <Text style={s.fileMeta}>14:20 · 3분</Text>
        </View>
      </Card>

      {found.map((e) => (
        <ResultCard key={e.key} item={e} />
      ))}
      {pending.map((e) => (
        <ResultCard key={e.key} item={e} />
      ))}
    </Screen>
  );
}

function ResultCard({ item }: { item: CallExtraction }) {
  // 불리언을 여기서 해석하지 않는다. 뜻이 뒤집히지 않도록 엔진이 준 말을 그대로 쓴다.
  const confident = item.stateLabel !== null && item.confidence >= CONFIDENCE_FLOOR;
  const state = confident ? item.stateLabel : '확인 필요';
  const tone = confident ? color.goText : color.fixText;

  return (
    <Card>
      <Text style={s.itemHead}>
        {item.label} · <Text style={{ color: tone, fontFamily: family.extrabold }}>{state}</Text>
      </Text>

      {confident ? (
        <View style={s.quoteBox}>
          <Text style={s.quote}>
            “{item.quote}”
            {item.atSecond !== null ? (
              <Text style={s.quoteAt}> · {mmss(item.atSecond)}</Text>
            ) : null}
          </Text>
        </View>
      ) : (
        <>
          <View style={s.emptyBox}>
            <Text style={s.emptyText}>
              {item.quote ? `“${item.quote}”` : '통화에 답이 없었어요'}
            </Text>
          </View>
          <Text style={s.nudge}>→ 임장 때 확인하거나 직접 입력</Text>
        </>
      )}
    </Card>
  );
}

const s = StyleSheet.create({
  headCard: { paddingVertical: space.lg },
  fileRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fileName: { fontSize: font.body, fontFamily: family.bold, color: color.text },
  fileMeta: { fontSize: font.caption, color: color.textMuted, fontFamily: family.regular },
  fileSub: { marginTop: space.sm, fontSize: font.caption, color: color.textMuted, fontFamily: family.regular },

  itemHead: { fontSize: font.body, fontFamily: family.bold, color: color.text },
  quoteBox: {
    marginTop: space.lg,
    backgroundColor: color.primarySoft,
    borderRadius: radius.button,
    padding: space.lg,
  },
  quote: { fontSize: font.caption + 1, lineHeight: (font.caption + 1) * 1.5, color: color.onPrimarySoft, fontFamily: family.semibold },
  quoteAt: { color: color.textMuted, fontFamily: family.semibold },

  emptyBox: {
    marginTop: space.lg,
    backgroundColor: color.surfaceSoft,
    borderRadius: radius.button,
    padding: space.lg,
  },
  emptyText: { fontSize: font.caption + 1, color: color.textMuted, fontFamily: family.semibold },
  nudge: { marginTop: space.md, fontSize: font.caption + 1, color: color.primaryText, fontFamily: family.bold },

  privacy: {
    marginTop: space.xxl,
    backgroundColor: color.surfaceSoft,
    borderRadius: radius.card,
    padding: space.xl,
  },
  privacyTitle: { fontSize: font.label, fontFamily: family.extrabold, color: color.text },
  privacyLine: {
    marginTop: space.sm,
    fontSize: font.caption + 1,
    lineHeight: (font.caption + 1) * 1.5,
    color: color.textSub, fontFamily: family.regular },
});
