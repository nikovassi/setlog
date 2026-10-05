import { t } from '../i18n';

/** Maps technical errors (IndexedDB, quota, etc.) to messages a user can act on. */
export function describeError(error: unknown): { title: string; message: string } {
  const name = (error as { name?: string })?.name ?? '';
  const inner = (error as { inner?: { name?: string } })?.inner?.name ?? '';
  const n = `${name} ${inner}`;
  if (/QuotaExceeded/i.test(n)) return { title: t('err.quotaTitle'), message: t('err.quota') };
  if (/MissingAPI|InvalidState|Open|Database|Version|Upgrade|Unknown/i.test(n)) return { title: t('err.dbTitle'), message: t('err.db') };
  return { title: t('err.genericTitle'), message: t('err.generic') };
}
