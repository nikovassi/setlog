import { Component, type ReactNode } from 'react';
import { t } from '../i18n';
import { describeError } from '../services/errors';

interface State {
  error: unknown;
}

/** Shows a readable message instead of a blank screen or a stack trace. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  componentDidCatch(error: unknown) {
    console.warn('[setlog] UI error', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const { title, message } = describeError(this.state.error);
    return <FatalScreen title={title} message={message} />;
  }
}

export function FatalScreen({ title, message }: { title: string; message: string }) {
  return (
    <main className="fatal">
      <div className="card" role="alert">
        <h1 style={{ fontSize: '1.3rem' }}>{title}</h1>
        <p className="muted">{message}</p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          {t('err.reload')}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            window.location.hash = '#/';
            window.location.reload();
          }}
        >
          {t('err.home')}
        </button>
      </div>
    </main>
  );
}
