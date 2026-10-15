import { useState } from 'react';
import { Alert } from 'react-native';

import { BarHeader, Btn, Chip, Chips, Field, H, Label, Page, Scroll, Sec, Small, Toggle } from '@/components/ui';
import { getSettings, staffNotify, staffPostNews, staffSetCourseStatus } from '@/lib/api';
import { useQuery } from '@/lib/use-query';
import { C } from '@/theme';

const STATUSES = ['Course open', 'Course closed', 'Frost delay', 'Temporary greens', 'Buggies not permitted'];
const NEWS_CATS = ['Course', 'Clubhouse', 'Competitions', 'Local rules'];
const ALERT_CATS: [string, string][] = [['course', 'Course'], ['news', 'Club news'], ['comps', 'Competitions'], ['offers', 'Brasserie & events']];

export default function StaffPost() {
  const { data: settings } = useQuery(getSettings);
  const [status, setStatus] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [notifyStatus, setNotifyStatus] = useState(true);

  const [cat, setCat] = useState('Course');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [author, setAuthor] = useState('Club Office');
  const [pinned, setPinned] = useState(false);
  const [pushNews, setPushNews] = useState(true);
  const [posting, setPosting] = useState(false);

  const [aCat, setACat] = useState('course');
  const [aTitle, setATitle] = useState('');
  const [aBody, setABody] = useState('');
  const [sending, setSending] = useState(false);

  const curStatus = status ?? settings?.course_status ?? 'Course open';
  const curNote = note ?? settings?.course_note ?? '';

  const fail = (e: unknown) => Alert.alert('Couldn’t save', (e as Error).message);

  const saveStatus = async () => {
    setSavingStatus(true);
    try {
      await staffSetCourseStatus(curStatus, curNote);
      if (notifyStatus) await staffNotify({ category: 'course', title: curStatus, body: curNote, link: '/' });
      Alert.alert('Course status updated', notifyStatus ? 'Members who get course alerts have been notified.' : '');
    } catch (e) { fail(e); } finally { setSavingStatus(false); }
  };

  const postNews = async () => {
    setPosting(true);
    try {
      await staffPostNews({ category: cat, title: title.trim(), body: body.trim(), author: author.trim() || 'Club Office', pinned });
      if (pushNews) await staffNotify({ category: cat === 'Competitions' ? 'comps' : cat === 'Course' ? 'course' : 'news', title: title.trim(), body: body.trim().slice(0, 140), link: '/news' });
      setTitle(''); setBody(''); setPinned(false);
      Alert.alert('Posted', 'The news is live in the app.');
    } catch (e) { fail(e); } finally { setPosting(false); }
  };

  const sendAlert = async () => {
    setSending(true);
    try {
      await staffNotify({ category: aCat, title: aTitle.trim(), body: aBody.trim(), link: '/notifications' });
      setATitle(''); setABody('');
      Alert.alert('Sent', 'Members who get this kind of alert have been notified.');
    } catch (e) { fail(e); } finally { setSending(false); }
  };

  return (
    <Page>
      <BarHeader title="Post & notify" />
      <Scroll gap={32}>
        <Sec>
          <H>Course status</H>
          <Small style={{ color: C.muted }}>Shown in the green band on every member’s Home screen.</Small>
          <Chips>{STATUSES.map((s) => <Chip key={s} label={s} on={curStatus === s} onPress={() => setStatus(s)} />)}</Chips>
          <Field label="Details" value={curNote} onChange={setNote} placeholder="e.g. Temporary greens on 4 and 11" />
          <Toggle label="Notify members" sub="Push to everyone who gets course alerts" value={notifyStatus} onChange={setNotifyStatus} />
          <Btn label="Update course status" variant="gold" onPress={saveStatus} loading={savingStatus} />
        </Sec>

        <Sec>
          <H>Post news</H>
          <Label style={{ color: C.muted }}>Category</Label>
          <Chips>{NEWS_CATS.map((c) => <Chip key={c} label={c} on={cat === c} onPress={() => setCat(c)} />)}</Chips>
          <Field label="Headline" value={title} onChange={setTitle} />
          <Field label="Story" value={body} onChange={setBody} multiline />
          <Field label="From" value={author} onChange={setAuthor} />
          <Toggle label="Pin to the top" value={pinned} onChange={setPinned} />
          <Toggle label="Also send as a notification" value={pushNews} onChange={setPushNews} />
          <Btn label="Post news" variant="gold" onPress={postNews} loading={posting} disabled={!title.trim() || !body.trim()} />
        </Sec>

        <Sec>
          <H>Send an alert</H>
          <Small style={{ color: C.muted }}>Goes to every member who hasn’t switched this kind of alert off.</Small>
          <Chips>{ALERT_CATS.map(([k, l]) => <Chip key={k} label={l} on={aCat === k} onPress={() => setACat(k)} />)}</Chips>
          <Field label="Title" value={aTitle} onChange={setATitle} placeholder="e.g. Frost delay: course opens 10:00" />
          <Field label="Message" value={aBody} onChange={setABody} multiline />
          <Btn label="Send to members" variant="gold" onPress={sendAlert} loading={sending} disabled={!aTitle.trim()} />
        </Sec>
      </Scroll>
    </Page>
  );
}
