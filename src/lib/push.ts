import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let currentToken: string | null = null;

/**
 * Asks permission and saves this phone's push token against the signed-in member.
 * Quietly does nothing where push isn't available (simulators, Expo Go on Android,
 * or before the project is linked to EAS) — notifications still show in the app.
 */
export async function registerForPush() {
  try {
    if (!Device.isDevice) return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Club notifications',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
    if (status !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return;
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    currentToken = data;
    await supabase.rpc('register_push_token', { p_token: data, p_platform: Platform.OS });
  } catch (e) {
    console.warn('Push registration skipped:', e);
  }
}

/** Stops this phone receiving the member's notifications (on sign-out). */
export async function unregisterPush() {
  if (!currentToken) return;
  try {
    await supabase.rpc('unregister_push_token', { p_token: currentToken });
  } catch {}
  currentToken = null;
}
