import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import { BarHeader, Big, Btn, Btns, Card, ErrorBox, H, KV, Label, List, Loading, Page, Panel, Row, Rule, Scroll, Sec, Small, Toggle } from '@/components/ui';
import { bookTeeTime, getSettings, getSlot, getTeeSheet, searchMembers, type Player } from '@/lib/api';
import * as f from '@/lib/format';
import { useSession } from '@/lib/session';
import { useQuery } from '@/lib/use-query';
import { C } from '@/theme';

export default function ConfirmBooking() {
  const { slotId } = useLocalSearchParams<{ slotId: string }>();
  const { member } = useSession();
  const { data, error } = useQuery(async () => {
    const [slot, settings] = await Promise.all([getSlot(slotId), getSettings()]);
    const sheet = await getTeeSheet(f.isoDay(slot.starts_at));
    const row = sheet.find((s) => s.slot_id === slotId);
    return { slot, settings, left: row ? row.capacity - row.booked : 0 };
  }, [slotId]);

  const me: Player = { name: member ? `${member.first_name} ${member.last_name}` : 'You', kind: 'member', member_id: member?.id, handicap_index: member?.handicap_index };
  const [others, setOthers] = useState<Player[]>([]);
  const [adding, setAdding] = useState<null | 'member' | 'guest'>(null);
  const [buggy, setBuggy] = useState(false);
  const [trolley, setTrolley] = useState(false);
  const [prereg, setPrereg] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (error) return <Page><BarHeader title="Confirm booking" /><Scroll><ErrorBox message={error} /></Scroll></Page>;
  if (!data) return <Page><BarHeader title="Confirm booking" /><Loading /></Page>;

  const { slot, settings, left } = data;
  const players = [me, ...others];
  const full = players.length >= left;
  const guests = others.filter((p) => p.kind === 'guest').length;
  const price = (n: number | null, qty = 1) => (n == null ? 'Ask the pro shop' : f.money(n * qty)!);
  const total = (guests ? settings.guest_fee ?? 0 : 0) * guests + (buggy ? settings.buggy_price ?? 0 : 0) + (trolley ? settings.trolley_price ?? 0 : 0);
  const unknownPrice = (guests > 0 && settings.guest_fee == null) || (buggy && settings.buggy_price == null) || (trolley && settings.trolley_price == null);

  const confirm = async () => {
    setBusy(true);
    setErr(null);
    try {
      const id = await bookTeeTime(slotId, players.map(({ handicap_index, ...p }) => p), buggy, trolley, prereg);
      router.replace({ pathname: '/booked/[id]', params: { id } });
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Page>
      <BarHeader title="Confirm booking" />
      <Scroll>
        <Panel>
          <Label style={{ color: C.gold }}>{f.longDay(slot.starts_at)}</Label>
          <Big>{f.time(slot.starts_at)}</Big>
          <Small style={{ color: C.dim }}>18 holes · 1st tee · {left} space{left === 1 ? '' : 's'} available</Small>
        </Panel>

        <Sec>
          <H>Players</H>
          <List>
            {players.map((p, i) => (
              <Row
                key={i}
                icon="person"
                title={i === 0 ? `${p.name} (you)` : p.name}
                sub={p.kind === 'guest' ? 'Guest · Visitor green fee' : `Member${p.handicap_index != null ? ` · Handicap index ${p.handicap_index}` : ''}`}
                right={i > 0 && (
                  <Pressable onPress={() => setOthers(others.filter((_, j) => j !== i - 1))} accessibilityRole="button" accessibilityLabel={`Remove ${p.name}`} style={st.x}>
                    <Icon name="close" size={20} color={C.blue} />
                  </Pressable>
                )}
              />
            ))}
          </List>
          {adding ? (
            <AddPlayer kind={adding} exclude={players} onAdd={(p) => { setOthers([...others, p]); setAdding(null); }} onCancel={() => setAdding(null)} />
          ) : !full ? (
            <Btns>
              <Btn label="Add member" variant="line" sm onPress={() => setAdding('member')} />
              <Btn label="Add guest" variant="line" sm onPress={() => setAdding('guest')} />
            </Btns>
          ) : null}
        </Sec>

        <Sec>
          <H>Extras</H>
          <View>
            <Toggle label="Buggy hire" sub={price(settings.buggy_price)} value={buggy} onChange={setBuggy} />
            <Toggle label="Trolley hire" sub={price(settings.trolley_price)} value={trolley} onChange={setTrolley} />
            <Toggle label="Pre-register for handicap" sub="Counts as a general play round (WHS)" value={prereg} onChange={setPrereg} />
          </View>
        </Sec>

        <Sec>
          <H>Summary</H>
          <Card>
            <KV k={`Member green fees (${players.length - guests})`} v="Included" />
            {guests > 0 && <KV k={`Guest green fee (${guests})`} v={price(settings.guest_fee, guests)} />}
            {buggy && <KV k="Buggy hire" v={price(settings.buggy_price)} />}
            {trolley && <KV k="Trolley hire" v={price(settings.trolley_price)} />}
            <Rule />
            <KV strong k="Charged to your account" v={unknownPrice ? `${f.money(total)} + extras` : f.money(total)!} />
          </Card>
          <Small style={{ color: C.muted }}>Free cancellation up to {settings.cancel_hours} hours before. The starter is told automatically.</Small>
        </Sec>

        {err && <ErrorBox message={err} />}
        <Btn label="Confirm booking" variant="gold" onPress={confirm} loading={busy} />
      </Scroll>
    </Page>
  );
}

function AddPlayer({ kind, exclude, onAdd, onCancel }: { kind: 'member' | 'guest'; exclude: Player[]; onAdd: (p: Player) => void; onCancel: () => void }) {
  const [q, setQ] = useState('');
  const { data } = useQuery(() => (kind === 'member' && q.trim().length >= 2 ? searchMembers(q.trim()) : Promise.resolve([])), [q, kind]);
  const results = (data ?? []).filter((m) => !exclude.some((p) => p.member_id === m.id));

  return (
    <Card>
      <Label>{kind === 'member' ? 'Search members' : 'Guest’s full name'}</Label>
      <TextInput
        autoFocus
        value={q}
        onChangeText={setQ}
        placeholder={kind === 'member' ? 'Start typing a name' : 'e.g. Tom Hughes'}
        placeholderTextColor={C.faint}
        autoCapitalize="words"
        style={st.input}
        returnKeyType="done"
        onSubmitEditing={() => kind === 'guest' && q.trim() && onAdd({ name: q.trim(), kind: 'guest' })}
      />
      {kind === 'member' && results.map((m) => (
        <Row key={m.id} title={m.name} sub={m.handicap_index != null ? `Handicap index ${m.handicap_index}` : 'Member'}
          onPress={() => onAdd({ name: m.name, kind: 'member', member_id: m.id, handicap_index: m.handicap_index })} chevron={false} />
      ))}
      <Btns>
        <Btn label="Cancel" variant="line" sm onPress={onCancel} />
        {kind === 'guest' && <Btn label="Add guest" sm disabled={!q.trim()} onPress={() => onAdd({ name: q.trim(), kind: 'guest' })} />}
      </Btns>
    </Card>
  );
}

const st = StyleSheet.create({
  x: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  input: { fontSize: 15, paddingVertical: 13, paddingHorizontal: 14, borderWidth: 1, borderColor: C.gray, borderRadius: 2, color: C.blue },
});
