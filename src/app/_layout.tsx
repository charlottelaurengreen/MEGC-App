import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { SessionProvider, useSession } from '@/lib/session';
import { C } from '@/theme';

SplashScreen.preventAutoHideAsync();

/** Opens the screen a notification points to, whether the app was running or launched by the tap. */
function useNotificationObserver(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const go = (n: Notifications.Notification) => {
      const url = n.request.content.data?.url;
      if (typeof url === 'string') router.push(url as never);
    };
    const last = Notifications.getLastNotificationResponse();
    if (last?.notification) {
      go(last.notification);
      Notifications.clearLastNotificationResponse();
    }
    const sub = Notifications.addNotificationResponseReceivedListener((r) => go(r.notification));
    return () => sub.remove();
  }, [enabled]);
}

function RootNavigator() {
  const { session, member, isLoading } = useSession();
  useNotificationObserver(!isLoading && !!session);

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
        <Stack.Protected guard={!!member?.is_staff}>
          <Stack.Screen name="staff/index" />
          <Stack.Screen name="staff/tee-sheet" />
          <Stack.Screen name="staff/scan" />
          <Stack.Screen name="staff/post" />
          <Stack.Screen name="staff/events" />
          <Stack.Screen name="staff/cards" />
        </Stack.Protected>
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
