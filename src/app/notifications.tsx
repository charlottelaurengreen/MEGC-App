import type { Href } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import type { IconName } from '@/components/icon';
import { BarHeader, Empty, ErrorBox, H, Label, List, Loading, Page, Row, Scroll, Sec, Toggle } from '@/components/ui';
import { getNotifications, setAlertPrefs, type AlertPrefs, type Notice } from '@/lib/api';
import * as f from '@/lib/format';
import { useSession } from '@/lib/session';
import { useQuery } from '@/lib/use-query';
import { C } from '@/theme';

const ICON: Record<string, IconName> = { course: 'cloud', tee: 'clock', comps: 'trophy', news: 'megaphone', offers: 'cutlery', account: 'card' };

const PREFS: [keyof AlertPrefs, string, string][] = [
  ['course', 'Course conditions & closures', 'Frost, weather and course status'],
  ['tee', 'Tee time reminders', 'The day before your round'],
  ['comps', 'Competitions & results', 'Entries opening, draws and results'],
  ['news', 'Club news', 'Notices from the club office'],
  ['offers', 'Brasserie & events offers', 'Menus, tasting nights and special events'],
];

export default function Notifications() {
  const { member, refreshMember } = useSession();
  const { data, error, reload } = useQuery(getNotifications);
  // Local edits show instantly; the saved profile is the fallback.
  const [edited, setEdited] = useState<AlertPrefs | null>(null);
  const prefs = edited ?? member?.alert_prefs ?? null;

  const flip = async (k: keyof AlertPrefs) => {
    if (!prefs) return;
    const next = { ...prefs, [k]: !prefs[k] };
    setEdited(next);
    try {
      await setAlertPrefs(next);
      refreshMember();
    } catch {
      setEdited(prefs);
    }
  };

  const today = f.isoDay(new Date());
  const groups: [string, Notice[]][] = [
    ['Today', (data ?? []).filter((n) => f.isoDay(n.created_at) === today)],
    ['Earlier', (data ?? []).filter((n) => f.isoDay(n.created_at) !== today)],
  ];

  return (
    <Page>
      <BarHeader title="Notifications" />
      <Scroll gap={24} onRefresh={reload}>
        {error ? <ErrorBox message={error} onRetry={reload} /> : !data ? <Loading /> : data.length === 0 ? <Empty>No notifications yet.</Empty> : groups.map(([label, list]) =>
          list.length ? (
            <Sec key={label}>
              <Label style={{ color: C.muted }}>{label}</Label>
              <List>
                {list.map((n) => (
                  <Row key={n.id} icon={ICON[n.category] ?? 'bell'} iconBg={n.category === 'course' ? C.green : undefined} iconFg={n.category === 'course' ? C.white : undefined}
                    title={n.title} sub={[n.body, label === 'Today' ? f.time(n.created_at) : f.shortDay(n.created_at)].filter(Boolean).join(' · ')}
                    href={(n.link as Href) ?? undefined} chevron={false} />
                ))}
              </List>
            </Sec>
          ) : null,
        )}
        <Sec>
          <H>Alert settings</H>
          <View>
            {prefs && PREFS.map(([k, t, s]) => <Toggle key={k} label={t} sub={s} value={prefs[k]} onChange={() => flip(k)} />)}
          </View>
        </Sec>
      </Scroll>
    </Page>
  );
}
