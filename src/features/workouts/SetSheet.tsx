import { useState } from 'react';
import { Sheet } from '../../components/Sheet';
import { useI18n } from '../../i18n/react';
import type { WorkoutSet } from '../../types';

const RPES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

interface Props {
  set: WorkoutSet;
  onSave: (patch: Partial<WorkoutSet>) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function SetSheet({ set, onSave, onDelete, onClose }: Props) {
  const { t } = useI18n();
  const [rpe, setRpe] = useState<number | null>(set.rpe);
  const [isWarmup, setWarmup] = useState(set.isWarmup);
  const [notes, setNotes] = useState(set.notes ?? '');

  const save = () => {
    onSave({ rpe, isWarmup, notes: notes.trim() || undefined });
    onClose();
  };

  return (
    <Sheet
      title={t('setSheet.title', { n: set.setNumber })}
      onClose={save}
      footer={
        <>
          <button type="button" className="btn btn-danger" onClick={onDelete}>
            {t('setSheet.delete')}
          </button>
          <button type="button" className="btn btn-primary" onClick={save}>
            {t('common.done')}
          </button>
        </>
      }
    >
      <div className="switch">
        <label htmlFor="warmup">
          <strong>{t('setSheet.warmup')}</strong>
          <div className="small muted">{t('setSheet.warmupHint')}</div>
        </label>
        <input id="warmup" type="checkbox" checked={isWarmup} onChange={(e) => setWarmup(e.target.checked)} />
      </div>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="small muted" style={{ fontWeight: 600, marginBottom: 6 }}>
          {t('setSheet.rpe')}
        </legend>
        <div className="chips" style={{ flexWrap: 'wrap' }}>
          {RPES.map((r) => (
            <button key={r} type="button" className="chip" aria-pressed={rpe === r} onClick={() => setRpe(rpe === r ? null : r)}>
              {r}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="field">
        <span>{t('common.note')}</span>
        <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('setSheet.notePh')} />
      </label>
    </Sheet>
  );
}
