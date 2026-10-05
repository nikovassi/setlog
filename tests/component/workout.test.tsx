import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../../src/App';
import { db, resetDbForTests } from '../../src/db';
import { seedId } from '../../src/db/seed';
import * as W from '../../src/services/workouts';

const BENCH = seedId('Bench Press');

beforeEach(async () => {
  await resetDbForTests();
  localStorage.clear();
  window.location.hash = '#/';
});

async function startAndAddBench(user: ReturnType<typeof userEvent.setup>) {
  render(<App />);
  await user.click(await screen.findByRole('button', { name: /start workout/i }));
  await user.click(await screen.findByRole('button', { name: /^exercise$/i }));
  const dialog = await screen.findByRole('dialog', { name: /add exercises/i });
  await user.type(within(dialog).getByRole('searchbox'), 'bench press');
  await user.click(within(dialog).getByRole('button', { name: /^bench press/i }));
  await user.click(within(dialog).getByRole('button', { name: /add 1 exercise/i }));
  return screen.findByRole('article', { name: /bench press/i });
}

describe('workout screen', () => {
  it('logs a set with weight and reps, starts the rest timer and marks it done', async () => {
    const user = userEvent.setup();
    const card = await startAndAddBench(user);
    expect(within(card).getByText(/first time/i)).toBeInTheDocument();

    await user.type(within(card).getByLabelText(/set 1 weight/i), '60');
    await user.type(within(card).getByLabelText(/set 1 reps/i), '8');
    await user.click(within(card).getByRole('button', { name: /complete bench press set 1/i }));

    await waitFor(() => expect(within(card).getByRole('button', { name: /set 1 completed/i })).toHaveAttribute('aria-pressed', 'true'));
    expect(screen.getByRole('region', { name: /rest timer/i })).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent(/1:(30|29)/);

    const [set] = await db.sets.toArray();
    expect(set).toMatchObject({ weight: 60, reps: 8, completed: true });
  });

  it('focuses reps instead of completing an empty set', async () => {
    const user = userEvent.setup();
    const card = await startAndAddBench(user);
    await user.click(within(card).getByRole('button', { name: /complete bench press set 1/i }));
    expect(within(card).getByLabelText(/set 1 reps/i)).toHaveFocus();
    expect((await db.sets.toArray())[0].completed).toBe(false);
  });

  it('adds a pre-filled set, edits it, deletes it and undoes the delete', async () => {
    const user = userEvent.setup();
    const card = await startAndAddBench(user);
    await user.type(within(card).getByLabelText(/set 1 weight/i), '60');
    await user.type(within(card).getByLabelText(/set 1 reps/i), '8');
    await user.click(within(card).getByRole('button', { name: /add set/i }));

    const weight2 = await within(card).findByLabelText(/set 2 weight/i);
    await waitFor(() => expect(weight2).toHaveValue('60'));
    await user.clear(weight2);
    await user.type(weight2, '62,5');
    await user.tab();
    await waitFor(async () => expect((await db.sets.toArray()).find((s) => s.setNumber === 2)?.weight).toBe(62.5));

    await user.click(within(card).getByRole('button', { name: /set 2 options/i }));
    await user.click(within(await screen.findByRole('dialog', { name: /set 2/i })).getByRole('button', { name: /delete set/i }));
    await waitFor(() => expect(within(card).queryByLabelText(/set 2 weight/i)).not.toBeInTheDocument());

    await user.click(await screen.findByRole('button', { name: /undo/i }));
    expect(await within(card).findByLabelText(/set 2 weight/i)).toHaveValue('62.5');
  });

  it('shows last time and a progression suggestion from history', async () => {
    const prev = await W.startWorkout();
    const we = await W.addExerciseToWorkout(prev.id, BENCH);
    const [s] = await W.getSets(we.id);
    await W.completeSet(s.id, true, { weight: 60, reps: 12 });
    await W.finishWorkout(prev.id);

    const user = userEvent.setup();
    const card = await startAndAddBench(user);
    expect(within(card).getByLabelText(/last time for bench press/i)).toHaveTextContent('60 kg × 12');
    expect(within(card).getByText(/suggested/i).parentElement).toHaveTextContent('62.5 kg × 8');
    expect(within(card).getByLabelText(/set 1 weight/i)).toHaveValue('60');

    await user.click(within(card).getByRole('button', { name: /^use$/i }));
    await waitFor(() => expect(within(card).getByLabelText(/set 1 weight/i)).toHaveValue('62.5'));
    expect(within(card).getByLabelText(/set 1 reps/i)).toHaveValue('8');
  });

  it('finishes the workout and shows the summary', async () => {
    const user = userEvent.setup();
    const card = await startAndAddBench(user);
    await user.type(within(card).getByLabelText(/set 1 weight/i), '80');
    await user.type(within(card).getByLabelText(/set 1 reps/i), '5');
    await user.click(within(card).getByRole('button', { name: /complete bench press set 1/i }));
    await user.click(screen.getAllByRole('button', { name: /^finish$/i })[0]);
    await user.click(within(await screen.findByRole('dialog', { name: /finish workout/i })).getByRole('button', { name: /finish & save/i }));
    expect(await screen.findByText(/workout complete/i)).toBeInTheDocument();
    expect(screen.getByText(/80 kg × 5/)).toBeInTheDocument();
    expect(await W.getActiveWorkout()).toBeUndefined();
  });
});
