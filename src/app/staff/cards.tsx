import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { BarHeader, Btn, Card, Chip, Chips, Empty, ErrorBox, Field, KV, Loading, Page, Scroll, Small, Title } from '@/components/ui';
import { staffMarkPosted, staffScorecards, type QueuedCard } from '@/lib/api';
import * as f from '@/lib/format';
import { useQuery } from '@/lib/use-query';
import { C } from '@/theme';

export default function StaffCards() {
  const [posted, setPosted] = useState(false);
  const { data, error, reload } = useQuery(() => staffScorecards(posted), [posted]);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <Page>
      <BarHeader title="Scorecards" />
      <Scroll gap={18} onRefresh={reload}>
        <Small style={{ color: C.muted }}>
          Enter each card on the Scottish Golf system, then mark it posted here. Adding the new index updates the member’s app and tells them.
        </Small>
        <Chips>
          <Chip label="To post" on={!posted} onPress={() => setPosted(false)} />
          <Chip label="Posted" on={posted} onPress={() => setPosted(true)} />
        </Chips>
        {error ? <ErrorBox message={error} onRetry={reload} /> : !data ? <Loading /> : data.length === 0 ? (
          <Empty>{posted ? 'Nothing posted yet.' : 'No cards waiting.'}</Empty>
        ) : data.map((c) => (
          <CardRow key={c.id} c={c} expanded={open === c.id} onToggle={() => setOpen(open === c.id ? null : c.id)} onDone={reload} />
        ))}
      </Scroll>
    </Page>
  );
}

function CardRow({ c, expanded, onToggle, onDone }: { c: QueuedCard; expanded: boolean; onToggle: () => void; onDone: () => void }) {
  const [index, setIndex] = useState('');
  const [diff, setDiff] = useState('');
  const [busy, setBusy] = useState(false);
  const scores = c.holes.map((h) => (h ? String(h.s) : '–'));

  const post = async () => {
    const ni = index.trim() ? Number(index) : null;
    const d = diff.trim() ? Number(diff) : null;
    if ((ni != null && Number.isNaN(ni)) || (d != null && Number.isNaN(d))) return Alert.alert('Use numbers like 12.4');
    setBusy(true);
    try {
      await staffMarkPosted(c.id, ni, d);
      onDone();
    } catch (e) {
      Alert.alert('Couldn’t save', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Text onPress={onToggle} accessibilityRole="button">
        <Title>{c.name} · No. {c.member_no}</Title>
      </Text>
      <Small style={{ color: C.muted }}>
        {f.shortDay(c.played_on + 'T12:00:00Z')} · {c.event_title ?? 'General play'} · Gross {c.gross ?? '–'}
      </Small>
      {expanded && (
        <View style={{ gap: 10 }}>
          <KV k="Tee / card" v={`${c.tee ?? 'Black'} · ${c.gender ?? 'Men'}+`} />
          <KV k="Course handicap" v={String(c.course_handicap)} />
          <KV k="Current index" v={c.handicap_index != null ? String(c.handicap_index) : '—'} />
          <KV k="Marker" v={c.marker_name ?? 'Not entered'} />
          <Text style={{ fontSize: 13, color: C.blue, fontVariant: ['tabular-nums'] }}>
            Out  {scores.slice(0, 9).join('  ')}{'\n'}In     {scores.slice(9).join('  ')}
          </Text>
          {c.posted_at ? (
            <Small style={{ color: C.muted }}>Posted {f.shortDay(c.posted_at)}</Small>
          ) : (
            <>
              <Field label="Score differential (from WHS)" value={diff} onChange={setDiff} keyboardType="decimal-pad" placeholder="Optional" />
              <Field label="New handicap index" value={index} onChange={setIndex} keyboardType="decimal-pad" placeholder="Optional" />
              <Btn label="Mark as posted to WHS" variant="gold" onPress={post} loading={busy} />
            </>
          )}
        </View>
      )}
    </Card>
  );
}
