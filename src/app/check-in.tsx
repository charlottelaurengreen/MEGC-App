import { Image } from 'expo-image';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Band, BarHeader, Btn, Card, ErrorBox, H, IconTile, KV, Label, Page, Panel, Scroll, Sec, Small, Title } from '@/components/ui';
import { checkIn, getMyTeeBookings } from '@/lib/api';
import * as f from '@/lib/format';
import { useSession } from '@/lib/session';
import { useQuery } from '@/lib/use-query';
import { C } from '@/theme';

export default function CheckIn() {
  const { member } = useSession();
  const { data, reload } = useQuery(async () => {
    const today = f.isoDay(new Date());
    return (await getMyTeeBookings('upcoming')).find((b) => f.isoDay(b.tee_slots.starts_at) === today) ?? null;
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const doCheckIn = async () => {
    if (!data) return;
    setBusy(true);
    setErr(null);
    try {
      await checkIn(data.id);
      await reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <BarHeader title="Check in" />
      <Scroll gap={22}>
        <Panel style={{ gap: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Image source={require('@/assets/brand/logo-crest-gold.png')} style={{ width: 44, height: 44 }} contentFit="contain" />
            <View style={{ gap: 2 }}>
              <Label style={{ color: C.gold }}>Membership card</Label>
              <Title style={{ color: C.white, fontSize: 20 }}>{member ? `${member.first_name} ${member.last_name}` : ''}</Title>
            </View>
          </View>
          <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.hairOnBlue, paddingVertical: 18, alignItems: 'center', gap: 4 }}>
            <Label style={{ color: C.dim }}>Member no.</Label>
            <Text style={{ fontSize: 44, fontWeight: '700', letterSpacing: 4, color: C.white }}>{member?.member_no ?? ''}</Text>
          </View>
          <KV onBlue k="Category" v={member?.category ?? ''} />
          {member?.valid_to && <KV onBlue k="Valid to" v={f.fullDate(member.valid_to + 'T12:00:00Z')} />}
        </Panel>
        <Small style={{ color: C.muted, textAlign: 'center' }}>Show this card at the pro shop or the competition desk.</Small>

        <Sec>
          <H>Today’s tee time</H>
          {data === undefined ? null : data === null ? (
            <Small style={{ color: C.muted }}>You have no tee time booked today.</Small>
          ) : (
            <>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <IconTile name="clock" />
                <View style={{ flex: 1, gap: 2 }}>
                  <Title>{f.time(data.tee_slots.starts_at)} · 1st tee</Title>
                  <Small style={{ color: C.muted }}>
                    {data.players.length} player{data.players.length === 1 ? '' : 's'}{data.buggy ? ' · Buggy at the pro shop' : ''}
                  </Small>
                </View>
              </Card>
              {data.checked_in_at ? (
                <Band icon="check" title={`Checked in at ${f.time(data.checked_in_at)}`} sub="The starter has your group. Enjoy your round." />
              ) : (
                <Btn label="Check in now" variant="gold" onPress={doCheckIn} loading={busy} />
              )}
              {err && <ErrorBox message={err} />}
            </>
          )}
        </Sec>
      </Scroll>
    </Page>
  );
}
