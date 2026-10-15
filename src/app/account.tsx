import * as WebBrowser from 'expo-web-browser';
import { Alert, View } from 'react-native';

import { BarHeader, Big, Btn, Btns, Empty, H, KV, Label, List, Page, Panel, Row, Rule, Scroll, Sec, Small, Tag, Title } from '@/components/ui';
import { getInvoices, getSettings, getTransactions } from '@/lib/api';
import * as f from '@/lib/format';
import { useSession } from '@/lib/session';
import { useQuery } from '@/lib/use-query';
import { C } from '@/theme';

export default function Account() {
  const { member, refreshMember } = useSession();
  const { data, reload } = useQuery(async () => {
    const [settings, invoices, txns] = await Promise.all([getSettings(), getInvoices(), getTransactions(), refreshMember()]);
    return { settings, invoices, txns };
  });

  // Payments go through the club's own payment page until in-app payments are added.
  const pay = () =>
    data?.settings.payments_url
      ? WebBrowser.openBrowserAsync(data.settings.payments_url)
      : Alert.alert('Online payment isn’t set up yet', `Please pay at the bar or the club office, or call ${data?.settings.club_phone ?? 'the club'}.`);

  const owed = member?.account_balance ?? 0;

  return (
    <Page>
      <BarHeader title="Account" />
      <Scroll gap={24} onRefresh={reload}>
        <Panel>
          <Label style={{ color: C.gold }}>{owed > 0 ? 'Account balance due' : 'Account balance'}</Label>
          <Big>{f.money(owed)}{owed < 0 ? ' CR' : ''}</Big>
          <Rule onBlue />
          <KV onBlue k="Bar & catering card" v={f.money(member?.bar_balance ?? 0)} />
          <Btns>
            <Btn label="Pay now" variant="gold" sm onPress={pay} disabled={owed <= 0} />
            <Btn label="Top up bar card" variant="onblue" sm onPress={pay} />
          </Btns>
        </Panel>

        <Sec>
          <H>Membership</H>
          <View style={{ gap: 10 }}>
            <KV k="Category" v={member?.category ?? ''} />
            <KV k="Member no." v={member?.member_no ?? ''} />
            {member?.valid_to && <KV k="Renewal" v={f.fullDate(member.valid_to + 'T12:00:00Z')} />}
          </View>
        </Sec>

        <Sec>
          <H>Invoices</H>
          {data && data.invoices.length === 0 ? <Empty>No invoices yet.</Empty> : (
            <List>
              {data?.invoices.map((v) => (
                <Row key={v.id} icon="card" title={v.title} sub={`${v.number} · ${f.shortDay(v.issued_on + 'T12:00:00Z')} · ${f.money(v.amount)}`}
                  onPress={v.pdf_url ? () => WebBrowser.openBrowserAsync(v.pdf_url!) : undefined} chevron={false}
                  right={<Tag label={v.status} tone={v.status === 'Paid' ? 'green' : 'blue'} />} />
              ))}
            </List>
          )}
        </Sec>

        <Sec>
          <H>Recent activity</H>
          {data && data.txns.length === 0 ? <Empty>No activity yet.</Empty> : (
            <View>
              {data?.txns.map((t) => (
                <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 2, borderBottomWidth: 1, borderBottomColor: C.gray }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Title style={{ fontSize: 14 }}>{t.description}</Title>
                    <Small style={{ color: C.muted }}>{f.shortDay(t.created_at)}</Small>
                  </View>
                  <Title style={{ color: t.amount > 0 ? C.green : C.blue }}>{t.amount > 0 ? '+' : '−'}{f.money(t.amount)}</Title>
                </View>
              ))}
            </View>
          )}
        </Sec>
      </Scroll>
    </Page>
  );
}
