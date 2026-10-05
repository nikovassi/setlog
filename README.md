# Setlog

**Log fast. Train hard. Track progress.**

Setlog is an offline-first, mobile-first workout log that runs entirely in the browser.
It is built for one job: recording what you lift between sets as quickly as possible, then showing how you progress over time.
It has no accounts, no backend, no social feed and no tracking.

🔗 **Live:** https://nikovassi.github.io/setlog/

---

## Features

**Logging (the core)**
- One-tap set logging. Each row (`set · kg · reps · RPE · ✓`) is pre-filled from your previous set or your last session, so the usual case is a single tap on ✓.
- **Last time** is shown on every exercise card, with date, weight × reps and RPE.
- **Progressive overload suggestions** use double progression: once every working set reaches the top of the rep range (default 8–12), the card suggests **+2.5 kg** for next time. Tap *Use* to apply it. The suggestion is only a guide; you always choose the weight. Rep range and weight step can be set globally or per exercise.
- **Rest timer** starts automatically when you complete a set. It offers ±15 s and skip, keeps running while you move between screens and survives a page reload. The default rest time is set in Settings (30 s – 4 min).
- **PR detection**: heaviest weight, most reps at a given weight, best estimated 1RM and best set volume. A new PR shows a small toast.
- **Supersets** group exercises as A1/A2/B1 and show a coloured rail. In a superset, the rest timer starts after the last exercise of the group.
- **Warm-up sets**, **RPE**, and **notes** on the workout, the exercise and each set.
- **Undo** after deleting a set, an exercise or a workout.
- **Unfinished-set handling**: when you finish, you can save unchecked sets that have values in them, or discard them.

**Planning & review**
- **Routines** (Push / Pull / Legs …) list their exercises, target set counts and supersets. Starting a routine loads every exercise with your last numbers. Any finished workout can be saved as a routine.
- **History** is grouped by month. Opening a workout shows every set with its volume and est. 1RM. Finished workouts can be fully edited: name, date, time, duration, sets, notes, and adding or removing exercises.
- **Exercise screen** shows personal records, *Weight over time*, *Estimated 1RM* and *Volume per session* charts, and every past session.
- **Progress dashboard** shows totals (all time, this week, this month), weekly volume and workout frequency, progression for your most trained exercises, and recent PRs.
- **Exercise library** includes 36 common exercises, plus custom exercises with name, muscle group, equipment and notes.

**Platform**
- **PWA**: installable, works offline after the first visit, standalone display, app icons, and an update prompt (it never reloads in the middle of a workout).
- **Dark mode** is the default; light mode is also available.
- **Backup**: export everything as JSON, or your workout history as CSV. You can re-import a JSON backup, with a preview and a choice of merge or replace.
- **Accessibility**: semantic HTML, ARIA labels on every control, visible focus states, keyboard support (Esc closes sheets, focus is trapped and restored), ≥ 44 px touch targets and WCAG AA contrast (checked with axe in CI).

## Tech stack

| | |
|---|---|
| UI | React 19, TypeScript (strict) |
| Build | Vite 8, vite-plugin-pwa (Workbox) |
| Storage | IndexedDB via Dexie 4 |
| Routing | React Router (HashRouter) |
| Charts | Recharts, lazy-loaded |
| Styling | Plain CSS with design tokens (no CSS framework, no web fonts, inline SVG icons) |
| Tests | Vitest, Testing Library, fake-indexeddb, Playwright, axe-core |

The initial load is about 135 kB of gzipped JS. Charts (≈107 kB gz) load only when you open *Progress* or an exercise.

## Architecture

```
React screens & components ──(read)──► useLiveQuery (Dexie liveQuery, reactive)
          │
          └──(write)──► services/*  ──► db/ (Dexie → IndexedDB)
                           │
                           └──► utils/* (pure: volume, e1RM, PRs, progression, CSV)
```

- The **UI never writes to the database directly.** All writes go through `src/services/*`, which own the transactions, denormalised fields and validation.
- **Reads are reactive.** When a workout is finished, Home, History and Progress update immediately, with no manual refresh.
- **Calculations are pure functions** in `src/utils`, which makes them easy to test.
- **PRs are computed, not stored.** Editing an old set can never leave a stale record.

