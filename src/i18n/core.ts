import { bg } from './bg';
import { en, type MessageKey } from './en';

export type Language = 'en' | 'bg';
export const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'bg', label: 'Български' },
];

const DICTS: Record<Language, Record<MessageKey, string>> = { en, bg };
const LANG_KEY = 'setlog.lang';

/** Saved choice first (mirrored from settings for instant startup), then the browser language. */
export function detectLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'en' || saved === 'bg') return saved;
  } catch {
    /* storage unavailable */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language : 'en';
  return nav?.toLowerCase().startsWith('bg') ? 'bg' : 'en';
}

let current: Language = detectLanguage();

export function getLanguage(): Language {
  return current;
}

/** Sets the language used by `t()` and formatters outside React (services, formatters). */
export function setLanguage(lang: Language): void {
  current = lang;
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* ignore */
  }
}

export type Params = Record<string, string | number>;

export function t(key: MessageKey, params?: Params): string {
  const msg = DICTS[current][key] ?? en[key];
  return params ? msg.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m)) : msg;
}

export type Unit = 'set' | 'exercise' | 'workout' | 'session' | 'pr' | 'rep' | 'completedSet';

/** Word only: pw(1, 'set') → "set" / "серия". English and Bulgarian both use one/other forms. */
export function pw(n: number, unit: Unit): string {
  return t(`unit.${unit}.${n === 1 ? 'one' : 'other'}` as MessageKey);
}

/** pl(3, 'set') → "3 sets" / "3 серии" */
export function pl(n: number, unit: Unit): string {
  return `${n} ${pw(n, unit)}`;
}

const MONTHS: Record<Language, { short: string[]; long: string[]; days: string[] }> = {
  en: {
    short: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    long: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  },
  bg: {
    short: ['яну', 'фев', 'мар', 'апр', 'май', 'юни', 'юли', 'авг', 'сеп', 'окт', 'ное', 'дек'],
    long: ['Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни', 'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември'],
    days: ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'],
  },
};

/** month: 1–12 */
export function monthName(month: number, style: 'short' | 'long' = 'short'): string {
  return MONTHS[current][style][month - 1];
}

export function dayName(day: number): string {
  return MONTHS[current].days[day];
}

// ---------- library translations (stored values stay English; only display changes) ----------

const BG_EXERCISES: Record<string, string> = {
  'Bench Press': 'Лежанка',
  'Incline Bench Press': 'Лежанка на наклон',
  'Dumbbell Bench Press': 'Лежанка с дъмбели',
  'Incline Dumbbell Press': 'Лежанка с дъмбели на наклон',
  'Chest Fly': 'Флайс за гърди',
  Dip: 'Кофички',
  'Push Up': 'Лицеви опори',
  Squat: 'Клек',
  'Front Squat': 'Преден клек',
  'Leg Press': 'Лег преса',
  'Leg Extension': 'Бедрено разгъване',
  'Bulgarian Split Squat': 'Български клек',
  Deadlift: 'Мъртва тяга',
  'Romanian Deadlift': 'Румънска тяга',
  'Leg Curl': 'Бедрено сгъване',
  'Hip Thrust': 'Хип тръст',
  'Calf Raise': 'Повдигане на пръсти',
  'Overhead Press': 'Раменна преса с щанга',
  'Dumbbell Shoulder Press': 'Раменна преса с дъмбели',
  'Lateral Raise': 'Странично разтваряне',
  'Face Pull': 'Фейс пул',
  'Pull Up': 'Набиране',
  'Chin Up': 'Обратно набиране',
  'Lat Pulldown': 'Вертикален скрипец',
  'Barbell Row': 'Гребане с щанга',
  'Dumbbell Row': 'Гребане с дъмбел',
  'Cable Row': 'Хоризонтален скрипец',
  'Biceps Curl': 'Бицепсово сгъване с дъмбели',
  'Barbell Curl': 'Бицепсово сгъване с щанга',
  'Hammer Curl': 'Чукове',
  'Triceps Pushdown': 'Трицепсово разгъване на скрипец',
  'Skull Crusher': 'Френско разгъване',
  'Overhead Triceps Extension': 'Трицепсово разгъване над глава',
  Plank: 'Планк',
  'Cable Crunch': 'Коремни преси на скрипец',
  'Hanging Leg Raise': 'Повдигане на крака от вис',
};

const BG_MUSCLES: Record<string, string> = {
  Chest: 'Гърди',
  Back: 'Гръб',
  Shoulders: 'Рамене',
  Biceps: 'Бицепс',
  Triceps: 'Трицепс',
  Quads: 'Квадрицепс',
  Hamstrings: 'Задно бедро',
  Glutes: 'Седалище',
  Calves: 'Прасци',
  Core: 'Корем',
  'Full body': 'Цяло тяло',
  Other: 'Друго',
};

const BG_EQUIPMENT: Record<string, string> = {
  Barbell: 'Щанга',
  Dumbbell: 'Дъмбели',
  Machine: 'Машина',
  Cable: 'Скрипец',
  Bodyweight: 'Собствено тегло',
  Kettlebell: 'Пудовка',
  Band: 'Ластик',
  Other: 'Друго',
};

/**
 * Display name of an exercise. Built-in exercises are translated as long as the
 * user has not renamed them; custom exercises are shown exactly as entered.
 */
export function exerciseName(ex: { name: string; isCustom: boolean } | undefined | null): string {
  if (!ex) return t('exercise.unknown');
  if (current === 'bg' && !ex.isCustom) return BG_EXERCISES[ex.name] ?? ex.name;
  return ex.name;
}

export function muscleName(m: string | undefined): string {
  if (!m) return '';
  return current === 'bg' ? (BG_MUSCLES[m] ?? m) : m;
}

export function equipmentName(e: string | undefined): string {
  if (!e) return '';
  return current === 'bg' ? (BG_EQUIPMENT[e] ?? e) : e;
}
