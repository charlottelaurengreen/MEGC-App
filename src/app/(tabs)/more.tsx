import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Btn, H, List, Page, Row, Scroll, Sec, Small, Title, TopHeader } from '@/components/ui';
import { useSession } from '@/lib/session';
import { C, T } from '@/theme';

const web = (url: string) => () => WebBrowser.openBrowserAsync(url);

const SOCIAL: [string, IconName, string][] = [
  ['Instagram', 'instagram', 'https://www.instagram.com/merchantsgolf'],
  ['Facebook', 'facebook', 'https://www.facebook.com/MerchantsofEdinGolfClub'],
  ['Website', 'globe', 'https://www.merchantsgolf.com/'],
];

export default function More() {
  const { member, signOut } = useSession();
  const initials = member ? `${member.first_name[0] ?? ''}${member.last_name[0] ?? ''}` : '';

  return (
    <Page>
      <TopHeader title="More" />
      <Scroll gap={26}>
        <Pressable onPress={() => router.push('/account')} accessibilityRole="button" style={st.profile}>
          <View style={st.avatar}><Text style={{ fontSize: 18, fontWeight: '700', color: C.blue }}>{initials}</Text></View>
          <View style={{ flex: 1, gap: 2 }}>
            <Title style={{ color: C.white }}>{member ? `${member.first_name} ${member.last_name}` : ''}</Title>
            <Small style={{ color: C.dim }}>{member ? `${member.category} · No. ${member.member_no}` : ''}</Small>
          </View>
          <Icon name="chevron" size={20} color={C.gold} />
        </Pressable>

        <Sec>
          <H>My account</H>
          <List>
            <Row icon="card" title="Account & billing" sub="Invoices, statement, bar card" href="/account" />
            <Row icon="calendar" title="My bookings" sub="Tee times, competitions, tables, lessons" href="/bookings" />
            <Row icon="bars" title="Handicap" sub={member?.handicap_index != null ? `Index ${member.handicap_index} · World Handicap System` : 'World Handicap System'} href="/handicap" />
            <Row icon="qr" title="Membership card" sub="QR code for entry and check-in" href="/check-in" />
            <Row icon="bell" title="Notifications" sub="Course alerts, competitions, news" href="/notifications" />
          </List>
        </Sec>

        <Sec>
          <H>Book</H>
          <List>
            <Row icon="cutlery" title="The Brasserie" sub="Brunch, lunch and dinner" href="/brasserie" />
            <Row icon="person" title="Lessons & facilities" sub="The pro, private dining, events" href="/lessons" />
          </List>
        </Sec>

        <Sec>
          <H>The club</H>
          <List>
            <Row icon="megaphone" title="Club news & local rules" sub="Notices from the club office" href="/news" />
            <Row icon="star" title="Reviews" sub="Leave us a review" onPress={web('https://www.merchantsgolf.com/#reviews')} />
            <Row icon="pin" title="Contact the club" sub="0131 447 1219 · 10 Craighill Gardens, EH10 5PY" onPress={() => Linking.openURL('tel:+441314471219')} />
          </List>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {SOCIAL.map(([label, icon, url]) => (
              <Pressable key={label} onPress={web(url)} accessibilityRole="link" style={st.soc}>
                <Icon name={icon} color={C.blue} />
                <Text style={[T.label, { fontSize: 11, color: C.blue }]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </Sec>
        <Btn label="Sign out" variant="line" onPress={signOut} />
      </Scroll>
    </Page>
  );
}

const st = StyleSheet.create({
  profile: { backgroundColor: C.blue, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 52, height: 52, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  soc: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 14, borderWidth: 1, borderColor: C.gray },
});