```
src/
  components/   generic UI: BottomNav, Sheet/ConfirmDialog, Charts, Icon, ErrorBoundary…
  pages/        route screens
  features/
    workouts/   live workout: ExerciseCard, SetRow, rest bar, finish sheet
    exercises/  exercise picker & form
  db/           Dexie schema, migrations, seed library
  hooks/        useLiveQuery, useSettings, rest timer, toasts
  services/     workouts, routines, exercises, stats, backup, settings, errors
  utils/        calc, pr, progression, format, csv
  types/        entity types
  styles/       tokens.css (themes), base.css
tests/
  unit/         services & calculations (fake-indexeddb)
  component/    workout interactions (Testing Library)
  e2e/          Playwright: main flow, offline, sub-path, backup, themes, axe
docs/           ARCHITECTURE.md (plan), RESEARCH.md (UX research)
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full plan and [docs/RESEARCH.md](docs/RESEARCH.md) for the UX research behind it.

## Database structure

IndexedDB database `setlog`, schema version 1:

| Table | Indexes | Notes |
|---|---|---|
| `exercises` | `id, name, muscleGroup, isCustom` | Seed exercises have stable ids (`ex-bench-press`). Optional `repMin`/`repMax`/`weightStep` overrides. Custom exercises with history are archived, never hard-deleted. |
| `workouts` | `id, date, status, startTime` | `status`: `active` or `completed` (at most one active). `duration` is in seconds. |
| `workoutExercises` | `id, workoutId, exerciseId` | `order`, `notes`, `supersetGroup`. |
| `sets` | `id, workoutExerciseId, workoutId, exerciseId, timestamp` | `weight` (kg), `reps`, `rpe`, `isWarmup`, `completed`, `notes`. `workoutId`/`exerciseId` are denormalised so history queries need one index lookup. |
| `routines` | `id, name, updatedAt` | `exercises: [{ exerciseId, sets, supersetGroup }]`. |
| `settings` | `key` | `theme`, `defaultRest`, `autoRest`, `repMin`, `repMax`, `weightStep`. |

**Calculations**
- Volume = weight × reps. It only counts completed working sets; warm-ups are tracked separately.
- Estimated 1RM uses the Epley formula, weight × (1 + reps / 30). The app always labels it as an estimate.

**Migrations.** Each schema change adds a new `db.version(n + 1).stores(…).upgrade(…)` block in `src/db/index.ts`. Existing version blocks are never edited or removed, and upgrades transform data instead of dropping it. On startup, any seed exercises added in a newer release are inserted without touching user data. Backups carry `schemaVersion`; a backup from a newer app version is rejected with a clear message.

## Local development

Requires Node 20.19+ (CI uses Node 22).

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:5173/setlog/.

| Script | |
|---|---|
| `npm run dev` | dev server |
| `npm run lint` | ESLint + TypeScript |
| `npm test` | unit + component tests (Vitest) |
| `npm run build` | type-check and production build to `dist/` |
| `npm run preview` | serve `dist/` under `/setlog/` |
| `npm run test:e2e` | Playwright against the production build (run `npm run build` first) |
| `npm run icons` | regenerate the PWA icons |

To fill the app with demo data for manual testing, generate a backup and import it in *Settings → Import backup*:

```bash
node scripts/make-demo-backup.mjs > demo-backup.json
```

## Testing

- **Unit** (`tests/unit`): database CRUD, creating a workout, adding exercises and sets, editing and deleting sets with undo, supersets, finishing a workout, last-performance pre-fill, routines, volume, est. 1RM, PR detection, progression suggestions, stats, JSON/CSV export, and import validation, merge, replace and atomic rollback.
- **Component** (`tests/component`): logging a set and starting the rest timer, refusing to complete an empty set, add/edit/delete/undo of a set, applying a suggestion, finishing with a summary.
- **End-to-end** (`tests/e2e`, at 375×667, 390×844 and 412×915): Start Workout → Add Exercise → Add Set → Complete Set → reload mid-workout → Finish Workout → verify History and Progress. Also: refresh on a deep link, assets, manifest, icons and service worker under the sub-path, offline mode, export and re-import, light/dark theme, axe WCAG A/AA scans in both themes, and no console errors.

## Build & deployment

`vite.config.ts` reads `base` from `VITE_BASE` and defaults to `/setlog/`. Every asset, the manifest and the service worker are emitted under that prefix, so there are no root-absolute `/assets/…` URLs. The web manifest uses relative `start_url` and `scope` (`./`).

`.github/workflows/deploy.yml` runs on every push to `main`:

1. checkout → `npm ci`
2. `npm run lint`
3. `npm test`
4. `npm run build` with `VITE_BASE=/<repo-name>/`
5. Playwright e2e against that build
6. `actions/configure-pages` → `actions/upload-pages-artifact` → `actions/deploy-pages`

If any step fails, the deployment stops. Pull requests run steps 1–5 without deploying.

### GitHub Pages configuration (one-time)

1. Create the repository `setlog` and push `main`.
2. Open **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
3. The next push (or *Actions → Deploy to GitHub Pages → Run workflow*) publishes to `https://<user>.github.io/setlog/`.

If you rename the repository, the base path follows automatically because CI derives it from the repository name.
Routing uses URL hashes (`/setlog/#/history`), so a page refresh or a deep link works on GitHub Pages without a 404 fallback.

## Data privacy

- **Your workout data is stored locally on this device**, in the browser's IndexedDB.
- Nothing is sent to any server. There is no analytics, no tracking, no cookies and no third-party requests. Fonts and icons are bundled.
- After your first finished workout, the app asks the browser to keep its storage persistent (`navigator.storage.persist`), which reduces the chance of automatic eviction.
- Clearing site data, or uninstalling the browser, deletes your data. **Export backups regularly.**

## Backup & import

- **Settings → Export backup (JSON)** saves a complete snapshot of exercises, workouts, sets, routines and settings.
- **Settings → Export history (CSV)** saves one row per completed set: date, start time, workout, duration, exercise, muscle group, equipment, set number, type, weight, reps, RPE, volume, est. 1RM and notes. The file is UTF-8 with a BOM so Excel opens it correctly.
- **Settings → Import backup** works in four steps:
  1. **Validation.** The app checks the file type, the version and every record. A damaged or foreign file is rejected with a readable message, and nothing is written.
  2. **Preview.** You see the counts, the date range and any warnings. Orphaned entries are skipped, and missing exercises become placeholders.
  3. **Mode.** *Merge* (the default) keeps your current data. *Replace* deletes current data only after a second, explicit confirmation.
  4. **Write.** Everything is written in a single transaction, so a failure leaves the existing data untouched.

## Future improvements

Not in the MVP:

- lb units and a plate calculator
- per-exercise rest times; duration and distance exercises (cardio, planks)
- body measurements and bodyweight tracking
- weekly volume per muscle group
- deload tracking and smarter progression models
- workout recommendations
- wearable / Health Connect integration
- optional end-to-end encrypted cloud sync and accounts
- localisation (e.g. Bulgarian UI)
