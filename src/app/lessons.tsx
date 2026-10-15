import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { BarHeader, Btn, Card, Chip, Chips, Empty, ErrorBox, H, List, Loading, Page, Row, Scroll, Sec, Small, Title } from '@/components/ui';
import { bookLesson, getFreeLessonSlots, getLessonTypes } from '@/lib/api';
import * as f from '@/lib/format';
import { useQuery } from '@/lib/use-query';
import { C } from '@/theme';

const web = (path: string) => () => WebBrowser.openBrowserAsync(`https://www.merchantsgolf.com/${path}`);

export default function Lessons() {
  const { data, error, reload } = useQuery(async () => {
    const [types, slots] = await Promise.all([getLessonTypes(), getFreeLessonSlots()]);
    return { types, slots };
  });
  const [type, setType] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const t = data?.types.find((x) => x.id === type) ?? data?.types[0];
  const sl = data?.slots.find((x) => x.id === slot);

  const book = async () => {
    if (!t || !sl) return;
    setBusy(true);
    try {
      await bookLesson(sl.id, t.id);
      Alert.alert('Lesson booked', `${t.title}, ${f.shortDay(sl.starts_at)} at ${f.time(sl.starts_at)}.`);
      router.replace('/bookings');
    } catch (e) {
      Alert.alert('Couldn’t book', (e as Error).message);
      setSlot(null);
      reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <BarHeader title="Lessons" />
      <Scroll gap={24}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 56, height: 56, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 12, letterSpacing: 1.4, fontWeight: '700', color: C.gold }}>PRO</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Title>The club professional</Title>
            <Small style={{ color: C.muted }}>PGA AAT Professional · 0131 447 1219 (option 4)</Small>
          </View>
        </Card>

        {error ? <ErrorBox message={error} onRetry={reload} /> : !data ? <Loading /> : (
          <>
            <Sec>
              <H>Choose a lesson</H>
              <View style={{ gap: 8 }}>
                {data.types.map((x) => {
                  const on = x.id === t?.id;
                  return (
                    <Pressable key={x.id} onPress={() => setType(x.id)} accessibilityRole="button" accessibilityState={{ selected: on }}
                      style={[st.opt, on && { borderWidth: 2, borderColor: C.blue, padding: 13 }]}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Title>{x.title}</Title>
                        <Small style={{ color: C.muted }}>{x.subtitle}</Small>
                      </View>
                      <Small style={{ fontWeight: '700' }}>{f.money(x.price) ?? 'Ask the pro'}</Small>
                    </Pressable>
                  );
                })}
              </View>
            </Sec>
            <Sec>
              <H>Available times</H>
              {data.slots.length === 0 ? <Empty>No lesson times are open. Call the pro shop to arrange one.</Empty> : (
                <Chips>
                  {data.slots.map((x) => (
                    <Chip key={x.id} label={`${f.dow(x.starts_at)} ${f.dayNum(x.starts_at)} · ${f.time(x.starts_at)}`} on={slot === x.id} onPress={() => setSlot(x.id)} />
                  ))}
                </Chips>
              )}
            </Sec>
            <Btn label={sl ? `Book ${f.dow(sl.starts_at)} ${f.time(sl.starts_at)}` : 'Choose a time'} variant="gold" disabled={!sl || !t} loading={busy} onPress={book} />
          </>
        )}

        <Sec>
          <H>Other facilities</H>
          <List>
            <Row icon="people" title="Private dining" sub="Celebrations, wakes and team dinners" onPress={web('private-dining/')} />
            <Row icon="calendar" title="Meetings & events" sub="South-facing clubhouse and patio" onPress={web('special-events/meetings-conferences/')} />
            <Row icon="flag" title="Society & group days" sub="Packages for golf groups" onPress={web('group-booking-packages/')} />
          </List>
        </Sec>
      </Scroll>
    </Page>
  );
}

const st = StyleSheet.create({
  opt: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderWidth: 1, borderColor: C.gray, backgroundColor: C.white },
});
