import * as Calendar from 'expo-calendar';
import { Alert, Platform } from 'react-native';

/** Opens the phone's own "new event" form, filled in, so the member can save it. */
export async function addToCalendar(ev: { title: string; start: Date; minutes: number; notes?: string }) {
  try {
    const { status } = await Calendar.requestCalendarPermissions();
    if (status !== 'granted') {
      Alert.alert('Calendar access needed', 'Allow calendar access in Settings to add bookings to your calendar.');
      return;
    }
    let calendar;
    if (Platform.OS === 'ios') {
      calendar = Calendar.getDefaultCalendarSync();
    } else {
      const all = await Calendar.getCalendars();
      calendar = all.find((c) => c.isPrimary && c.allowsModifications) ?? all.find((c) => c.allowsModifications);
    }
    if (!calendar) throw new Error('No calendar on this phone accepts new events.');
    await calendar.addEventWithForm({
      title: ev.title,
      startDate: ev.start,
      endDate: new Date(ev.start.getTime() + ev.minutes * 60_000),
      location: 'Merchants of Edinburgh Golf Club, 10 Craighill Gardens, Edinburgh EH10 5PY',
      notes: ev.notes,
    });
  } catch (e) {
    Alert.alert('Couldn’t open your calendar', (e as Error).message);
  }
}
