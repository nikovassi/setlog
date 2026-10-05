import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

export interface ToastOptions {
  message: string;
  detail?: string;
  tone?: 'default' | 'pr' | 'error';
  action?: { label: string; onClick: () => void };
  duration?: number;
}

interface Toast extends ToastOptions {
  id: number;
}

const ToastContext = createContext<(t: ToastOptions) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const show = useCallback(
    (opts: ToastOptions) => {
      const id = ++seq.current;
      // Keep at most two toasts so the workout screen never gets covered.
      setToasts((t) => [...t.slice(-1), { ...opts, id }]);
      setTimeout(() => dismiss(id), opts.duration ?? (opts.action ? 6000 : 3500));
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone ?? 'default'}`}>
            <div className="toast-text">
              <strong>{t.message}</strong>
              {t.detail && <span>{t.detail}</span>}
            </div>
            {t.action && (
              <button
                type="button"
                className="toast-action"
                onClick={() => {
                  t.action!.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

