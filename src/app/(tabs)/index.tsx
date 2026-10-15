import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Big, Btn, Btns, H, Label, List, Panel, Row, Scroll, Sec, Small, TopHeader, Page, Empty } from '@/components/ui';
import { getEvents, getMyTeeBookings, getNews, getSettings } from '@/lib/api';
import * as f from '@/lib/format';
import { useQuery } from '@/lib/use-query';
import { useSession } from '@/lib/session';
import { getWeather } from '@/lib/weather';
import { C, T } from '@/theme';

const ACTIONS: { label: string; icon: IconName; href: Href }[] = [
  { label: 'Book tee time', icon: 'calendar', href: '/tee-times' },
  { label: 'Check in', icon: 'qr', href: '/check-in' },
  { label: 'Scorecard', icon: 'pencil', href: '/scorecard' },
  { label: 'Brasserie', icon: 'cutlery', href: '/brasserie' },
  { label: 'Events', icon: 'trophy', href: '/events' },
  { label: 'Account', icon: 'card', href: '/account' },
];

export default function Home() {
  const { member } = useSession();
  const { data, loading, reload } = useQuery(async () => {
    const [settings, bookings, news, events, weather] = await Promise.all([
      getSettings(), getMyTeeBookings('upcoming'), getNews(), getEvents(), getWeather(),
    ]);
    return { settings, next: bookings[0], news: news.slice(0, 2), events: events.filter((e) => !e.is_live).slice(0, 2), weather };
  });

  return (
    <Page>
      <TopHeader>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Image source={require('@/assets/brand/logo-crest-gold.png')} style={{ width: 40, height: 40 }} contentFit="contain" accessibilityLabel="Merchants of Edinburgh Golf Club" />
          <View style={{ flex: 1, gap: 2 }}>
            <Small style={{ color: C.dim }}>{f.greeting()}</Small>
            <Text style={{ fontSize: 20, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: C.white }}>{member?.first_name ?? ''}</Text>
          </View>
          <Pressable onPress={() => router.push('/notifications')} accessibilityRole="button" accessibilityLabel="Notifications" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="bell" size={24} color={C.gold} />
          </Pressable>
        </View>
        <Pressable onPress={() => router.push('/news')} accessibilityRole="button" style={s.band}>
          <Icon name="flag" color={C.white} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[T.label, { color: C.white, fontWeight: '700' }]}>{data?.settings.course_status ?? 'Course status'}</Text>
            {!!data?.settings.course_note && <Small style={{ color: C.white }}>{data.settings.course_note}</Small>}
          </View>
          {data?.weather && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: C.white }}>{data.weather.temp}°</Text>
              <Small style={{ color: C.white }}>{data.weather.wind}</Small>
            </View>
          )}
        </Pressable>
      </TopHeader>

      <Scroll onRefresh={reload} refreshing={loading && !!data}>
        <Sec>
          <H>Quick actions</H>
          <View style={s.grid}>
            {ACTIONS.map((a) => (
              <Pressable key={a.label} onPress={() => router.push(a.href)} accessibilityRole="button" style={({ pressed }) => [s.qa, pressed && { backgroundColor: C.paper }]}>
                <View style={s.qaIcon}><Icon name={a.icon} color={C.gold} /></View>
                <Text style={[T.label, { fontSize: 11, color: C.blue, textAlign: 'center' }]}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
        </Sec>

        {data?.next ? (
          <Panel>
            <Label style={{ color: C.gold }}>Your next round</Label>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12 }}>
              <Big>{f.time(data.next.tee_slots.starts_at)}</Big>
              <Label style={{ color: C.white }}>{f.shortDay(data.next.tee_slots.starts_at)}</Label>
            </View>
            <Small style={{ color: C.dim }}>
              {data.next.players.length} player{data.next.players.length === 1 ? '' : 's'}
              {data.next.buggy ? ' · Buggy booked' : ''}
            </Small>
            <Btns>
              <Btn label="Check in" variant="gold" sm href="/check-in" />
              <Btn label="Manage" variant="onblue" sm href="/bookings" />
            </Btns>
          </Panel>
        ) : data ? (
          <Panel>
            <Label style={{ color: C.gold }}>No round booked</Label>
            <Small style={{ color: C.dim }}>Find a tee time in the next two weeks.</Small>
            <Btn label="Book a tee time" variant="gold" sm href="/tee-times" />
          </Panel>
        ) : null}

        <Sec>
          <H action={{ label: 'See all', href: '/news' }}>Club notices</H>
          <List>
            {data?.news.map((n) => (
              <Row key={n.id} icon={n.category === 'Course' || n.category === 'Local rules' ? 'info' : 'megaphone'} title={n.title} sub={n.body} href="/news" />
            ))}
          </List>
          {data && data.news.length === 0 && <Empty>No notices right now.</Empty>}
        </Sec>

        <Sec>
          <H action={{ label: 'All events', href: '/events' }}>Coming up</H>
          <List>
            {data?.events.map((e) => (
              <Row
                key={e.id}
                leading={
                  <View style={s.date}>
                    <Text style={{ fontSize: 9, letterSpacing: 1, color: C.gold }}>{f.mon(e.starts_at)}</Text>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: C.white }}>{f.dayNum(e.starts_at)}</Text>
                  </View>
                }
                title={e.title}
                sub={e.summary}
                href={`/events/${e.id}`}
              />
            ))}
          </List>
          {data && data.events.length === 0 && <Empty>Nothing scheduled yet.</Empty>}
        </Sec>

        <List>
          <Row icon="cutlery" title="Book a table at the Brasserie" sub="Seasonal Scottish menus, with a view of the Pentland Hills" href="/brasserie" />
        </List>
      </Scroll>
    </Page>
  );
}

const s = StyleSheet.create({
  band: { backgroundColor: C.green, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  qa: { width: '31.6%', alignItems: 'center', gap: 10, paddingTop: 16, paddingBottom: 14, paddingHorizontal: 4, borderWidth: 1, borderColor: C.gray },
  qaIcon: { width: 40, height: 40, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center' },
  date: { width: 40, height: 40, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center' },
});
