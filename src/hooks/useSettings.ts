import { db } from '../db';
import { DEFAULT_SETTINGS, settingsFromRows } from '../services/settings';
import type { Settings } from '../types';
import { useLiveQuery } from './useLiveQuery';

export function useSettings(): Settings {
  return useLiveQuery(async () => settingsFromRows(await db.settings.toArray()), []) ?? DEFAULT_SETTINGS;
}
