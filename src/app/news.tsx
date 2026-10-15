import { useState } from 'react';
import { Text } from 'react-native';

import { BarHeader, Body, Card, Chip, Chips, Empty, ErrorBox, Label, Loading, Page, Panel, Scroll, Small, Tag } from '@/components/ui';
import { getNews } from '@/lib/api';
import * as f from '@/lib/format';
import { useQuery } from '@/lib/use-query';
import { C } from '@/theme';

const FILTERS = ['All', 'Course', 'Clubhouse', 'Competitions', 'Local rules'];
const tone = (c: string) => (c === 'Course' ? 'green' : c === 'Competitions' ? 'blue' : 'gray') as 'green' | 'blue' | 'gray';

export default function News() {
  const [filter, setFilter] = useState('All');
  const { data, error, loading, reload } = useQuery(getNews);
  const posts = (data ?? []).filter((p) => filter === 'All' || p.category === filter);

  return (
    <Page>
      <BarHeader title="Club news" />
      <Scroll gap={18} onRefresh={reload} refreshing={loading && !!data}>
        <Chips>{FILTERS.map((l) => <Chip key={l} label={l} on={filter === l} onPress={() => setFilter(l)} />)}</Chips>
        {error ? <ErrorBox message={error} onRetry={reload} /> : !data ? <Loading /> : posts.length === 0 ? <Empty>No news in this category.</Empty> : posts.map((p) =>
          p.pinned ? (
            <Panel key={p.id}>
              <Label style={{ color: C.gold }}>Pinned · {p.category}</Label>
              <Text style={{ fontSize: 18, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: C.white }}>{p.title}</Text>
              <Body style={{ color: C.dim }}>{p.body}</Body>
              <Small style={{ color: C.dim }}>{p.author} · {f.ago(p.published_at)}</Small>
            </Panel>
          ) : (
            <Card key={p.id}>
              <Tag label={p.category} tone={tone(p.category)} />
              <Text style={{ fontSize: 17, fontWeight: '700', color: C.blue }}>{p.title}</Text>
              <Small style={{ fontSize: 14, lineHeight: 22, color: C.muted }}>{p.body}</Small>
              <Small style={{ color: C.muted }}>{p.author} · {f.ago(p.published_at)}</Small>
            </Card>
          ),
        )}
      </Scroll>
    </Page>
  );
}
