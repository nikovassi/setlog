import { lazy, Suspense, useEffect } from 'react';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { ErrorBoundary } from './components/ErrorBoundary';
import { UpdatePrompt } from './components/UpdatePrompt';
import { RestBar } from './features/workouts/RestBar';
import { RestTimerProvider } from './hooks/restTimer';
import { ToastProvider } from './hooks/toast';
import { useActiveWorkout } from './hooks/useActiveWorkout';
import { useSettings } from './hooks/useSettings';
import HomePage from './pages/HomePage';
import WorkoutPage from './pages/WorkoutPage';

// Secondary screens are split out so the first load (Home / Workout) stays small.
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const WorkoutDetailPage = lazy(() => import('./pages/WorkoutDetailPage'));
const ProgressPage = lazy(() => import('./pages/ProgressPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ExerciseDetailPage = lazy(() => import('./pages/ExerciseDetailPage'));
const ExercisesPage = lazy(() => import('./pages/ExercisesPage'));
const RoutinesPage = lazy(() => import('./pages/RoutinesPage'));
const RoutineEditorPage = lazy(() => import('./pages/RoutineEditorPage'));

function useTheme() {
  const { theme } = useSettings();
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') root.dataset.theme = 'light';
    else delete root.dataset.theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f3f4f6' : '#0b0d10');
    try {
      localStorage.setItem('setlog.theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);
}

function Shell() {
  useTheme();
  const { pathname } = useLocation();
  const active = useActiveWorkout();
  // The live workout and the routine editor have their own action bar instead of the main nav.
  const ownBar = (pathname === '/workout' && !!active) || pathname.startsWith('/routines/');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="app">
      <a href="#main" className="skip-link" onClick={(e) => {
          e.preventDefault();
          const main = document.getElementById('main');
          main?.setAttribute('tabindex', '-1');
          main?.focus();
        }}>
        Skip to content
      </a>
      <ErrorBoundary>
        <Suspense fallback={<main className="page" aria-busy="true" />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/workout" element={<WorkoutPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/history/:id" element={<WorkoutDetailPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/exercises" element={<ExercisesPage />} />
            <Route path="/exercise/:id" element={<ExerciseDetailPage />} />
            <Route path="/routines" element={<RoutinesPage />} />
            <Route path="/routines/:id" element={<RoutineEditorPage />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
      <RestBar aboveWorkoutBar={ownBar} />
      {!ownBar && <BottomNav workoutActive={!!active} />}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <RestTimerProvider>
        <HashRouter>
          <Shell />
        </HashRouter>
        {import.meta.env.PROD && <UpdatePrompt />}
      </RestTimerProvider>
    </ToastProvider>
  );
}
