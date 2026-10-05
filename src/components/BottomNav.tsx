import { NavLink } from 'react-router-dom';
import { useI18n } from '../i18n/react';
import type { MessageKey } from '../i18n';
import { Icon, type IconName } from './Icon';

const ITEMS: { to: string; label: MessageKey; icon: IconName }[] = [
  { to: '/', label: 'nav.home', icon: 'home' },
  { to: '/workout', label: 'nav.workout', icon: 'dumbbell' },
  { to: '/history', label: 'nav.history', icon: 'history' },
  { to: '/progress', label: 'nav.progress', icon: 'chart' },
  { to: '/settings', label: 'nav.settings', icon: 'settings' },
];

export function BottomNav({ workoutActive }: { workoutActive: boolean }) {
  const { t } = useI18n();
  return (
    <nav className="bottom-nav" aria-label={t('nav.main')}>
      <ul>
        {ITEMS.map((it) => (
          <li key={it.to}>
            <NavLink to={it.to} end={it.to === '/'}>
              <Icon name={it.icon} />
              {t(it.label)}
              {it.to === '/workout' && workoutActive && <span className="nav-dot" aria-label={t('nav.inProgress')} role="img" />}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
