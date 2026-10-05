const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function todayLocal(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** "05 Oct" */
export function formatDayMonth(date: string): string {
  const [, m, d] = date.split('-').map(Number);
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]}`;
}

/** "Mon, 05 Oct 2026" */
export function formatLongDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dow = DAYS[new Date(y, m - 1, d).getDay()];
  return `${dow}, ${String(d).padStart(2, '0')} ${MONTHS[m - 1]} ${y}`;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Seconds → "48 min" / "1 h 05 min" */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds < 60) return '<1 min';
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
}

/** Seconds → "1:30" */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** 62.5 → "62.5", 60 → "60" */
export function formatWeight(w: number | null | undefined): string {
  if (w == null) return '–';
  return Number.isInteger(w) ? String(w) : String(Math.round(w * 100) / 100);
}

/** 12450 → "12 450" */
export function formatNumber(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function setLabel(weight: number | null, reps: number | null): string {
  if (!weight) return `${reps ?? 0} reps`;
  return `${formatWeight(weight)} kg × ${reps ?? 0}`;
}

/** Monday of the ISO week containing `date` (YYYY-MM-DD). */
export function weekStart(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
  return todayLocal(dt);
}
