import type { Href } from 'expo-router';
import { useState } from 'react';
import { Alert, Text } from 'react-native';

import { BarHeader, Btn, Btns, Card, Chip, Chips, Empty, ErrorBox, Label, Loading, Page, Scroll, Small, Tag } from '@/components/ui';
import { cancelLesson, cancelTable, cancelTeeBooking, getMyEntries, getMyLessons, getMyTables, getMyTeeBookings, withdrawFromEvent } from '@/lib/api';
import { addToCalendar } from '@/lib/calendar';
import * as f from '@/lib/format';
import { useQuery } from '@/lib/use-query';
import { C } from '@/theme';

type Item = {
  key: string;
  kind: string;
  tone: 'blue' | 'green' | 'gray';
  at: string;
  title: string;
  detail: string;
  changeHref?: Href;
  cancel?: () => Promise<unknown>;
  cancelLabel?: string;
};

async function load(when: 'upcoming' | 'past'): Promise<Item[]> {
  const [tee, tables, lessons, entries] = await Promise.all([
    getMyTeeBookings(when), getMyTables(when), getMyLessons(when), when === 'upcoming' ? getMyEntries() : Promise.resolve([]),
  ]);
  const items: Item[] = [
    ...tee.map((b): Item => ({
      key: 't' + b.id, kind: 'Tee time', tone: 'blue', at: b.tee_slots.starts_at,
      title: `${f.time(b.tee_slots.starts_at)} · 18 holes`,
      detail: [`${b.players.length} player${b.players.length === 1 ? '' : 's'}`, b.buggy && 'Buggy', b.status === 'cancelled' && 'Cancelled'].filter(Boolean).join(' · '),
      changeHref: '/tee-times', cancel: () => cancelTeeBooking(b.id),
    })),
    ...entries.filter((e) => new Date(e.events.starts_at) > new Date()).map((e): Item => ({
      key: 'e' + e.id, kind: e.events.kind, tone: 'green', at: e.events.starts_at, title: e.events.title,
      detail: e.partner_name ? `Partner: ${e.partner_name}` : e.events.summary,
      changeHref: `/events/${e.event_id}`, cancel: () => withdrawFromEvent(e.event_id), cancelLabel: 'Withdraw',
    })),
    ...tables.map((t): Item => ({
      key: 'd' + t.id, kind: 'Brasserie', tone: 'gray', at: t.starts_at, title: `${f.time(t.starts_at)} · Table for ${t.party_size}`,
      detail: t.status === 'cancelled' ? 'Cancelled' : t.requests ?? 'No special requests',
      changeHref: '/brasserie', cancel: () => cancelTable(t.id),
    })),
    ...lessons.map((l): Item => ({
      key: 'l' + l.id, kind: 'Lesson', tone: 'gray', at: l.starts_at, title: l.lesson_types?.title ?? 'Lesson',
      detail: `${f.time(l.starts_at)} with the club professional`, cancel: () => cancelLesson(l.id),
    })),
  ];
  return items.sort((a, b) => (a.at < b.at ? -1 : 1) * (when === 'upcoming' ? 1 : -1));
}

export default function MyBookings() {
  const [when, setWhen] = useState<'upcoming' | 'past'>('upcoming');
  const { data, error, loading, reload } = useQuery(() => load(when), [when]);

  const confirmCancel = (it: Item) =>
    Alert.alert(`${it.cancelLabel ?? 'Cancel'} this booking?`, `${it.kind} · ${f.longDay(it.at)}`, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: it.cancelLabel ?? 'Cancel booking',
        style: 'destructive',
        onPress: async () => {
          try {
            await it.cancel!();
            reload();
          } catch (e) {
            Alert.alert('Couldn’t cancel', (e as Error).message);
          }
        },
      },
    ]);

  return (
    <Page>
      <BarHeader title="My bookings" />
      <Scroll gap={18} onRefresh={reload} refreshing={loading && !!data}>
        <Chips>
          <Chip label="Upcoming" on={when === 'upcoming'} onPress={() => setWhen('upcoming')} />
          <Chip label="Past" on={when === 'past'} onPress={() => setWhen('past')} />
        </Chips>
        {error ? <ErrorBox message={error} onRetry={reload} /> : !data ? <Loading /> : data.length === 0 ? (
          <Empty>{when === 'upcoming' ? 'Nothing booked yet.' : 'No past bookings.'}</Empty>
        ) : data.map((it) => (
          <Card key={it.key}>
            <Tag label={it.kind} tone={it.tone} />
            <Label style={{ color: C.muted }}>{f.longDay(it.at)}</Label>
            <Text style={{ fontSize: 20, fontWeight: '700', color: C.blue }}>{it.title}</Text>
            <Small style={{ color: C.muted }}>{it.detail}</Small>
            {when === 'upcoming' && it.cancel && (
              <Btns>
                {it.changeHref && <Btn label="Change" variant="line" sm href={it.changeHref} />}
                <Btn label={it.cancelLabel ?? 'Cancel'} variant="line" sm onPress={() => confirmCancel(it)} />
              </Btns>
            )}
            {when === 'upcoming' && (
              <Btn label="Add to calendar" variant="line" sm onPress={() =>
                addToCalendar({ title: `${it.kind} at Merchants: ${it.title}`, start: new Date(it.at), minutes: it.kind === 'Tee time' ? 240 : 120, notes: it.detail })} />
            )}
          </Card>
        ))}
        <Small style={{ color: C.muted }}>Inside 24 hours? Call the pro shop to change a tee time.</Small>
      </Scroll>
    </Page>
  );
}
