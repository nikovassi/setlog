import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { ConfirmDialog, Sheet } from '../components/Sheet';
import { useSettings } from '../hooks/useSettings';
import { useToast } from '../hooks/toast';
import { downloadFile, exportBackup, exportCSV, importBackup, parseBackup, type ImportMode, type ImportPreview } from '../services/backup';
import { REST_OPTIONS, updateSettings } from '../services/settings';
import { formatClock, formatLongDate, todayLocal } from '../utils/format';

export default function SettingsPage() {
  const s = useSettings();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mode, setMode] = useState<ImportMode>('merge');
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [importError, setImportError] = useState('');

  const set = (patch: Parameters<typeof updateSettings>[0]) =>
    updateSettings(patch).catch(() => toast({ message: 'Could not save the setting.', tone: 'error' }));

  async function doExportJSON() {
    try {
      const backup = await exportBackup();
      downloadFile(`setlog-backup-${todayLocal()}.json`, JSON.stringify(backup, null, 1), 'application/json');
      toast({ message: 'Backup downloaded', detail: `${backup.data.workouts.length} workouts` });
    } catch {
      toast({ message: 'Export failed.', detail: 'Please try again.', tone: 'error' });
    }
  }

  async function doExportCSV() {
    try {
      downloadFile(`setlog-history-${todayLocal()}.csv`, await exportCSV(), 'text/csv;charset=utf-8');
    } catch {
      toast({ message: 'Export failed.', detail: 'Please try again.', tone: 'error' });
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setImportError('');
    try {
      const res = parseBackup(await file.text());
      if (res.ok) {
        setMode('merge');
        setPreview(res.preview);
      } else setImportError(res.error);
    } catch {
      setImportError('The file could not be read.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function runImport() {
    if (!preview) return;
    try {
      await importBackup(preview.backup, mode);
      toast({ message: 'Import complete', detail: `${preview.counts.workouts} workouts ${mode === 'replace' ? 'restored' : 'merged'}` });
      setPreview(null);
      setConfirmReplace(false);
    } catch {
      setConfirmReplace(false);
      toast({ message: 'Import failed – nothing was changed.', detail: 'Your existing data is untouched.', tone: 'error' });
    }
  }

  return (
    <main className="page" id="main">
      <PageHeader title="Settings" />

      <div className="notice" role="note">
        <Icon name="shield" />
        <div>
          <strong>Your workout data is stored locally on this device.</strong>
          <div className="small">Nothing is sent to a server and there is no tracking. Export a backup regularly – clearing browser data deletes it.</div>
        </div>
      </div>

      <section className="card stack" aria-labelledby="train-h">
        <h2 id="train-h">Training</h2>
        <div className="field">
          <span id="rest-label">Default rest time</span>
          <div className="chips" role="group" aria-labelledby="rest-label" style={{ flexWrap: 'wrap' }}>
            {REST_OPTIONS.map((r) => (
              <button key={r} type="button" className="chip" aria-pressed={s.defaultRest === r} onClick={() => set({ defaultRest: r })}>
                {formatClock(r)}
              </button>
            ))}
          </div>
        </div>
        <div className="switch">
          <label htmlFor="autorest">Start rest timer when a set is completed</label>
          <input id="autorest" type="checkbox" checked={s.autoRest} onChange={(e) => set({ autoRest: e.target.checked })} />
        </div>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="small muted" style={{ fontWeight: 600, marginBottom: 6 }}>
            Default progression (each exercise can override)
          </legend>
          <div className="row" style={{ gap: 10 }}>
            <NumberSetting label="Min reps" value={s.repMin} onChange={(v) => v <= s.repMax && (set({ repMin: v }), true)} />
            <NumberSetting label="Max reps" value={s.repMax} onChange={(v) => v >= s.repMin && (set({ repMax: v }), true)} />
            <NumberSetting label="Step (kg)" value={s.weightStep} decimal onChange={(v) => (set({ weightStep: v }), true)} />
          </div>
        </fieldset>
      </section>

      <section className="card stack" aria-labelledby="look-h">
        <h2 id="look-h">Appearance</h2>
        <div className="chips" role="group" aria-label="Theme">
          {(['dark', 'light'] as const).map((t) => (
            <button key={t} type="button" className="chip" aria-pressed={s.theme === t} onClick={() => set({ theme: t })}>
              {t === 'dark' ? 'Dark' : 'Light'}
            </button>
          ))}
        </div>
      </section>

      <section className="card" aria-labelledby="lib-h" style={{ padding: '6px 6px' }}>
        <h2 id="lib-h" className="sr-only">
          Library
        </h2>
        <ul className="menu-list">
          <li>
            <Link to="/routines" className="menu-item" style={{ textDecoration: 'none' }}>
              <Icon name="list" /> Routines
            </Link>
          </li>
          <li>
            <Link to="/exercises" className="menu-item" style={{ textDecoration: 'none' }}>
              <Icon name="dumbbell" /> Exercises
            </Link>
          </li>
        </ul>
      </section>

      <section className="card stack" aria-labelledby="data-h">
        <h2 id="data-h">Data</h2>
        <button type="button" className="btn btn-block" onClick={doExportJSON}>
          <Icon name="download" /> Export backup (JSON)
        </button>
        <button type="button" className="btn btn-block" onClick={doExportCSV}>
          <Icon name="download" /> Export history (CSV)
        </button>
        <button type="button" className="btn btn-block" onClick={() => fileRef.current?.click()}>
          <Icon name="upload" /> Import backup
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} aria-label="Choose backup file" data-testid="import-input" />
        {importError && (
          <p className="notice error" role="alert">
            {importError}
          </p>
        )}
        <p className="small muted">CSV has one row per set (date, exercise, weight, reps, RPE, volume, est. 1RM) and opens in Excel or Google Sheets.</p>
      </section>

      <p className="small faint" style={{ textAlign: 'center' }}>
        Setlog {__APP_VERSION__} · works offline · est. 1RM values are estimates
      </p>

      {preview && !confirmReplace && (
        <Sheet
          title="Import backup"
          onClose={() => setPreview(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setPreview(null)}>
                Cancel
              </button>
              <button type="button" className={`btn ${mode === 'replace' ? 'btn-danger' : 'btn-primary'}`} onClick={() => (mode === 'replace' ? setConfirmReplace(true) : runImport())}>
                {mode === 'replace' ? 'Replace data…' : 'Import'}
              </button>
            </>
          }
        >
          <p className="muted small">{preview.exportedAt && `Exported ${formatLongDate(preview.exportedAt.slice(0, 10))}`}</p>
          <ul className="card divider-list" style={{ padding: '0 14px' }} aria-label="Backup contents">
            {(
              [
                ['Workouts', preview.counts.workouts],
                ['Sets', preview.counts.sets],
                ['Exercises', preview.counts.exercises],
                ['Routines', preview.counts.routines],
              ] as const
            ).map(([k, v]) => (
              <li key={k} className="spread" style={{ minHeight: 40 }}>
                <span>{k}</span>
                <strong className="num">{v}</strong>
              </li>
            ))}
          </ul>
          {preview.dateRange && (
            <p className="small muted">
              Workouts from {formatLongDate(preview.dateRange.from)} to {formatLongDate(preview.dateRange.to)}
            </p>
          )}
          {preview.warnings.map((w) => (
            <p key={w} className="notice warn small">
              {w}
            </p>
          ))}
          <fieldset style={{ border: 0, padding: 0, margin: 0 }} className="stack-sm">
            <legend className="small muted" style={{ fontWeight: 600, marginBottom: 6 }}>
              How to import
            </legend>
            <label className="card row" style={{ cursor: 'pointer' }}>
              <input type="radio" name="mode" checked={mode === 'merge'} onChange={() => setMode('merge')} />
              <span>
                <strong>Merge</strong>
                <span className="small muted" style={{ display: 'block' }}>
                  Keep current data and add the backup. Same entries are updated.
                </span>
              </span>
            </label>
            <label className="card row" style={{ cursor: 'pointer' }}>
              <input type="radio" name="mode" checked={mode === 'replace'} onChange={() => setMode('replace')} />
              <span>
                <strong>Replace</strong>
                <span className="small muted" style={{ display: 'block' }}>
                  Delete everything on this device, then restore the backup.
                </span>
              </span>
            </label>
          </fieldset>
        </Sheet>
      )}
      {confirmReplace && (
        <ConfirmDialog
          title="Replace all data?"
          message="All workouts, routines and custom exercises on this device will be deleted and replaced with the backup. This cannot be undone."
          confirmLabel="Delete & replace"
          danger
          onCancel={() => setConfirmReplace(false)}
          onConfirm={runImport}
        />
      )}
    </main>
  );
}

function NumberSetting({ label, value, decimal, onChange }: { label: string; value: number; decimal?: boolean; onChange: (v: number) => boolean }) {
  const [draft, setDraft] = useState(String(value));
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setDraft(String(value));
  }
  return (
    <label className="field grow">
      <span>{label}</span>
      <input
        className="input"
        inputMode={decimal ? 'decimal' : 'numeric'}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const n = decimal ? parseFloat(draft.replace(',', '.')) : parseInt(draft, 10);
          if (!(n > 0 && n < 1000 && onChange(n))) setDraft(String(value));
        }}
      />
    </label>
  );
}
