import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { Band, BarHeader, Btn, Card, Chip, Chips, Display, ErrorBox, H, KV, Label, Loading, Page, Panel, Scroll, Sec, Small, Stepper } from '@/components/ui';
import { enterEvent, getEvent, getMyEntry, withdrawFromEvent } from '@/lib/api';
import * as f from '@/lib/format';
import { useQuery } from '@/lib/use-query';
import { C } from '@/theme';

const STARTS = ['Early', 'Mid-morning', 'Late', 'No preference'];

export default function EventEntry() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, reload } = useQuery(async () => {
    const [ev, entry] = await Promise.all([getEvent(id), getMyEntry(id)]);
    return { ev, entry };
  }, [id]);
  const [partner, setPartner] = useState('');
  const [start, setStart] = useState(3);
  const [places, setPlaces] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (error) return <Page><BarHeader title="Event" /><Scroll><ErrorBox message={error} onRetry={reload} /></Scroll></Page>;
  if (!data) return <Page><BarHeader title="Event" /><Loading /></Page>;
  const { ev, entry } = data;
  const isComp = ev.kind !== 'Social';
  const closed = !!ev.entries_close_at && new Date(ev.entries_close_at) < new Date();
  const left = ev.capacity == null ? null : ev.capacity - ev.entries_count;

  const act = (fn: () => Promise<unknown>) => async () => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <BarHeader title={ev.kind} />
      <Scroll gap={24}>
        <Panel>
          <Label style={{ color: C.gold }}>{f.longDay(ev.starts_at)} · {f.time(ev.starts_at)}</Label>
          <Display>{ev.title}</Display>
          <Small style={{ color: C.dim }}>{ev.format ?? ev.summary}</Small>
        </Panel>
        <Card>
          {ev.fee_text && <KV k="Entry fee" v={ev.fee_text} />}
          {ev.entries_close_at && <KV k="Entries close" v={`${f.shortDay(ev.entries_close_at)}, ${f.time(ev.entries_close_at)}`} />}
          {ev.capacity != null && <KV k="Places" v={`${ev.entries_count} of ${ev.capacity} taken`} />}
          {ev.prizes && <KV k="Prizes" v={ev.prizes} />}
          {!ev.fee_text && !ev.entries_close_at && ev.capacity == null && !ev.prizes && <Small>{ev.summary}</Small>}
        </Card>

        {entry ? (
          <>
            <Band icon="check" title={ev.pairs && entry.partner_name ? `You’re entered with ${entry.partner_name}` : 'You’re entered'}
              sub={isComp ? 'We’ll notify you when the draw is out.' : 'See you there.'} />
            {!closed && <Btn label="Withdraw" variant="line" onPress={act(() => withdrawFromEvent(ev.id))} loading={busy} />}
          </>
        ) : closed ? (
          <Small style={{ color: C.muted }}>Entries have closed. Contact the club office if you’d still like to play.</Small>
        ) : left !== null && left <= 0 ? (
          <Small style={{ color: C.muted }}>This event is full.</Small>
        ) : (
          <Sec>
            <H>Your entry</H>
            {ev.pairs && (
              <>
                <Label>Partner’s name</Label>
                <TextInput value={partner} onChangeText={setPartner} autoCapitalize="words" placeholder="e.g. Fiona Mackay" placeholderTextColor={C.faint} style={st.input} />
              </>
            )}
            {isComp ? (
              <>
                <Label style={{ color: C.muted }}>Preferred start</Label>
                <Chips>{STARTS.map((l, i) => <Chip key={l} label={l} on={start === i} onPress={() => setStart(i)} />)}</Chips>
              </>
            ) : (
              <KV k="Places" v={<Stepper value={places} minusLabel="Fewer places" plusLabel="More places"
                onMinus={() => setPlaces(Math.max(1, places - 1))} onPlus={() => setPlaces(Math.min(left ?? 12, 12, places + 1))} />} />
            )}
            {err && <ErrorBox message={err} />}
            <Btn label="Confirm entry" variant="gold" loading={busy} style={{ marginTop: 8 }}
              onPress={act(() => enterEvent(ev.id, partner, isComp ? STARTS[start] : '', isComp ? 1 : places))} />
            {ev.fee_text && <Small style={{ color: C.muted }}>Entry fee is charged to your member account.</Small>}
          </Sec>
        )}
        {entry && err && <ErrorBox message={err} />}
      </Scroll>
    </Page>
  );
}

const st = StyleSheet.create({
  input: { fontSize: 15, paddingVertical: 13, paddingHorizontal: 14, borderWidth: 1, borderColor: C.gray, borderRadius: 2, color: C.blue },
});
