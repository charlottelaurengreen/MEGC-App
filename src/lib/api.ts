import { supabase } from './supabase';

// ─── Types (mirror supabase/schema.sql) ────────────────────────────────────

export type AlertPrefs = { course: boolean; tee: boolean; comps: boolean; news: boolean; offers: boolean };

export type Member = {
  id: string;
  member_no: string;
  first_name: string;
  last_name: string;
  category: string;
  handicap_index: number | null;
  low_index: number | null;
  valid_to: string | null;
  account_balance: number;
  bar_balance: number;
  is_staff: boolean;
  alert_prefs: AlertPrefs;
};

export type Settings = {
  course_status: string;
  course_note: string;
  member_advance_days: number;
  cancel_hours: number;
  guest_fee: number | null;
  buggy_price: number | null;
  trolley_price: number | null;
  payments_url: string | null;
  club_phone: string;
};

export type Hole = { hole: number; par: number; yards: number; stroke_index: number; green_lat: number | null; green_lng: number | null };

export type SheetSlot = {
  slot_id: string;
  starts_at: string;
  capacity: number;
  booked: number;
  blocked_reason: string | null;
  my_booking_id: string | null;
};

export type Player = { name: string; kind: 'member' | 'guest'; member_id?: string; handicap_index?: number | null };

export type TeeBooking = {
  id: string;
  players: Player[];
  buggy: boolean;
  trolley: boolean;
  whs_prereg: boolean;
  status: 'confirmed' | 'cancelled';
  checked_in_at: string | null;
  tee_slots: { starts_at: string };
};

export type NewsPost = { id: string; category: string; title: string; body: string; author: string; pinned: boolean; published_at: string };
export type Notice = { id: string; category: string; title: string; body: string; link: string | null; created_at: string };

export type ClubEvent = {
  id: string;
  kind: 'Competition' | 'Social' | 'League';
  title: string;
  starts_at: string;
  summary: string;
  format: string | null;
  fee_text: string | null;
  prizes: string | null;
  entries_close_at: string | null;
  capacity: number | null;
  pairs: boolean;
  is_live: boolean;
  entries_count: number;
};
export type EventEntry = { id: string; event_id: string; partner_name: string | null; preferred_start: string | null };

export type LeaderRow = { member_id: string; name: string; thru: number; gross: number; gross_to_par: number; net_to_par: number };

export type HoleScore = { s: number; p: number; fw: 'Yes' | 'No' | 'n/a' } | null;
export type Round = {
  id: string;
  event_id: string | null;
  played_on: string;
  course_handicap: number;
  marker_name: string | null;
  holes: HoleScore[];
  status: 'in_progress' | 'submitted';
};

export type DiningBooking = { id: string; starts_at: string; party_size: number; requests: string | null; status: string };
export type LessonType = { id: string; title: string; subtitle: string; price: number | null; minutes: number };
export type LessonSlot = { id: string; starts_at: string; booked_by: string | null; lesson_type_id: string | null };
export type Txn = { id: string; description: string; amount: number; created_at: string };
export type Invoice = { id: string; number: string; title: string; issued_on: string; amount: number; status: 'Paid' | 'Due'; pdf_url: string | null };

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Unwraps a Supabase response, turning database errors into readable messages. */
async function run<T = unknown>(p: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as T;
}

const uid = async () => {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('Not signed in');
  return id;
};

// ─── Members & settings ────────────────────────────────────────────────────

export const getMe = async () => run<Member>(supabase.from('members').select('*').eq('id', await uid()).single());
export const getSettings = () => run<Settings>(supabase.from('club_settings').select('*').single());
export const setAlertPrefs = (prefs: AlertPrefs) => run(supabase.rpc('set_alert_prefs', { p_prefs: prefs }));
export const searchMembers = (q: string) =>
  run<{ id: string; name: string; handicap_index: number | null }[]>(supabase.rpc('member_directory', { p_search: q }));

// ─── Course ────────────────────────────────────────────────────────────────

export const getHoles = () => run<Hole[]>(supabase.from('course_holes').select('*').order('hole'));

// ─── Tee times ─────────────────────────────────────────────────────────────

export const getTeeSheet = (day: string) => run<SheetSlot[]>(supabase.rpc('tee_sheet', { p_day: day }));

export const getSlot = (id: string) =>
  run<{ id: string; starts_at: string; capacity: number }>(supabase.from('tee_slots').select('id, starts_at, capacity').eq('id', id).single());

export const bookTeeTime = (slot: string, players: Player[], buggy: boolean, trolley: boolean, prereg: boolean) =>
  run<string>(supabase.rpc('book_tee_time', { p_slot: slot, p_players: players, p_buggy: buggy, p_trolley: trolley, p_prereg: prereg }));

export const cancelTeeBooking = (id: string) => run(supabase.rpc('cancel_tee_booking', { p_booking: id }));
export const checkIn = (id: string) => run<string>(supabase.rpc('check_in', { p_booking: id }));

const teeSelect = 'id, players, buggy, trolley, whs_prereg, status, checked_in_at, tee_slots!inner(starts_at)';

export const getTeeBooking = (id: string) => run<TeeBooking>(supabase.from('tee_bookings').select(teeSelect).eq('id', id).single());

