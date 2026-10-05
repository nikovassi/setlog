import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';

export function PageHeader({ title, back, actions }: { title: ReactNode; back?: boolean | string; actions?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <header className="page-header">
      {back && (
        <button
          type="button"
          className="icon-btn"
          aria-label="Back"
          onClick={() => (typeof back === 'string' ? navigate(back) : window.history.length > 1 ? navigate(-1) : navigate('/'))}
        >
          <Icon name="back" />
        </button>
      )}
      <h1 className="truncate">{title}</h1>
      {actions}
    </header>
  );
}
