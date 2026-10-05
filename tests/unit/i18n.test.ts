import { afterEach, describe, expect, it } from 'vitest';
import { en } from '../../src/i18n/en';
import { bg } from '../../src/i18n/bg';
import { detectLanguage, equipmentName, exerciseName, muscleName, pl, setLanguage, t } from '../../src/i18n';
import { formatDayMonth, formatDuration, formatLongDate, setLabel } from '../../src/utils/format';
import { parseBackup } from '../../src/services/backup';

afterEach(() => {
  setLanguage('en');
  localStorage.clear();
});

describe('i18n', () => {
  it('has a Bulgarian translation for every key, with the same placeholders', () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(bg[key], key).toBeTruthy();
      const params = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
      // Bulgarian may drop a {word} placeholder where grammar is rephrased, but never invent one.
      for (const p of params(bg[key])) expect(params(en[key]), `${key} ${p}`).toContain(p);
    }
  });

  it('interpolates and pluralises in both languages', () => {
    expect(t('toast.newPR', { name: 'Bench Press' })).toBe('New PR · Bench Press');
    expect(pl(1, 'set')).toBe('1 set');
    expect(pl(3, 'set')).toBe('3 sets');
    setLanguage('bg');
    expect(t('toast.newPR', { name: 'Лежанка' })).toBe('Нов рекорд · Лежанка');
    expect(pl(1, 'set')).toBe('1 серия');
    expect(pl(3, 'exercise')).toBe('3 упражнения');
  });

  it('translates built-in exercises but never custom or renamed ones', () => {
    setLanguage('bg');
    expect(exerciseName({ name: 'Bench Press', isCustom: false })).toBe('Лежанка');
    expect(exerciseName({ name: 'My Bench', isCustom: false })).toBe('My Bench');
    expect(exerciseName({ name: 'Bench Press', isCustom: true })).toBe('Bench Press');
    expect(exerciseName(undefined)).toBe('Неизвестно упражнение');
    expect(muscleName('Chest')).toBe('Гърди');
    expect(equipmentName('Cable')).toBe('Скрипец');
    setLanguage('en');
    expect(exerciseName({ name: 'Bench Press', isCustom: false })).toBe('Bench Press');
  });

  it('formats dates, durations and weights per language', () => {
    expect(formatDayMonth('2026-10-05')).toBe('05 Oct');
    expect(formatDuration(65 * 60)).toBe('1 h 05 min');
    setLanguage('bg');
    expect(formatDayMonth('2026-10-05')).toBe('05 окт');
    expect(formatLongDate('2026-10-05')).toBe('пн, 05 окт 2026');
    expect(formatDuration(48 * 60)).toBe('48 мин');
    expect(setLabel(62.5, 8)).toBe('62.5 кг × 8');
  });

  it('localises validation messages from services', () => {
    setLanguage('bg');
    expect(parseBackup('nope')).toMatchObject({ ok: false, error: expect.stringMatching(/не е валиден JSON/) });
  });

  it('remembers the chosen language for the next start', () => {
    setLanguage('bg');
    expect(detectLanguage()).toBe('bg');
  });
});
