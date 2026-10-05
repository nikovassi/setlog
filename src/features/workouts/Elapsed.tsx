import { useEffect, useState } from 'react';
import { formatClock } from '../../utils/format';

export function Elapsed({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="elapsed" aria-label="Elapsed time">
      {formatClock((now - Date.parse(since)) / 1000)}
    </span>
  );
}
