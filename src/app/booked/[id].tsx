import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Body, Btn, Display, GoldRule, KV, Loading, Panel } from '@/components/ui';
import { getTeeBooking } from '@/lib/api';
import { addToCalendar } from '@/lib/calendar';
import * as f from '@/lib/format';
import { useQuery } from '@/lib/use-query';
import { C } from '@/theme';

export default function Booked() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data: b } = useQuery(() => getTeeBooking(id), [id]);

  const start = b ? new Date(b.tee_slots.starts_at) : null;
  const names = b?.players.map((p) => p.name) ?? [];
  const who = names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.blue }}
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', gap: 28, paddingHorizontal: 28, paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 }}>
      {!b || !start ? <Loading /> : (
        <>
          <View style={{ alignItems: 'center', gap: 20 }}>
            <View style={{ width: 76, height: 76, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={40} color={C.blue} strokeWidth={2} />
            </View>
            <Display>You’re booked</Display>
            <GoldRule />
            <Body style={{ color: C.dim, textAlign: 'center' }}>
              {f.longDay(start)} at {f.time(start)}.{'\n'}{who}.{b.buggy ? ' Buggy reserved.' : ''}
            </Body>
          </View>
          <Panel style={{ backgroundColor: C.blueLift }}>
            <KV onBlue k="Check in from" v={`${f.time(new Date(start.getTime() - 30 * 60_000))} at the pro shop`} />
            <KV onBlue k="Charged to" v="Member account" />
          </Panel>
          <View style={{ gap: 10 }}>
            <Btn label="Add to calendar" variant="onblue" onPress={() =>
              addToCalendar({ title: 'Golf at Merchants', start, minutes: 240, notes: `${who}${b.buggy ? ' · Buggy booked' : ''}` })} />
            <Btn label="View my bookings" variant="gold" onPress={() => router.replace('/bookings')} />
            <Btn label="Back to home" variant="ghostblue" onPress={() => router.dismissTo('/')} />
          </View>
        </>
      )}
    </ScrollView>
  );
}
