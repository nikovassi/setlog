import { forwardRef, useEffect, useState } from 'react';

interface Props {
  value: number | null;
  onCommit: (v: number | null) => void;
  label: string;
  decimal?: boolean;
  placeholder?: string;
  max?: number;
}

export function parseNum(raw: string, decimal: boolean, max = 9999): number | null {
  const t = raw.trim().replace(',', '.');
  if (t === '') return null;
  const n = decimal ? parseFloat(t) : parseInt(t, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(max, decimal ? Math.round(n * 100) / 100 : n);
}

/**
 * Numeric field that keeps a local draft while focused (so "62." or "7,5" can be
 * typed) and commits on every valid change and on blur.
 */
export const NumInput = forwardRef<HTMLInputElement, Props>(function NumInput({ value, onCommit, label, decimal, placeholder, max }, ref) {
  const [draft, setDraft] = useState(value == null ? '' : String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(value == null ? '' : String(value));
  }, [value, focused]);

  return (
    <input
      ref={ref}
      className="num-input"
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      pattern={decimal ? '[0-9]*[.,]?[0-9]*' : '[0-9]*'}
      enterKeyHint="done"
      autoComplete="off"
      aria-label={label}
      placeholder={placeholder}
      value={draft}
      onFocus={(e) => {
        setFocused(true);
        e.target.select();
      }}
      onChange={(e) => {
        setDraft(e.target.value);
        const n = parseNum(e.target.value, !!decimal, max);
        if (n !== null || e.target.value.trim() === '') onCommit(n);
      }}
      onBlur={() => {
        setFocused(false);
        const n = parseNum(draft, !!decimal, max);
        setDraft(n == null ? '' : String(n));
        if (n !== value) onCommit(n);
      }}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  );
});
