import { dayName, monthName, t } from '../i18n';

export function todayLocal(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** "05 Oct" / "05 окт" */
export function formatDayMonth(date: string): string {
  if (!date) return '';
  const [, m, d] = date.split('-').map(Number);
  return `${String(d).padStart(2, '0')} ${monthName(m)}`;
}

/** "Mon, 05 Oct 2026" / "пн, 05 окт 2026" */
export function formatLongDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dow = dayName(new Date(y, m - 1, d).getDay());
  return `${dow}, ${String(d).padStart(2, '0')} ${monthName(m)} ${y}`;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Seconds → "48 min" / "1 h 05 min" */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds < 60) return t('time.lessThanMin');
  const m = Math.round(seconds / 60);
  if (m < 60) return t('time.min', { m });
  return t('time.hMin', { h: Math.floor(m / 60), m: String(m % 60).padStart(2, '0') });
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
  if (!weight) return `${reps ?? 0} ${t('set.repsPh')}`;
  return `${formatWeight(weight)} ${t('common.kg')} × ${reps ?? 0}`;
}

/** Monday of the ISO week containing `date` (YYYY-MM-DD). */
export function weekStart(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
  return todayLocal(dt);
}
