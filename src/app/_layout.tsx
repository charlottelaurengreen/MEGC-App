import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { SessionProvider, useSession } from '@/lib/session';
import { C } from '@/theme';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { session, isLoading } = useSession();

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync();
  }, [isLoading]);

  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.white } }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="book/[slotId]" />
        <Stack.Screen name="booked/[id]" options={{ gestureEnabled: false }} />
        <Stack.Screen name="bookings" />
        <Stack.Screen name="check-in" />
        <Stack.Screen name="news" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="events/[id]" />
        <Stack.Screen name="leaderboard/[id]" />
        <Stack.Screen name="brasserie" />
        <Stack.Screen name="lessons" />
        <Stack.Screen name="scorecard" />
        <Stack.Screen name="handicap" />
        <Stack.Screen name="account" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="light" />
      <RootNavigator />
    </SessionProvider>
  );
}
