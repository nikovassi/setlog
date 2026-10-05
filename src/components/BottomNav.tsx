import { NavLink } from 'react-router-dom';
import { Icon, type IconName } from './Icon';

const ITEMS: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/workout', label: 'Workout', icon: 'dumbbell' },
  { to: '/history', label: 'History', icon: 'history' },
  { to: '/progress', label: 'Progress', icon: 'chart' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

export function BottomNav({ workoutActive }: { workoutActive: boolean }) {
  return (
    <nav className="bottom-nav" aria-label="Main">
      <ul>
        {ITEMS.map((it) => (
          <li key={it.to}>
            <NavLink to={it.to} end={it.to === '/'}>
              <Icon name={it.icon} />
              {it.label}
              {it.to === '/workout' && workoutActive && <span className="nav-dot" aria-label="Workout in progress" role="img" />}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
