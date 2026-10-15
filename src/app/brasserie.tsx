import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { BarHeader, Btn, Chip, DayStrip, Display, ErrorBox, H, Label, Loading, Page, Panel, Scroll, Sec, Small, Stepper } from '@/components/ui';
import { bookTable, getDiningAvailability, getSettings } from '@/lib/api';
import * as f from '@/lib/format';
import { useQuery } from '@/lib/use-query';
import { C } from '@/theme';

export default function Brasserie() {
  const days = useMemo(() => f.nextDays(7), []);
  const [day, setDay] = useState(days[0].iso);
  const [party, setParty] = useState(2);
  const [time, setTime] = useState<string | null>(null);
  const [requests, setRequests] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { data: settings } = useQuery(getSettings);
  const { data: avail, error, reload } = useQuery(() => getDiningAvailability(day), [day]);

  const isToday = day === days[0].iso;
  const nowHm = f.time(new Date());
  const times = (avail ?? []).map((t) => ({ ...t, full: t.covers_left < party || (isToday && t.time_label <= nowHm) }));
  const chosen = times.find((t) => t.time_label === time && !t.full) ? time : null;

  const reserve = async () => {
    if (!chosen) return;
    setBusy(true);
    setErr(null);
    try {
      await bookTable(day, chosen, party, requests);
      Alert.alert('Table booked', `${f.longDay(day + 'T12:00:00Z')} at ${chosen} for ${party}.`);
      router.replace('/bookings');
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Page>
      <BarHeader title="Brasserie" />
      <Scroll gap={24}>
        <Panel>
          <Label style={{ color: C.gold }}>The Brasserie at Merchants</Label>
          <Display>Book a table</Display>
          <Small style={{ color: C.dim }}>Seasonal Scottish produce, open to members and visitors. Brunch, lunch and dinner with views to the Pentland Hills.</Small>
          <View style={{ alignSelf: 'flex-start' }}>
            <Btn label="View menus" variant="onblue" sm onPress={() => WebBrowser.openBrowserAsync('https://www.merchantsgolf.com/menus/')} />
          </View>
        </Panel>

        <Sec>
          <H>Date</H>
          <DayStrip days={days} value={day} onChange={(d) => { setDay(d); setTime(null); }} />
        </Sec>

        <Sec>
          <H>Guests</H>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: C.blue }}>Party size</Text>
            <Stepper value={party} minusLabel="Fewer guests" plusLabel="More guests" onMinus={() => setParty(Math.max(1, party - 1))} onPlus={() => setParty(Math.min(12, party + 1))} />
          </View>
        </Sec>

        <Sec>
          <H>Time</H>
          {error ? <ErrorBox message={error} onRetry={reload} /> : !avail ? <Loading /> : (
            <View style={st.grid}>
              {times.map((t) => (
                <View key={t.time_label} style={st.cell}>
                  <Chip label={t.time_label} on={chosen === t.time_label} full={t.full} onPress={() => setTime(t.time_label)} />
                </View>
              ))}
            </View>
          )}
        </Sec>

        <Sec gap={6}>
          <Label>Special requests</Label>
          <TextInput value={requests} onChangeText={setRequests} multiline numberOfLines={3} placeholder="Window table, dietary needs…" placeholderTextColor={C.faint} style={st.input} />
        </Sec>

        {err && <ErrorBox message={err} />}
        <Btn label={chosen ? `Reserve for ${party} at ${chosen}` : 'Choose a time'} variant="gold" disabled={!chosen} loading={busy} onPress={reserve} />
        <Small style={{ color: C.muted }}>
          Free cancellation up to 24 hours before. Large parties and private dining: call {settings?.club_phone ?? 'the club'}.
        </Small>
      </Scroll>
    </Page>
  );
}

const st = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  cell: { width: '25%', padding: 4 },
  input: { fontSize: 15, minHeight: 84, textAlignVertical: 'top', paddingVertical: 13, paddingHorizontal: 14, borderWidth: 1, borderColor: C.gray, borderRadius: 2, color: C.blue },
});
