import { BarHeader, H, List, Page, Row, Scroll, Sec, Small } from '@/components/ui';
import { C } from '@/theme';

export default function StaffHome() {
  return (
    <Page>
      <BarHeader title="Staff" />
      <Scroll>
        <Small style={{ color: C.muted }}>Only club staff can see these screens.</Small>
        <Sec>
          <H>Today</H>
          <List>
            <Row icon="calendar" title="Tee sheet" sub="Bookings, check-in, block times" href="/staff/tee-sheet" />
            <Row icon="qr" title="Scan a membership card" sub="Check members in with the camera" href="/staff/scan" />
          </List>
        </Sec>
        <Sec>
          <H>Members’ app</H>
          <List>
            <Row icon="megaphone" title="Course status, news & alerts" sub="Update Home, post news, send a push notification" href="/staff/post" />
            <Row icon="trophy" title="Events & competitions" sub="Add events, open entries, run live leaderboards" href="/staff/events" />
          </List>
        </Sec>
        <Sec>
          <H>Handicaps</H>
          <List>
            <Row icon="pencil" title="Submitted scorecards" sub="Post to WHS and update members’ indexes" href="/staff/cards" />
          </List>
        </Sec>
        <Small style={{ color: C.muted }}>
          Adding or removing members is still done in the Supabase dashboard (Authentication → Users).
        </Small>
      </Scroll>
    </Page>
  );
}
