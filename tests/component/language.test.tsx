import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../../src/App';
import { resetDbForTests } from '../../src/db';
import { setLanguage } from '../../src/i18n';

beforeEach(async () => {
  localStorage.clear();
  setLanguage('en');
  await resetDbForTests();
  window.location.hash = '#/settings';
});

describe('language switch', () => {
  it('switches the whole UI to Bulgarian and back', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Български' }));

    expect(await screen.findByRole('heading', { name: 'Настройки', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Данните за тренировките ти се пазят локално на това устройство.')).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('bg');
    const nav = screen.getByRole('navigation', { name: 'Основна навигация' });
    expect(within(nav).getByRole('link', { name: 'Начало' })).toBeInTheDocument();

    await user.click(within(nav).getByRole('link', { name: 'Начало' }));
    await user.click(await screen.findByRole('button', { name: /започни тренировка/i }));
    await user.click(await screen.findByRole('button', { name: /^упражнение$/i }));
    const picker = await screen.findByRole('dialog', { name: 'Добави упражнения' });
    // search works with the Bulgarian name
    await user.type(within(picker).getByRole('searchbox'), 'лежанка');
    await user.click(within(picker).getByRole('button', { name: /^Лежанка Гърди/ }));
    await user.click(within(picker).getByRole('button', { name: 'Добави (1)' }));
    const card = await screen.findByRole('article', { name: /лежанка/i });
    expect(within(card).getByText('Първи път – няма предишни данни.')).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Добави серия' })).toBeInTheDocument();

    window.location.hash = '#/settings';
    await user.click(await screen.findByRole('button', { name: 'English' }));
    expect(await screen.findByRole('heading', { name: 'Settings', level: 1 })).toBeInTheDocument();
  });
});
