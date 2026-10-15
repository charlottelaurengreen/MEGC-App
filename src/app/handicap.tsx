import { Text, View } from 'react-native';

import { BarHeader, Big, Empty, H, Label, List, Page, Panel, Row, Scroll, Sec, Small } from '@/components/ui';
import { getHandicapRecords } from '@/lib/api';
import { useSession } from '@/lib/session';
import { useQuery } from '@/lib/use-query';
import { C } from '@/theme';

export default function Handicap() {
  const { member } = useSession();
  const { data } = useQuery(getHandicapRecords);

  // WHS: the best 8 of the most recent 20 differentials count.
  const recent = [...(data ?? [])].reverse(); // oldest → newest, left → right
  const best = new Set([...recent].sort((a, b) => a.differential - b.differential).slice(0, 8).map((r) => r.id));
  const max = Math.max(...recent.map((r) => r.differential), 1);
  const min = Math.min(...recent.map((r) => r.differential), 0);
  const year = new Date().getFullYear().toString();
  const thisYear = recent.filter((r) => r.played_on.startsWith(year)).length;

  return (
    <Page>
      <BarHeader title="Handicap" />
      <Scroll gap={24}>
        <Panel style={{ gap: 14 }}>
          <Label style={{ color: C.gold }}>Handicap index</Label>
          <Big style={{ fontSize: 52, lineHeight: 56 }}>{member?.handicap_index ?? '—'}</Big>
          <Small style={{ color: C.dim }}>World Handicap System · Updated by the club from your Scottish Golf record</Small>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Trio k="Low index" v={member?.low_index ?? '—'} />
            <Trio k={`Rounds ${year}`} v={thisYear} />
            <Trio k="Counting" v={Math.min(8, recent.length)} />
          </View>
        </Panel>

        <Sec>
          <H>Last 20 scores</H>
          {recent.length === 0 ? <Empty>No scores recorded yet.</Empty> : (
            <>
              <View accessible accessibilityRole="image"
                accessibilityLabel={`Score differentials for your last ${recent.length} rounds. The best ${best.size} are highlighted.`}
                style={{ height: 150, flexDirection: 'row', alignItems: 'flex-end', gap: 5, borderBottomWidth: 1, borderBottomColor: C.blue }}>
                {recent.map((r) => (
                  <View key={r.id} style={{ flex: 1, height: 12 + ((r.differential - min) / (max - min || 1)) * 130, backgroundColor: best.has(r.id) ? C.blue : C.gray }} />
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 18 }}>
                <Legend color={C.blue} label={`Best ${best.size} (count)`} />
                <Legend color={C.gray} label="Other rounds" />
              </View>
            </>
          )}
        </Sec>

        <Sec>
          <H>Submit a score</H>
          <List>
            <Row icon="pencil" title="Enter a scorecard" sub="Hole by hole, with your marker" href="/scorecard" />
          </List>
          <Small style={{ color: C.muted }}>To pre-register a general play round, tick “Pre-register for handicap” when you book your tee time.</Small>
        </Sec>
      </Scroll>
    </Page>
  );
}

const Trio = ({ k, v }: { k: string; v: number | string }) => (
  <View style={{ flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', padding: 10, gap: 4 }}>
    <Label style={{ color: C.dim, fontSize: 10 }}>{k}</Label>
    <Text style={{ fontSize: 18, fontWeight: '700', color: C.white }}>{v}</Text>
  </View>
);

const Legend = ({ color, label }: { color: string; label: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
    <View style={{ width: 12, height: 12, backgroundColor: color }} />
    <Small>{label}</Small>
  </View>
);
