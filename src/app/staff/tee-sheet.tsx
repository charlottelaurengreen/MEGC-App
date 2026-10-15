import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { BarHeader, Btn, Btns, DayStrip, Empty, ErrorBox, Loading, Page, Scroll, Small, Tag } from '@/components/ui';
import { staffBlockSlot, staffCancelBooking, staffCheckIn, staffTeeSheet, type StaffSlot } from '@/lib/api';
import * as f from '@/lib/format';
import { useQuery } from '@/lib/use-query';
import { C } from '@/theme';

const BLOCK_REASONS = ['Competition', 'Society booking', 'Course maintenance', 'Other'];

export default function StaffTeeSheet() {
  const days = useMemo(() => f.nextDays(14), []);
  const [day, setDay] = useState(days[0].iso);
  const [open, setOpen] = useState<string | null>(null);
  const { data, error, reload, loading } = useQuery(() => staffTeeSheet(day), [day]);

  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      reload();
    } catch (e) {
      Alert.alert('Couldn’t update', (e as Error).message);
    }
  };

  const block = (s: StaffSlot) =>
    Alert.alert(`Block ${f.time(s.starts_at)}?`, 'Members won’t be able to book it.', [
      ...BLOCK_REASONS.map((r) => ({ text: r, onPress: () => act(() => staffBlockSlot(s.slot_id, r)) })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);

  const booked = (data ?? []).reduce((a, s) => a + s.bookings.reduce((b, x) => b + x.players.length, 0), 0);
  const checkedIn = (data ?? []).reduce((a, s) => a + s.bookings.filter((b) => b.checked_in_at).length, 0);

  return (
    <Page>
      <BarHeader title="Tee sheet" />
      <Scroll gap={18} onRefresh={reload} refreshing={loading && !!data}>
        <DayStrip days={days} value={day} onChange={setDay} />
        {data && <Small style={{ color: C.muted }}>{booked} players booked · {checkedIn} groups checked in</Small>}
        {error ? <ErrorBox message={error} onRetry={reload} /> : !data ? <Loading /> : data.length === 0 ? (
          <Empty>No tee times set up for this day.</Empty>
        ) : (
          <View style={{ borderTopWidth: 1, borderTopColor: C.gray }}>
            {data.map((s) => {
              const players = s.bookings.reduce((a, b) => a + b.players.length, 0);
              const expanded = open === s.slot_id;
              return (
                <View key={s.slot_id} style={st.slot}>
                  <Text onPress={() => setOpen(expanded ? null : s.slot_id)} style={st.head} accessibilityRole="button">
                    <Text style={st.time}>{f.time(s.starts_at)}   </Text>
                    <Text style={{ color: C.muted }}>
                      {s.blocked_reason ?? (players ? `${players}/${s.capacity} · ${s.bookings.map((b) => b.booker.split(' ').pop()).join(', ')}` : 'Free')}
                    </Text>
                  </Text>
                  {expanded && (
                    <View style={{ gap: 12, paddingTop: 10 }}>
                      {s.bookings.map((b) => (
                        <View key={b.id} style={{ gap: 6 }}>
                          <Text style={{ fontSize: 15, fontWeight: '700', color: C.blue }}>{b.booker} · No. {b.member_no}</Text>
                          <Small style={{ color: C.muted }}>
                            {b.players.map((p) => p.name + (p.kind === 'guest' ? ' (guest)' : '')).join(', ')}
                            {b.buggy ? ' · Buggy' : ''}{b.trolley ? ' · Trolley' : ''}
                          </Small>
                          {b.checked_in_at ? <Tag label={`Checked in ${f.time(b.checked_in_at)}`} tone="green" /> : (
                            <Btns>
                              <Btn label="Check in" variant="gold" sm onPress={() => act(() => staffCheckIn(b.id))} />
                              <Btn label="Cancel" variant="line" sm onPress={() =>
                                Alert.alert('Cancel this booking?', b.booker, [
                                  { text: 'Keep', style: 'cancel' },
                                  { text: 'Cancel booking', style: 'destructive', onPress: () => act(() => staffCancelBooking(b.id)) },
                                ])} />
                            </Btns>
                          )}
                        </View>
                      ))}
                      {s.blocked_reason ? (
                        <Btn label="Unblock this time" variant="line" sm onPress={() => act(() => staffBlockSlot(s.slot_id, null))} />
                      ) : (
                        <Btn label="Block this time" variant="line" sm onPress={() => block(s)} />
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </Scroll>
    </Page>
  );
}

const st = StyleSheet.create({
  slot: { paddingVertical: 12, paddingHorizontal: 2, borderBottomWidth: 1, borderBottomColor: C.gray },
  head: { fontSize: 14, minHeight: 28 },
  time: { fontSize: 17, fontWeight: '700', color: C.blue },
});
