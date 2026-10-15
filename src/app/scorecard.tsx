import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BarHeader, Btn, Chip, Chips, ErrorBox, H, KV, Label, Loading, Page, Panel, Scroll, Sec, Small, Stepper } from '@/components/ui';
import { getEvents, getHoles, getMyEntries, getOpenRound, saveRound, startRound, type Hole, type HoleScore, type Round } from '@/lib/api';
import { useSession } from '@/lib/session';
import { useQuery } from '@/lib/use-query';
import { C } from '@/theme';

/** Strokes received on a hole for a course handicap, by stroke index. */
const received = (ch: number, si: number) => Math.floor(ch / 18) + (si <= ch % 18 ? 1 : 0);
const points = (h: Hole, ch: number, s: number) => Math.max(0, h.par + received(ch, h.stroke_index) - s + 2);

export default function Scorecard() {
  const { data, error, reload } = useQuery(async () => {
    const [holes, round] = await Promise.all([getHoles(), getOpenRound()]);
    return { holes, round };
  });

  if (error) return <Page><BarHeader title="Scorecard" /><Scroll><ErrorBox message={error} onRetry={reload} /></Scroll></Page>;
  if (!data) return <Page><BarHeader title="Scorecard" /><Loading /></Page>;
  return data.round ? <Card holes={data.holes} initial={data.round} /> : <Start onStarted={reload} />;
}

