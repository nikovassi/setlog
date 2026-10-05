/** Maps technical errors (IndexedDB, quota, etc.) to messages a user can act on. */
export function describeError(error: unknown): { title: string; message: string } {
  const name = (error as { name?: string })?.name ?? '';
  const inner = (error as { inner?: { name?: string } })?.inner?.name ?? '';
  const n = `${name} ${inner}`;
  if (/QuotaExceeded/i.test(n)) {
    return { title: 'Storage is full', message: 'Your device has run out of space for Setlog. Free up some storage, then reload. Your existing workouts are kept.' };
  }
  if (/MissingAPI|InvalidState|Open|Database|Version|Upgrade|Unknown/i.test(n)) {
    return {
      title: 'Local storage is unavailable',
      message: 'Setlog could not open its on-device database. This can happen in private browsing mode, when site data is blocked, or when another tab is updating the app. Close other Setlog tabs and reload.',
    };
  }
  return { title: 'Something went wrong', message: 'An unexpected error occurred. Your saved workouts are not affected. Please reload the app.' };
}
