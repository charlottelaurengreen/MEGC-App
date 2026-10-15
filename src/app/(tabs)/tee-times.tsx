import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Btn, Chip, Chips, DayStrip, Empty, ErrorBox, H, Loading, Note, Page, Scroll, Sec, Small, Tag, TopHeader } from '@/components/ui';
import { getSettings, getTeeSheet, type SheetSlot } from '@/lib/api';
import * as f from '@/lib/format';
import { useQuery } from '@/lib/use-query';
import { C } from '@/theme';

const PLAYERS = [
  { label: 'Any', n: 1 },
  { label: '1 player', n: 1 },
  { label: '2 players', n: 2 },
  { label: '4 players', n: 4 },
];

export default function TeeTimes() {
  const days = useMemo(() => f.nextDays(14), []);
  const [day, setDay] = useState(days[0].iso);
  const [pIdx, setPIdx] = useState(0);
  const { data: settings } = useQuery(getSettings);
  const { data, error, loading, reload } = useQuery(async () => {
    const rows = await getTeeSheet(day);
    const cutoff = Date.now() - 10 * 60_000; // hide times that have already gone
    return rows.filter((s) => new Date(s.starts_at).getTime() > cutoff);
  }, [day]);

  const need = PLAYERS[pIdx].n;
  const slots = data ?? [];

  return (
    <Page>
      <TopHeader title="Tee times" subtitle="Book, change or cancel without calling the pro shop." />
      <Scroll gap={22} onRefresh={reload} refreshing={loading && !!data}>
        <DayStrip days={days} value={day} onChange={setDay} />
        <Chips>
          {PLAYERS.map((p, i) => <Chip key={p.label} label={p.label} on={pIdx === i} onPress={() => setPIdx(i)} />)}
        </Chips>
        {settings && (
          <Note>
            Members can book up to {settings.member_advance_days} days ahead. Free cancellation up to {settings.cancel_hours} hours before.
          </Note>
        )}
        <Sec>
          <H>{f.longDay(day + 'T12:00:00Z')}</H>
          {error ? <ErrorBox message={error} onRetry={reload} /> : !data ? <Loading /> : slots.length === 0 ? (
            <Empty>No tee times are open for this day.</Empty>
          ) : (
            <View style={{ borderTopWidth: 1, borderTopColor: C.gray }}>
              {slots.map((s) => <Slot key={s.slot_id} s={s} need={need} />)}
            </View>
          )}
        </Sec>
      </Scroll>
    </Page>
  );
}

function Slot({ s, need }: { s: SheetSlot; need: number }) {
  const left = s.capacity - s.booked;
  const mine = !!s.my_booking_id;
  const open = !s.blocked_reason && left >= need && !mine;
  const title = mine ? 'Your booking' : s.blocked_reason ?? (left <= 0 ? 'Fully booked' : `${left} space${left === 1 ? '' : 's'}`);
  const sub = mine ? `${s.booked} player${s.booked === 1 ? '' : 's'} booked` : s.blocked_reason ? 'Not available' : left <= 0 ? `${s.capacity} players` : left < s.capacity ? `Join a ${s.booked}-ball` : 'Members & guests';
  const t = f.time(s.starts_at);

  return (
    <View style={st.slot}>
      <Text style={st.time}>{t}</Text>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: C.blue }}>{title}</Text>
        <Small style={{ color: C.muted }}>{sub}</Small>
      </View>
      {mine ? (
        <Btn label="Yours" sm href="/bookings" />
      ) : open ? (
        <Btn label="Book" variant="gold" sm accessibilityLabel={`Book ${t}`} onPress={() => router.push({ pathname: '/book/[slotId]', params: { slotId: s.slot_id } })} />
      ) : (
        <Tag label="Full" />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  slot: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 2, borderBottomWidth: 1, borderBottomColor: C.gray, minHeight: 68 },
  time: { width: 64, fontSize: 19, fontWeight: '700', color: C.blue },
});