export const getMyTeeBookings = async (when: 'upcoming' | 'past') => {
  // A round stays "upcoming" until 30 minutes after its tee time, so check-in still finds it.
  const now = new Date(Date.now() - 30 * 60_000).toISOString();
  let q = supabase.from('tee_bookings').select(teeSelect).eq('member_id', await uid());
  q = when === 'upcoming'
    ? q.gte('tee_slots.starts_at', now).eq('status', 'confirmed').order('starts_at', { referencedTable: 'tee_slots', ascending: true })
    : q.lt('tee_slots.starts_at', now).order('starts_at', { referencedTable: 'tee_slots', ascending: false }).limit(20);
  const rows = await run<TeeBooking[]>(q);
  return rows.sort((a, b) => (a.tee_slots.starts_at < b.tee_slots.starts_at ? -1 : 1) * (when === 'upcoming' ? 1 : -1));
};

// ─── News & notifications ──────────────────────────────────────────────────

export const getNews = () =>
  run<NewsPost[]>(supabase.from('news_posts').select('*').order('pinned', { ascending: false }).order('published_at', { ascending: false }).limit(50));

export const getNotifications = () =>
  run<Notice[]>(supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50));

// ─── Events & competitions ─────────────────────────────────────────────────

export const getEvents = () =>
  run<ClubEvent[]>(
    supabase.from('events').select('*')
      .or(`starts_at.gte.${new Date(Date.now() - 12 * 3_600_000).toISOString()},is_live.eq.true`)
      .order('starts_at'),
  );
export const getEvent = (id: string) => run<ClubEvent>(supabase.from('events').select('*').eq('id', id).single());
export const getMyEntry = async (eventId: string) =>
  run<EventEntry | null>(supabase.from('event_entries').select('*').eq('event_id', eventId).eq('member_id', await uid()).maybeSingle());
export const getMyEntries = async () =>
  run<(EventEntry & { events: ClubEvent })[]>(supabase.from('event_entries').select('*, events!inner(*)').eq('member_id', await uid()));
export const enterEvent = (id: string, partner: string, start: string, places = 1) =>
  run<string>(supabase.rpc('enter_event', { p_event: id, p_partner: partner, p_start: start, p_places: places }));
export const withdrawFromEvent = (id: string) => run(supabase.rpc('withdraw_from_event', { p_event: id }));
export const getLeaderboard = (id: string) => run<LeaderRow[]>(supabase.rpc('event_leaderboard', { p_event: id }));

// ─── Scorecards & handicap ─────────────────────────────────────────────────

export const getOpenRound = async () =>
  run<Round | null>(
    supabase.from('rounds').select('*').eq('member_id', await uid()).eq('status', 'in_progress')
      .order('updated_at', { ascending: false }).limit(1).maybeSingle(),
  );

export const startRound = async (courseHandicap: number, eventId: string | null) =>
  run<Round>(
    supabase.from('rounds')
      .insert({ member_id: await uid(), course_handicap: courseHandicap, event_id: eventId, holes: Array(18).fill(null) })
      .select().single(),
  );

export const saveRound = (id: string, patch: Partial<Pick<Round, 'holes' | 'marker_name' | 'status'>>) =>
  run(supabase.from('rounds').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id));

export const getHandicapRecords = async () =>
  run<{ id: string; played_on: string; differential: number }[]>(
    supabase.from('handicap_records').select('id, played_on, differential').eq('member_id', await uid())
      .order('played_on', { ascending: false }).limit(20),
  );

// ─── Brasserie ─────────────────────────────────────────────────────────────

export const getDiningAvailability = (day: string) =>
  run<{ time_label: string; covers_left: number }[]>(supabase.rpc('dining_availability', { p_day: day }));
export const bookTable = (day: string, time: string, party: number, requests: string) =>
  run<string>(supabase.rpc('book_table', { p_day: day, p_time: time, p_party: party, p_requests: requests }));
export const cancelTable = (id: string) => run(supabase.rpc('cancel_table', { p_booking: id }));
export const getMyTables = async (when: 'upcoming' | 'past') => {
  const now = new Date().toISOString();
  const q = supabase.from('dining_bookings').select('*').eq('member_id', await uid());
  return run<DiningBooking[]>(
    when === 'upcoming'
      ? q.gte('starts_at', now).eq('status', 'confirmed').order('starts_at')
      : q.lt('starts_at', now).order('starts_at', { ascending: false }).limit(20),
  );
};

// ─── Lessons ───────────────────────────────────────────────────────────────

export const getLessonTypes = () => run<LessonType[]>(supabase.from('lesson_types').select('*').order('sort'));
export const getFreeLessonSlots = () =>
  run<LessonSlot[]>(
    supabase.from('lesson_slots').select('*').is('booked_by', null)
      .gte('starts_at', new Date().toISOString()).order('starts_at').limit(12),
  );
export const bookLesson = (slot: string, type: string) => run(supabase.rpc('book_lesson', { p_slot: slot, p_type: type }));
export const cancelLesson = (slot: string) => run(supabase.rpc('cancel_lesson', { p_slot: slot }));
export const getMyLessons = async (when: 'upcoming' | 'past') => {
  const now = new Date().toISOString();
  const q = supabase.from('lesson_slots').select('*, lesson_types(title)').eq('booked_by', await uid());
  return run<(LessonSlot & { lesson_types: { title: string } | null })[]>(
    when === 'upcoming' ? q.gte('starts_at', now).order('starts_at') : q.lt('starts_at', now).order('starts_at', { ascending: false }).limit(20),
  );
};

// ─── Account ───────────────────────────────────────────────────────────────

export const getTransactions = async () =>
  run<Txn[]>(supabase.from('transactions').select('*').eq('member_id', await uid()).order('created_at', { ascending: false }).limit(30));
export const getInvoices = async () =>
  run<Invoice[]>(supabase.from('invoices').select('*').eq('member_id', await uid()).order('issued_on', { ascending: false }).limit(12));
