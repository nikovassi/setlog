import { expect, test, type Page } from '@playwright/test';

const BASE = process.env.E2E_BASE ?? '/setlog/';
const consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors.length = 0;
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', (e) => consoleErrors.push(e.message));
});

test.afterEach(() => {
  expect(consoleErrors, 'no console errors during normal use').toEqual([]);
});

async function logSet(page: Page, n: number, weight: string, reps: string) {
  const card = page.getByRole('article', { name: /bench press/i });
  await card.getByLabel(new RegExp(`set ${n} weight`, 'i')).fill(weight);
  await card.getByLabel(new RegExp(`set ${n} reps`, 'i')).fill(reps);
  await card.getByRole('button', { name: new RegExp(`complete bench press set ${n}`, 'i') }).click();
  await expect(card.getByRole('button', { name: new RegExp(`set ${n} completed`, 'i') })).toBeVisible();
}

test('start workout → add exercise → log sets → finish → history & progress', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle('Setlog');
  await expect(page.getByText('No workouts yet')).toBeVisible();

  await page.getByRole('button', { name: 'Start workout' }).click();
  await page.getByRole('button', { name: /^exercise$/i }).click();
  const picker = page.getByRole('dialog', { name: 'Add exercises' });
  await picker.getByRole('searchbox').fill('bench');
  await picker.getByRole('button', { name: /^Bench Press Chest/ }).click();
  await picker.getByRole('button', { name: 'Add 1 exercise' }).click();

  await logSet(page, 1, '60', '8');
  await expect(page.getByRole('region', { name: 'Rest timer' })).toBeVisible();
  await page.getByRole('button', { name: 'Skip' }).click();

  await page.getByRole('article', { name: /bench press/i }).getByRole('button', { name: 'Add set' }).click();
  await logSet(page, 2, '62.5', '8');

  // data survives a reload in the middle of a workout
  await page.reload();
  await expect(page.getByRole('article', { name: /bench press/i }).getByRole('button', { name: /set 2 completed/i })).toBeVisible();

  await page.getByRole('navigation', { name: 'Workout actions' }).getByRole('button', { name: 'Finish' }).click();
  await page.getByRole('dialog', { name: 'Finish workout?' }).getByRole('button', { name: 'Finish & save' }).click();
  await expect(page.getByText('Workout complete!')).toBeVisible();

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'History' }).click();
  await expect(page.getByRole('heading', { name: 'History', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /workout.*1 exercise.*2 sets.*980 kg/i })).toBeVisible();

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Progress' }).click();
  await expect(page.getByText('Volume per week')).toBeVisible();

  // refresh on a deep link works under the sub-path
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Progress', exact: true })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(BASE);
});

test('assets, manifest and icons resolve under the sub-path', async ({ page, request }) => {
  await page.goto('./');
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestHref?.startsWith(BASE)).toBe(true);
  const manifest = await (await request.get(manifestHref!)).json();
  expect(manifest).toMatchObject({ display: 'standalone', start_url: './', scope: './' });
  for (const icon of manifest.icons) expect((await request.get(icon.src)).status()).toBe(200);
  const scripts = await page.locator('script[src]').evaluateAll((els) => els.map((e) => (e as HTMLScriptElement).src));
  for (const src of scripts) expect(new URL(src).pathname.startsWith(BASE)).toBe(true);
  expect((await request.get('sw.js')).status()).toBe(200);
});

test('works offline after the first visit', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // the page must be controlled before offline navigation is served from cache
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Start workout' })).toBeVisible();
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByText('Your workout data is stored locally on this device.')).toBeVisible();
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Progress' }).click();
  await expect(page.getByRole('heading', { name: 'Progress', exact: true })).toBeVisible();
  await context.setOffline(false);
});

test('export and re-import a backup', async ({ page }) => {
  await page.goto('./#/settings');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup (JSON)' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^setlog-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const path = await download.path();

  await page.getByTestId('import-input').setInputFiles(path);
  const dialog = page.getByRole('dialog', { name: 'Import backup' });
  await expect(dialog.getByRole('list', { name: 'Backup contents' })).toContainText('Exercises');
  await dialog.getByRole('button', { name: 'Import' }).click();
  await expect(page.getByText('Import complete')).toBeVisible();

  await page.getByTestId('import-input').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"nope":true}') });
  await expect(page.getByRole('alert')).toContainText('not a Setlog backup');
});

test('light and dark theme', async ({ page }) => {
  await page.goto('./#/settings');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Light' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
