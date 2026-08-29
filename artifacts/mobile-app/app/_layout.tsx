import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { I18nManager, Platform, View } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { setBaseUrl } from '@workspace/api-client-react';
import { AppProvider, useApp } from '@/context/AppContext';
import { useTranslation } from '@/hooks/useTranslation';

setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN ?? ''}`);

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { hydrated, onboarding } = useApp();
  const { t, direction } = useTranslation();
  useEffect(() => {
    I18nManager.allowRTL(true);
  }, []);
  useEffect(() => {
    if (hydrated && !onboarding.completed) router.replace('/onboarding');
  }, [hydrated, onboarding.completed]);
  useEffect(() => {
    const openTarget = (target: unknown) => {
      if (typeof target === 'string' && (target === '/notifications' || /^\/(document|action)\/[a-zA-Z0-9._-]+$/.test(target))) router.push(target as never);
    };
    if (Platform.OS === 'web') return;
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => openTarget(response.notification.request.content.data?.target));
    void Notifications.getLastNotificationResponseAsync().then((response) => openTarget(response?.notification.request.content.data?.target));
    return () => subscription.remove();
  }, []);
  return (
    <View style={{ flex: 1, direction }}>
    <Stack screenOptions={{ headerBackTitle: t('common.back') }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="document-details" options={{ headerShown: false }} />
      <Stack.Screen name="scan-review" options={{ headerShown: false }} />
      <Stack.Screen name="document/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="tasks" options={{ headerShown: false }} />
      <Stack.Screen name="action/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="automation" options={{ headerShown: false }} />
      <Stack.Screen name="assistant" options={{ headerShown: false }} />
      <Stack.Screen name="ai-explanation" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="modules" options={{ headerShown: false }} />
      <Stack.Screen name="premium-integrations" options={{ headerShown: false }} />
      <Stack.Screen name="cases/index" options={{ headerShown: false }} />
      <Stack.Screen name="cases/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="export" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="security" options={{ headerShown: false }} />
      <Stack.Screen name="archive" options={{ headerShown: false }} />
      <Stack.Screen name="activity" options={{ headerShown: false }} />
      <Stack.Screen name="contracts" options={{ headerShown: false }} />
      <Stack.Screen name="workspaces" options={{ headerShown: false }} />
      <Stack.Screen name="compare" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
    </Stack>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AppProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </AppProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
