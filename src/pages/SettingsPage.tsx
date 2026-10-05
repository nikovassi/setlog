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
import { LANGUAGES } from '../i18n';
import { useI18n } from '../i18n/react';

export default function SettingsPage() {
  const s = useSettings();
  const toast = useToast();
  const { t, pl } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mode, setMode] = useState<ImportMode>('merge');
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [importError, setImportError] = useState('');

  const set = (patch: Parameters<typeof updateSettings>[0]) =>
    updateSettings(patch).catch(() => toast({ message: t('settings.saveFailed'), tone: 'error' }));

  async function doExportJSON() {
    try {
      const backup = await exportBackup();
      downloadFile(`setlog-backup-${todayLocal()}.json`, JSON.stringify(backup, null, 1), 'application/json');
      toast({ message: t('settings.downloaded'), detail: pl(backup.data.workouts.length, 'workout') });
    } catch {
      toast({ message: t('settings.exportFailed'), detail: t('common.tryAgain'), tone: 'error' });
    }
  }

  async function doExportCSV() {
    try {
      downloadFile(`setlog-history-${todayLocal()}.csv`, await exportCSV(), 'text/csv;charset=utf-8');
    } catch {
      toast({ message: t('settings.exportFailed'), detail: t('common.tryAgain'), tone: 'error' });
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
      setImportError(t('settings.readFailed'));
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function runImport() {
    if (!preview) return;
    try {
      await importBackup(preview.backup, mode);
      const workouts = pl(preview.counts.workouts, 'workout');
      toast({ message: t('settings.importDone'), detail: t(mode === 'replace' ? 'settings.importRestored' : 'settings.importMerged', { workouts }) });
      setPreview(null);
      setConfirmReplace(false);
    } catch {
      setConfirmReplace(false);
      toast({ message: t('settings.importFailed'), detail: t('settings.importFailedDetail'), tone: 'error' });
    }
  }

  return (
    <main className="page" id="main">
      <PageHeader title={t('settings.title')} />

      <div className="notice" role="note">
        <Icon name="shield" />
        <div>
          <strong>{t('settings.privacy')}</strong>
          <div className="small">{t('settings.privacyText')}</div>
        </div>
      </div>

      <section className="card stack" aria-labelledby="train-h">
        <h2 id="train-h">{t('settings.training')}</h2>
        <div className="field">
          <span id="rest-label">{t('settings.rest')}</span>
          <div className="chips" role="group" aria-labelledby="rest-label" style={{ flexWrap: 'wrap' }}>
            {REST_OPTIONS.map((r) => (
              <button key={r} type="button" className="chip" aria-pressed={s.defaultRest === r} onClick={() => set({ defaultRest: r })}>
                {formatClock(r)}
              </button>
            ))}
          </div>
        </div>
        <div className="switch">
          <label htmlFor="autorest">{t('settings.autoRest')}</label>
          <input id="autorest" type="checkbox" checked={s.autoRest} onChange={(e) => set({ autoRest: e.target.checked })} />
        </div>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="small muted" style={{ fontWeight: 600, marginBottom: 6 }}>
            {t('settings.progression')}
          </legend>
          <div className="row" style={{ gap: 10 }}>
            <NumberSetting label={t('prog.min')} value={s.repMin} onChange={(v) => v <= s.repMax && (set({ repMin: v }), true)} />
            <NumberSetting label={t('prog.max')} value={s.repMax} onChange={(v) => v >= s.repMin && (set({ repMax: v }), true)} />
            <NumberSetting label={t('prog.step')} value={s.weightStep} decimal onChange={(v) => (set({ weightStep: v }), true)} />
          </div>
        </fieldset>
      </section>

      <section className="card stack" aria-labelledby="look-h">
        <h2 id="look-h">{t('settings.appearance')}</h2>
        <div className="field">
          <span id="lang-label">{t('settings.language')}</span>
          <div className="chips" role="group" aria-labelledby="lang-label">
            {LANGUAGES.map((l) => (
              <button key={l.id} type="button" className="chip" lang={l.id} aria-pressed={s.language === l.id} onClick={() => set({ language: l.id })}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span id="theme-label">{t('settings.theme')}</span>
          <div className="chips" role="group" aria-labelledby="theme-label">
            {(['dark', 'light'] as const).map((theme) => (
              <button key={theme} type="button" className="chip" aria-pressed={s.theme === theme} onClick={() => set({ theme })}>
                {theme === 'dark' ? t('settings.dark') : t('settings.light')}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card" aria-labelledby="lib-h" style={{ padding: '6px 6px' }}>
        <h2 id="lib-h" className="sr-only">
          {t('settings.library')}
        </h2>
        <ul className="menu-list">
          <li>
            <Link to="/routines" className="menu-item" style={{ textDecoration: 'none' }}>
              <Icon name="list" /> {t('routines.title')}
            </Link>
          </li>
          <li>
            <Link to="/exercises" className="menu-item" style={{ textDecoration: 'none' }}>
              <Icon name="dumbbell" /> {t('exl.title')}
            </Link>
          </li>
        </ul>
      </section>

      <section className="card stack" aria-labelledby="data-h">
        <h2 id="data-h">{t('settings.data')}</h2>
        <button type="button" className="btn btn-block" onClick={doExportJSON}>
          <Icon name="download" /> {t('settings.exportJson')}
        </button>
        <button type="button" className="btn btn-block" onClick={doExportCSV}>
          <Icon name="download" /> {t('settings.exportCsv')}
        </button>
        <button type="button" className="btn btn-block" onClick={() => fileRef.current?.click()}>
          <Icon name="upload" /> {t('settings.import')}
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} aria-label={t('settings.chooseFile')} data-testid="import-input" />
        {importError && (
          <p className="notice error" role="alert">
            {importError}
          </p>
        )}
        <p className="small muted">{t('settings.csvHint')}</p>
      </section>

      <p className="small faint" style={{ textAlign: 'center' }}>
        {t('settings.footer', { v: __APP_VERSION__ })}
      </p>

      {preview && !confirmReplace && (
        <Sheet
          title={t('import.title')}
          onClose={() => setPreview(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setPreview(null)}>
                {t('common.cancel')}
              </button>
              <button type="button" className={`btn ${mode === 'replace' ? 'btn-danger' : 'btn-primary'}`} onClick={() => (mode === 'replace' ? setConfirmReplace(true) : runImport())}>
                {mode === 'replace' ? t('import.replaceBtn') : t('import.import')}
              </button>
            </>
          }
        >
          <p className="muted small">{preview.exportedAt && t('import.exported', { date: formatLongDate(preview.exportedAt.slice(0, 10)) })}</p>
          <ul className="card divider-list" style={{ padding: '0 14px' }} aria-label={t('import.contents')}>
            {(
              [
                [t('import.workouts'), preview.counts.workouts],
                [t('import.sets'), preview.counts.sets],
                [t('import.exercises'), preview.counts.exercises],
                [t('import.routines'), preview.counts.routines],
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
              {t('import.range', { from: formatLongDate(preview.dateRange.from), to: formatLongDate(preview.dateRange.to) })}
            </p>
          )}
          {preview.warnings.map((w) => (
            <p key={w} className="notice warn small">
              {w}
            </p>
          ))}
          <fieldset style={{ border: 0, padding: 0, margin: 0 }} className="stack-sm">
            <legend className="small muted" style={{ fontWeight: 600, marginBottom: 6 }}>
              {t('import.how')}
            </legend>
            <label className="card row" style={{ cursor: 'pointer' }}>
              <input type="radio" name="mode" checked={mode === 'merge'} onChange={() => setMode('merge')} />
              <span>
                <strong>{t('import.merge')}</strong>
                <span className="small muted" style={{ display: 'block' }}>
                  {t('import.mergeText')}
                </span>
              </span>
            </label>
            <label className="card row" style={{ cursor: 'pointer' }}>
              <input type="radio" name="mode" checked={mode === 'replace'} onChange={() => setMode('replace')} />
              <span>
                <strong>{t('import.replace')}</strong>
                <span className="small muted" style={{ display: 'block' }}>
                  {t('import.replaceText')}
                </span>
              </span>
            </label>
          </fieldset>
        </Sheet>
      )}
      {confirmReplace && (
        <ConfirmDialog
          title={t('import.confirmTitle')}
          message={t('import.confirmMsg')}
          confirmLabel={t('import.confirmBtn')}
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
