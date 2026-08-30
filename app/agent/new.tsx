import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppBar, Card, H1, PrimaryButton, Screen, Sub } from '../../src/components/ui';
import { useStore } from '../../src/store';
import { color, family, font, radius, space, TAP_BIG } from '../../src/theme';

/**
 * 매물 올리기 (중개사 화면).
 *
 * 우리에게는 매물 데이터베이스가 없다. 실제 중개 실무에서 매물은 공실 목록이나
 * 사진, 또는 말로 오간다. 그래서 중개사가 자기가 가진 매물을 직접 올리게 한다.
 *
 * 여기서는 이름과 주소만 받는다. 재는 일은 다음 화면에서 하고, 지금 다 채우라고 하면
 * 그 자리에서 앱을 닫는다. 한 번에 하나씩 넘긴다.
 */
export default function NewProperty() {
  const router = useRouter();
  const { addProperty } = useStore();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  const ready = name.trim().length > 0;

  const save = () => {
    if (!ready) return;
    const id = addProperty(name.trim(), address.trim());
    router.replace({ pathname: '/agent/checklist', params: { id } });
  };

  return (
    <Screen
      footer={<PrimaryButton label="다음: 재러 가기" onPress={save} disabled={!ready} />}
    >
      <AppBar title="매물 올리기" badge="중개사" />

      <H1>어떤 매물인가요?</H1>
      <Sub>이름만 넣으셔도 넘어갈 수 있어요</Sub>

      <Card>
        <Text style={s.label}>매물 이름</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="예: 행복빌라 101호"
          placeholderTextColor={color.textMuted}
          style={s.input}
          accessibilityLabel="매물 이름을 넣어주세요"
        />

        <Text style={[s.label, s.gap]}>주소</Text>
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="예: 전북 익산시 ○○동"
          placeholderTextColor={color.textMuted}
          style={s.input}
          accessibilityLabel="주소를 넣어주세요. 비워두셔도 됩니다."
        />
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  label: { fontSize: font.label, fontFamily: family.bold, color: color.text },
  gap: { marginTop: space.xl },
  input: {
    marginTop: space.md,
    height: TAP_BIG,
    borderRadius: radius.button,
    borderWidth: 2,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceSoft,
    paddingHorizontal: space.lg,
    fontSize: font.body,
    fontFamily: family.semibold,
    color: color.text,
  },
});
