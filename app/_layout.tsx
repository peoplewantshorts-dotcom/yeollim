import React, { useCallback } from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider } from '../src/store';
import { color } from '../src/theme';

// 서체가 준비되기 전에 화면이 뜨면 기본 글꼴로 한 번 그렸다가 바뀌면서 글자가 튄다.
// 준비될 때까지 스플래시를 붙잡아 둔다.
SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * 로고만 보이는 첫 화면을 최소 이 시간만큼은 띄운다.
 *
 * 서체가 빨리 읽히면 스플래시가 깜빡하고 지나가 버린다. 그러면 무엇을 여는
 * 앱인지 알아볼 새가 없고, 화면이 갑자기 바뀌는 것 자체가 부담이 되는 분도 있다.
 * 잠깐 머물렀다 넘어가게 한다.
 */
const SPLASH_MIN_MS = 1000;
const startedAt = Date.now();

/**
 * 웹에서 볼 때 폰 크기로 가둔다.
 *
 * 브라우저 창은 가로로 넓어서 화면이 실제 폰과 전혀 다르게 보인다. 그 상태로
 * 다듬으면 폰에서 다시 깨진다. 웹에서만 폭을 폰 크기로 묶고 가운데에 세운다.
 * 안드로이드에서는 아무 영향이 없다.
 */
const PHONE_W = 390;
const PHONE_H = 844;

function PhoneFrame({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  if (Platform.OS !== 'web' || width <= PHONE_W + 40) return <>{children}</>;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E7E4EE' }}>
      <View
        style={{
          width: PHONE_W,
          height: Math.min(PHONE_H, height - 32),
          overflow: 'hidden',
          borderRadius: 36,
          backgroundColor: color.bg,
          boxShadow: '0 18px 60px rgba(40,32,70,0.28)',
        }}
      >
        {children}
      </View>
    </View>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'Pretendard-Regular': require('../assets/fonts/Pretendard-Regular.ttf'),
    'Pretendard-SemiBold': require('../assets/fonts/Pretendard-SemiBold.ttf'),
    'Pretendard-Bold': require('../assets/fonts/Pretendard-Bold.ttf'),
    'Pretendard-ExtraBold': require('../assets/fonts/Pretendard-ExtraBold.ttf'),
  });

  const onReady = useCallback(() => {
    const left = SPLASH_MIN_MS - (Date.now() - startedAt);
    const hide = () => SplashScreen.hideAsync().catch(() => {});
    if (left > 0) setTimeout(hide, left);
    else hide();
  }, []);

  // 서체를 못 읽어도 앱은 떠야 한다. 기본 글꼴로 내려간다.
  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <StoreProvider>
        <PhoneFrame>
        <View style={{ flex: 1 }} onLayout={onReady}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: color.bg },
              /*
               * 화면이 옆으로 탁 밀려 나가면 끊긴 느낌이 든다. 특히 화면 하나에
               * 오래 머무는 이 앱에서는 그 단절이 크게 느껴진다. 스며들 듯 바뀌게 둔다.
               */
              animation: 'fade',
              animationDuration: 420,
              // 옆으로 밀어 뒤로 가기. 손이 화면 위쪽까지 닿지 않는 사용자에게는
              // 버튼보다 제스처가 훨씬 편한 경로다.
              gestureEnabled: true,
              gestureDirection: 'horizontal',
            }}
          />
        </View>
        </PhoneFrame>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