function Start({ onStarted }: { onStarted: () => void }) {
  const { member } = useSession();
  const [ch, setCh] = useState(Math.round(member?.handicap_index ?? 0));
  const [eventId, setEventId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Competitions in play today that this member has entered.
  const { data: comps } = useQuery(async () => {
    const [events, entries] = await Promise.all([getEvents(), getMyEntries()]);
    return events.filter((e) => e.is_live && entries.some((x) => x.event_id === e.id));
  });

  const start = async () => {
    setBusy(true);
    try {
      await startRound(ch, eventId);
      onStarted();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Page>
      <BarHeader title="Scorecard" />
      <Scroll>
        <Sec>
          <H>New round</H>
          <KV k="Course handicap" v={<Stepper value={ch} minusLabel="Lower" plusLabel="Higher" onMinus={() => setCh(Math.max(0, ch - 1))} onPlus={() => setCh(Math.min(54, ch + 1))} />} />
          <Small style={{ color: C.muted }}>Check the course handicap table in the clubhouse for your tee.</Small>
        </Sec>
        {!!comps?.length && (
          <Sec>
            <Label style={{ color: C.muted }}>Playing in</Label>
            <Chips>
              <Chip label="General play" on={!eventId} onPress={() => setEventId(null)} />
              {comps.map((c) => <Chip key={c.id} label={c.title} on={eventId === c.id} onPress={() => setEventId(c.id)} />)}
            </Chips>
          </Sec>
        )}
        {err && <ErrorBox message={err} />}
        <Btn label="Start round" variant="gold" onPress={start} loading={busy} />
      </Scroll>
    </Page>
  );
}

function Card({ holes, initial }: { holes: Hole[]; initial: Round }) {
  const [card, setCard] = useState<HoleScore[]>(() => holes.map((_, k) => initial.holes[k] ?? null));
  const firstEmpty = card.findIndex((x) => !x);
  const [c, setC] = useState(firstEmpty === -1 ? 17 : firstEmpty);
  const [marker, setMarker] = useState(initial.marker_name ?? '');
  const [busy, setBusy] = useState(false);
  const ch = initial.course_handicap;
  const h = holes[c];
  const cur: NonNullable<HoleScore> = card[c] ?? { s: h.par, p: 2, fw: h.par === 3 ? 'n/a' : 'Yes' };

  const upd = (patch: Partial<NonNullable<HoleScore>>) => {
    const next = card.slice();
    next[c] = { ...cur, ...patch };
    setCard(next);
  };

  const persist = async (next: HoleScore[], extra: Partial<Pick<Round, 'status' | 'marker_name'>> = {}) => {
    setBusy(true);
    try {
      await saveRound(initial.id, { holes: next, marker_name: marker || null, ...extra });
    } catch (e) {
      Alert.alert('Couldn’t save', (e as Error).message);
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const saveNext = async () => {
    const next = card.slice();
    next[c] = cur;
    setCard(next);
    await persist(next);
    if (c < holes.length - 1) setC(c + 1);
  };

  const finish = () => {
    const missing = card.filter((x) => !x).length;
    Alert.alert('Submit this card?', missing ? `${missing} hole(s) have no score and will count as blank.` : `Marker: ${marker || 'not entered'}`, [
      { text: 'Not yet', style: 'cancel' },
      {
        text: 'Submit',
        onPress: async () => {
          await persist(card, { status: 'submitted' });
          Alert.alert('Card submitted', 'The handicap secretary will post it to your WHS record.');
          router.replace('/handicap');
        },
      },
    ]);
  };

  const nine = c < 9 ? holes.slice(0, 9) : holes.slice(9);
  const filled = card.map((x, k) => (x ? { ...x, k } : null)).filter((x): x is NonNullable<HoleScore> & { k: number } => !!x);
  const fwHoles = filled.filter((x) => x.fw !== 'n/a');

  return (
    <Page>
      <BarHeader title="Scorecard" />
      <Scroll gap={20}>
        <Small style={{ color: C.muted }}>Course handicap {ch}</Small>
        <Panel style={{ gap: 16 }}>
          <Label style={{ color: C.gold }}>Hole {h.hole} · Par {h.par} · Stroke index {h.stroke_index}</Label>
          <View style={st.pstep}>
            <Text style={st.lbl}>Strokes</Text>
            <Stepper onBlue value={cur.s} minusLabel="One fewer stroke" plusLabel="One more stroke"
              onMinus={() => upd({ s: Math.max(1, cur.s - 1), p: Math.min(cur.p, Math.max(0, cur.s - 2)) })} onPlus={() => upd({ s: cur.s + 1 })} />
          </View>
          <View style={st.pstep}>
            <Text style={st.lbl}>Putts</Text>
            <Stepper onBlue value={cur.p} minusLabel="One fewer putt" plusLabel="One more putt"
              onMinus={() => upd({ p: Math.max(0, cur.p - 1) })} onPlus={() => upd({ p: Math.min(cur.s - 1, cur.p + 1) })} />
          </View>
          {h.par > 3 && (
            <View style={{ gap: 8 }}>
              <Label style={{ color: C.dim }}>Fairway hit</Label>
              <Chips>
                {(['Yes', 'No'] as const).map((l) => <Chip key={l} onBlue label={l} on={cur.fw === l} onPress={() => upd({ fw: l })} />)}
              </Chips>
            </View>
          )}
          <KV onBlue k="Green in regulation" v={cur.s - cur.p <= h.par - 2 ? 'Yes' : 'No'} />
          <KV onBlue k="Stableford points" v={points(h, ch, cur.s)} />
        </Panel>
        <Btn label={c < holes.length - 1 ? 'Save & next hole' : `Save hole ${h.hole}`} variant="gold" onPress={saveNext} loading={busy} />

        <Sec>
          <H>{c < 9 ? 'Front nine' : 'Back nine'}</H>
          <View>
            <View style={[st.tr, { borderBottomColor: C.blue }]}>
              {['Hole', 'Par', 'Score', 'Putts', 'Pts'].map((t, k) => <Text key={t} style={[st.th, k > 0 && st.num]}>{t}</Text>)}
            </View>
            {nine.map((x) => {
              const k = x.hole - 1;
              const e = k === c ? cur : card[k];
              const on = k === c;
              const fg = on ? C.white : C.blue;
              return (
                <Pressable key={x.hole} onPress={() => setC(k)} accessibilityRole="button" accessibilityLabel={`Edit hole ${x.hole}`} style={[st.tr, on && { backgroundColor: C.blue }]}>
                  {[x.hole, x.par, e?.s ?? '–', e?.p ?? '–', e ? points(x, ch, e.s) : '–'].map((v, j) => (
                    <Text key={j} style={[st.td, j > 0 && st.num, { color: fg, fontWeight: on ? '700' : '400' }]}>{v}</Text>
                  ))}
                </Pressable>
              );
            })}
          </View>
        </Sec>
        <View style={st.stats}>
          <Stat k="Points" v={filled.reduce((a, x) => a + points(holes[x.k], ch, x.s), 0)} />
          <Stat k="Putts" v={filled.reduce((a, x) => a + x.p, 0)} />
          <Stat k="Fairways" v={`${fwHoles.filter((x) => x.fw === 'Yes').length}/${fwHoles.length}`} />
        </View>
        <Sec gap={8}>
          <Label>Marker</Label>
          <TextInput value={marker} onChangeText={setMarker} placeholder="Who marked your card?" placeholderTextColor={C.faint} autoCapitalize="words" style={st.input} />
        </Sec>
        <Btn label="Finish & submit" variant="line" onPress={finish} disabled={busy} />
      </Scroll>
    </Page>
  );
}

const Stat = ({ k, v }: { k: string; v: number | string }) => (
  <View style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: 12 }}>
    <Label style={{ color: C.muted }}>{k}</Label>
    <Text style={{ fontSize: 22, fontWeight: '700', color: C.blue }}>{v}</Text>
  </View>
);

const st = StyleSheet.create({
  pstep: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lbl: { fontSize: 15, fontWeight: '700', color: C.white },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.gray, paddingHorizontal: 6 },
  th: { flex: 1, fontSize: 11, letterSpacing: 1.3, textTransform: 'uppercase', paddingVertical: 8, color: C.muted },
  td: { flex: 1, fontSize: 14, paddingVertical: 11 },
  num: { textAlign: 'right' },
  stats: { flexDirection: 'row', borderWidth: 1, borderColor: C.gray },
  input: { fontSize: 15, paddingVertical: 13, paddingHorizontal: 14, borderWidth: 1, borderColor: C.gray, borderRadius: 2, color: C.blue },
});
