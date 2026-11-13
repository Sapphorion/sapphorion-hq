// Dates are kept as 'YYYY-MM-DD' strings in local time (Africa/Johannesburg on your devices).
const pad = n => String(n).padStart(2, '0');
export const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const today = () => iso(new Date());
export const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
export const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const monthName = m => MONTHS[m];
export const nice = s => { if (!s) return ''; const d = parse(s); return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}${d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''}`; };
export const short = s => { const d = parse(s); return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`; };

// How far away a date is, in words: "today", "in 3 days", "2 days late".
export function when(s) {
  const n = daysBetween(today(), s);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  if (n < 0) return `${-n} days ago`;
  if (n < 14) return `in ${n} days`;
  if (n < 60) return `in ${Math.round(n / 7)} weeks`;
  return `in ${Math.round(n / 30)} months`;
}

export const REPEATS = [
  ['none', 'Once'],
  ['weekly', 'Every week'],
  ['monthly', 'Every month (same date)'],
  ['firstsat', 'Every month (first Saturday)'],
  ['yearly', 'Every year'],
];
export const repeatLabel = r => (REPEATS.find(x => x[0] === r) || REPEATS[0])[1];

const firstSaturday = (y, m) => { const d = new Date(y, m, 1); d.setDate(1 + ((6 - d.getDay() + 7) % 7)); return d; };

// Every date a deadline falls on between from and to (inclusive).
export function occurrences(dl, from, to) {
  const out = [];
  const start = dl.date;
  if (!start) return out;
  const r = dl.repeat || 'none';
  if (r === 'none') { if (start >= from && start <= to) out.push(start); return out; }
  const s = parse(start);
  let guard = 0;
  if (r === 'weekly') {
    let d = s;
    if (iso(d) < from) d = parse(addDays(start, Math.ceil(daysBetween(start, from) / 7) * 7));
    while (iso(d) <= to && guard++ < 600) { out.push(iso(d)); d = parse(addDays(iso(d), 7)); }
    return out;
  }
  const f = parse(from);
  let y = Math.max(s.getFullYear(), f.getFullYear() - 1);
  let m = r === 'yearly' ? s.getMonth() : (y === s.getFullYear() ? s.getMonth() : 0);
  while (guard++ < 600) {
    let d;
    if (r === 'yearly') d = new Date(y, s.getMonth(), Math.min(s.getDate(), new Date(y, s.getMonth() + 1, 0).getDate()));
    else if (r === 'monthly') d = new Date(y, m, Math.min(s.getDate(), new Date(y, m + 1, 0).getDate()));
    else d = firstSaturday(y, m);
    const k = iso(d);
    if (k > to) break;
    if (k >= from && k >= start) out.push(k);
    if (r === 'yearly') y++; else { m++; if (m > 11) { m = 0; y++; } }
  }
  return out;
}

// The next date a deadline falls on, from today on (or its last date if it's in the past and doesn't repeat).
export function nextDate(dl, from = today()) {
  const hit = occurrences(dl, from, addDays(from, 800))[0];
  return hit || ((dl.repeat || 'none') === 'none' ? dl.date : '');
}
