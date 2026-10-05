import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/react';
import { formatClock } from '../../utils/format';

export function Elapsed({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now());
  const { t } = useI18n();
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="elapsed" aria-label={t('workout.elapsed')}>
      {formatClock((now - Date.parse(since)) / 1000)}
    </span>
  );
}
