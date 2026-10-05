import { db } from '../db';
import { detectLanguage } from '../i18n';
import type { SettingRow, Settings } from '../types';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  language: detectLanguage(),
  defaultRest: 90,
  autoRest: true,
  repMin: 8,
  repMax: 12,
  weightStep: 2.5,
};

export const REST_OPTIONS = [30, 60, 90, 120, 180, 240];

export function settingsFromRows(rows: SettingRow[]): Settings {
  const s: Settings = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    if (r.key === 'language' && r.value !== 'en' && r.value !== 'bg') continue;
    if (r.key in DEFAULT_SETTINGS && typeof r.value === typeof DEFAULT_SETTINGS[r.key]) {
      (s as unknown as Record<string, unknown>)[r.key] = r.value;
    }
  }
  return s;
}

export async function getSettings(): Promise<Settings> {
  return settingsFromRows(await db.settings.toArray());
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  await db.settings.bulkPut(Object.entries(patch).map(([key, value]) => ({ key, value }) as SettingRow));
}
