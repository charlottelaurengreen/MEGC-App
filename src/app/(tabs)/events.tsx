import { useState } from 'react';
import { Text, View } from 'react-native';

import { Btn, Card, Chip, Chips, Empty, ErrorBox, H, Label, Loading, Page, Panel, Scroll, Sec, Small, Tag, Title, TopHeader } from '@/components/ui';
import { getEvents, type ClubEvent } from '@/lib/api';
import * as f from '@/lib/format';
import { useQuery } from '@/lib/use-query';
import { C } from '@/theme';

const FILTERS = [['All', null], ['Competitions', 'Competition'], ['Social', 'Social'], ['Leagues', 'League']] as const;
const tone = (k: ClubEvent['kind']) => (k === 'Competition' ? 'blue' : k === 'League' ? 'green' : 'gray') as 'blue' | 'green' | 'gray';
const cta = (e: ClubEvent) => (e.kind === 'Competition' ? 'Enter' : e.kind === 'League' ? (e.pairs ? 'Register a pair' : 'Register') : 'Book places');

export default function Events() {
  const [fi, setFi] = useState(0);
  const { data, error, loading, reload } = useQuery(getEvents);
  const kind = FILTERS[fi][1];
  const events = (data ?? []).filter((e) => !kind || e.kind === kind);
  const live = events.filter((e) => e.is_live);
  const upcoming = events.filter((e) => !e.is_live);

  return (
    <Page>
      <TopHeader title="Events" subtitle="Competitions, leagues and social nights at the club." />
      <Scroll gap={22} onRefresh={reload} refreshing={loading && !!data}>
        <Chips>{FILTERS.map(([l], i) => <Chip key={l} label={l} on={fi === i} onPress={() => setFi(i)} />)}</Chips>

        {live.map((e) => (
          <Panel key={e.id}>
            <Label style={{ color: C.gold }}>● Live now</Label>
            <Text style={{ fontSize: 20, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: C.white }}>{e.title}</Text>
            <Small style={{ color: C.dim }}>{e.summary}</Small>
            <Btn label="View live leaderboard" variant="gold" sm href={`/leaderboard/${e.id}`} />
          </Panel>
        ))}

        <Sec>
          <H>Coming up</H>
          {error ? <ErrorBox message={error} onRetry={reload} /> : !data ? <Loading /> : upcoming.length === 0 ? <Empty>Nothing scheduled yet.</Empty> : upcoming.map((e) => {
            const full = e.capacity != null && e.entries_count >= e.capacity;
            const meta = [e.summary, e.capacity != null && `${e.entries_count} of ${e.capacity} places taken`].filter(Boolean).join(' · ');
            return (
              <Card key={e.id} style={{ padding: 0, gap: 0 }}>
                <View style={{ flexDirection: 'row' }}>
                  <View style={{ width: 56, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 2 }}>
                    <Text style={{ fontSize: 10, letterSpacing: 1.2, color: C.gold }}>{f.mon(e.starts_at)}</Text>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: C.white }}>{f.dayNum(e.starts_at)}</Text>
                  </View>
                  <View style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 14, gap: 4 }}>
                    <Tag label={e.kind} tone={tone(e.kind)} />
                    <Title>{e.title}</Title>
                    <Small style={{ color: C.muted }}>{meta}</Small>
                  </View>
                </View>
                <View style={{ paddingLeft: 70, paddingRight: 14, paddingBottom: 14 }}>
                  <Btn label={full ? 'Full' : cta(e)} variant={e.kind === 'Competition' ? 'gold' : 'line'} sm disabled={full} href={`/events/${e.id}`} />
                </View>
              </Card>
            );
          })}
        </Sec>
      </Scroll>
    </Page>
  );
}
