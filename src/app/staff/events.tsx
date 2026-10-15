import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';

import { BarHeader, Btn, Btns, Card, Chip, Chips, DayStrip, Empty, Field, H, Label, Loading, Page, Scroll, Sec, Small, Tag, Title, Toggle } from '@/components/ui';
import { getEvents, staffDeleteEvent, staffNotify, staffSaveEvent, type ClubEvent } from '@/lib/api';
import * as f from '@/lib/format';
import { useQuery } from '@/lib/use-query';
import { C } from '@/theme';

const KINDS: ClubEvent['kind'][] = ['Competition', 'Social', 'League'];

/** A UK date and HH:MM as an ISO timestamp (handles BST/GMT). */
function ukToIso(day: string, hm: string) {
  const guess = new Date(`${day}T${hm}:00Z`);
  const ukHm = f.time(guess);
  const [gh, gm] = ukHm.split(':').map(Number);
  const [h, m] = hm.split(':').map(Number);
  return new Date(guess.getTime() - ((gh * 60 + gm) - (h * 60 + m)) * 60_000).toISOString();
}

export default function StaffEvents() {
  const { data, reload } = useQuery(getEvents);
  const days = useMemo(() => f.nextDays(60), []);
  const [kind, setKind] = useState<ClubEvent['kind']>('Competition');
  const [title, setTitle] = useState('');
  const [day, setDay] = useState(days[7].iso);
  const [time, setTime] = useState('08:00');
  const [summary, setSummary] = useState('');
  const [format, setFormat] = useState('');
  const [fee, setFee] = useState('');
  const [capacity, setCapacity] = useState('');
  const [pairs, setPairs] = useState(false);
  const [announce, setAnnounce] = useState(true);
  const [busy, setBusy] = useState(false);

  const act = async (fn: () => Promise<unknown>) => {
    try { await fn(); reload(); } catch (e) { Alert.alert('Couldn’t save', (e as Error).message); }
  };

  const create = async () => {
    if (!/^\d{2}:\d{2}$/.test(time)) return Alert.alert('Time should look like 08:00');
    setBusy(true);
    try {
      const starts_at = ukToIso(day, time);
      await staffSaveEvent({
        kind, title: title.trim(), starts_at, summary: summary.trim(), format: format.trim() || null, fee_text: fee.trim() || null,
        capacity: capacity ? Number(capacity) : null, pairs,
        entries_close_at: kind === 'Competition' ? new Date(new Date(starts_at).getTime() - 2 * 86_400_000).toISOString() : null,
      });
      if (announce) {
        await staffNotify({ category: kind === 'Social' ? 'offers' : 'comps', title: `Entry open: ${title.trim()}`, body: `${f.shortDay(starts_at)} · ${summary.trim()}`, link: '/events' });
      }
      setTitle(''); setSummary(''); setFormat(''); setFee(''); setCapacity('');
      reload();
    } catch (e) {
      Alert.alert('Couldn’t save', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <BarHeader title="Events" />
      <Scroll gap={28}>
        <Sec>
          <H>Upcoming & live</H>
          {!data ? <Loading /> : data.length === 0 ? <Empty>No events yet.</Empty> : data.map((e) => (
            <Card key={e.id}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Tag label={e.kind} tone={e.kind === 'Competition' ? 'blue' : e.kind === 'League' ? 'green' : 'gray'} />
                {e.is_live && <Tag label="● Live" tone="green" />}
              </View>
              <Title>{e.title}</Title>
              <Small style={{ color: C.muted }}>
                {f.shortDay(e.starts_at)} · {f.time(e.starts_at)} · {e.entries_count}{e.capacity != null ? ` of ${e.capacity}` : ''} entered
              </Small>
              <Btns>
                {e.kind !== 'Social' && (
                  <Btn label={e.is_live ? 'End live scoring' : 'Start live scoring'} variant={e.is_live ? 'line' : 'gold'} sm
                    onPress={() => act(() => staffSaveEvent({ id: e.id, is_live: !e.is_live }))} />
                )}
                {e.is_live && <Btn label="Leaderboard" variant="line" sm onPress={() => router.push(`/leaderboard/${e.id}`)} />}
                {!e.is_live && (
                  <Btn label="Delete" variant="line" sm onPress={() =>
                    Alert.alert(`Delete ${e.title}?`, e.entries_count ? `${e.entries_count} entries will be removed.` : '', [
                      { text: 'Keep', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => act(() => staffDeleteEvent(e.id)) },
                    ])} />
                )}
              </Btns>
            </Card>
          ))}
        </Sec>

        <Sec>
          <H>Add an event</H>
          <Chips>{KINDS.map((k) => <Chip key={k} label={k} on={kind === k} onPress={() => setKind(k)} />)}</Chips>
          <Field label="Name" value={title} onChange={setTitle} placeholder="e.g. Winter Stableford" />
          <Label>Date</Label>
          <DayStrip days={days} value={day} onChange={setDay} />
          <Field label="Start time (24-hour)" value={time} onChange={setTime} keyboardType="numbers-and-punctuation" />
          <Field label="One-line summary" value={summary} onChange={setSummary} placeholder="e.g. Mixed · Stableford" />
          {kind !== 'Social' && <Field label="Format" value={format} onChange={setFormat} placeholder="e.g. Foursomes, 50% of combined handicap" />}
          <Field label="Entry fee" value={fee} onChange={setFee} placeholder="e.g. £5 per player" />
          <Field label="Places (leave blank for no limit)" value={capacity} onChange={(v) => setCapacity(v.replace(/\D/g, ''))} keyboardType="number-pad" />
          {kind !== 'Social' && <Toggle label="Pairs event" sub="Entrants must name a partner" value={pairs} onChange={setPairs} />}
          <Toggle label="Announce to members" value={announce} onChange={setAnnounce} />
          {kind === 'Competition' && <Small style={{ color: C.muted }}>Entries close two days before the start.</Small>}
          <Btn label="Add event" variant="gold" onPress={create} loading={busy} disabled={!title.trim()} />
        </Sec>
      </Scroll>
    </Page>
  );
}
