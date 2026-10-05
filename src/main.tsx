import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { FatalScreen } from './components/ErrorBoundary';
import { initDb } from './db';
import { describeError } from './services/errors';
import './styles/tokens.css';
import './styles/base.css';

const root = createRoot(document.getElementById('root')!);

initDb()
  .then(() =>
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  )
  .catch((error) => {
    console.warn('[setlog] database initialisation failed', error);
    const { title, message } = describeError(error);
    root.render(<FatalScreen title={title} message={message} />);
  });
