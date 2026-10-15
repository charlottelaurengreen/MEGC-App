// All club times are shown in UK time, whatever the phone's own time zone.
const TZ = 'Europe/London';

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, ...opts });
const timeF = fmt({ hour: '2-digit', minute: '2-digit', hour12: false });
const longDayF = fmt({ weekday: 'long', day: 'numeric', month: 'long' });
const shortDayF = fmt({ weekday: 'short', day: 'numeric', month: 'short' });
const dowF = fmt({ weekday: 'short' });
const dayNumF = fmt({ day: 'numeric' });
const monF = fmt({ month: 'short' });
const isoF = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

const d = (v: string | Date) => (typeof v === 'string' ? new Date(v) : v);

const fullDateF = fmt({ day: 'numeric', month: 'long', year: 'numeric' });
export const fullDate = (v: string | Date) => fullDateF.format(d(v));
export const time =(v: string | Date) => timeF.format(d(v));
export const longDay = (v: string | Date) => longDayF.format(d(v));
export const shortDay = (v: string | Date) => shortDayF.format(d(v));
export const dow = (v: string | Date) => dowF.format(d(v));
export const dayNum = (v: string | Date) => dayNumF.format(d(v));
export const mon = (v: string | Date) => monF.format(d(v)).toUpperCase();
/** UK calendar date as YYYY-MM-DD. */
export const isoDay = (v: string | Date) => isoF.format(d(v));

/** The next `n` UK calendar days, starting today. */
export function nextDays(n: number) {
  const out: { iso: string; dow: string; num: string; date: Date }[] = [];
  for (let i = 0; i < n; i++) {
    const date = new Date(Date.now() + i * 86_400_000);
    out.push({ iso: isoDay(date), dow: dow(date), num: dayNum(date), date });
  }
  return out;
}

export const money = (n: number | null | undefined) =>
  n == null ? null : `£${Math.abs(n).toFixed(2)}`;

export function ago(v: string) {
  const mins = Math.round((Date.now() - new Date(v).getTime()) / 60_000);
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.round(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return shortDay(v);
}

export function greeting() {
  const h = Number(fmt({ hour: 'numeric', hour12: false }).format(new Date()));
  return h < 12 ? 'Good morning,' : h < 18 ? 'Good afternoon,' : 'Good evening,';
}
