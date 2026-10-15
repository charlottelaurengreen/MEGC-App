import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BarHeader, Chip, Chips, Empty, ErrorBox, Loading, Page, Scroll, Small, Tag } from '@/components/ui';
import { getEvent, getLeaderboard, type LeaderRow } from '@/lib/api';
import * as f from '@/lib/format';
import { useSession } from '@/lib/session';
import { useQuery } from '@/lib/use-query';
import { C } from '@/theme';

const toPar = (n: number) => (n === 0 ? 'E' : n > 0 ? `+${n}` : `−${-n}`);

/** Standard golf positions: ties share a place and are marked T. */
function rank(rows: LeaderRow[], key: (r: LeaderRow) => number) {
  const sorted = [...rows].sort((a, b) => key(a) - key(b) || b.thru - a.thru);
  return sorted.map((r, i) => {
    const first = sorted.findIndex((x) => key(x) === key(r));
    const tied = sorted.filter((x) => key(x) === key(r)).length > 1;
    return { ...r, pos: `${tied ? 'T' : ''}${first + 1}`, i };
  });
}

export default function Leaderboard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { member } = useSession();
  const [mode, setMode] = useState<'net' | 'gross'>('net');
  const [updated, setUpdated] = useState(new Date());
  const { data, error, reload } = useQuery(async () => {
    const [ev, rows] = await Promise.all([getEvent(id), getLeaderboard(id)]);
    setUpdated(new Date());
    return { ev, rows };
  }, [id]);

  // Refresh every minute while the screen is open.
  useEffect(() => {
    const t = setInterval(reload, 60_000);
    return () => clearInterval(t);
  }, [reload]);

  const rows = data ? rank(data.rows, mode === 'net' ? (r) => r.net_to_par : (r) => r.gross) : [];

  return (
    <Page>
      <BarHeader title={data?.ev.title ?? 'Leaderboard'} />
      <Scroll gap={18} onRefresh={reload}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {data?.ev.is_live && <Tag label="● Live" tone="green" />}
          <Small style={{ color: C.muted }}>Updated {f.time(updated)} · {rows.length} players</Small>
        </View>
        <Chips>
          <Chip label="Net" on={mode === 'net'} onPress={() => setMode('net')} />
          <Chip label="Gross" on={mode === 'gross'} onPress={() => setMode('gross')} />
        </Chips>
        {error ? <ErrorBox message={error} onRetry={reload} /> : !data ? <Loading /> : rows.length === 0 ? <Empty>No scores in yet.</Empty> : (
          <View>
            <View style={[st.tr, { borderBottomColor: C.blue }]}>
              <Text style={[st.th, { width: 44 }]}>Pos</Text>
              <Text style={[st.th, { flex: 1 }]}>Player</Text>
              <Text style={[st.th, st.num, { width: 48 }]}>Thru</Text>
              <Text style={[st.th, st.num, { width: 56 }]}>{mode === 'net' ? 'Net' : 'Gross'}</Text>
            </View>
            {rows.map((r) => {
              const me = r.member_id === member?.id;
              const fg = me ? C.white : C.blue;
              return (
                <View key={r.member_id} style={[st.tr, me && { backgroundColor: C.blue }]}>
                  <Text style={[st.td, { width: 44, color: fg }]}>{r.pos}</Text>
                  <Text style={[st.td, { flex: 1, color: fg, fontWeight: me ? '700' : '400' }]}>{r.name}{me ? ' (you)' : ''}</Text>
                  <Text style={[st.td, st.num, { width: 48, color: fg }]}>{r.thru === 18 ? 'F' : r.thru}</Text>
                  <Text style={[st.td, st.num, { width: 56, fontWeight: '700', color: me ? C.gold : C.blue }]}>{mode === 'net' ? toPar(r.net_to_par) : r.gross}</Text>
                </View>
              );
            })}
          </View>
        )}
        <Small style={{ color: C.muted }}>Scores come from members’ scorecards as each hole is entered. Results are final once cards are attested.</Small>
      </Scroll>
    </Page>
  );
}

const st = StyleSheet.create({
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.gray, paddingHorizontal: 6 },
  th: { fontSize: 11, letterSpacing: 1.3, textTransform: 'uppercase', paddingVertical: 8, color: C.muted },
  td: { fontSize: 14, paddingVertical: 11 },
  num: { textAlign: 'right' },
});
