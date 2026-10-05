import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

for (const theme of ['dark', 'light'] as const) {
  test(`no WCAG A/AA violations on main screens (${theme})`, async ({ page }) => {
    await page.goto('./#/settings');
    if (theme === 'light') await page.getByRole('button', { name: 'Light' }).click();
    const scan = async (label: string) => {
      const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      expect(res.violations.map((v) => `${label}: ${v.id} – ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`)).toEqual([]);
    };
    await scan('settings');
    await page.goto('./#/');
    await scan('home');
    await page.getByRole('button', { name: 'Start workout' }).click();
    await page.getByRole('button', { name: /^exercise$/i }).click();
    await page.getByRole('dialog', { name: 'Add exercises' }).getByRole('button', { name: /^Squat Quads/ }).click();
    await page.getByRole('button', { name: 'Add 1 exercise' }).click();
    await page.getByRole('article', { name: /squat/i }).waitFor();
    await scan('workout');
    await page.goto('./#/history');
    await scan('history');
    await page.goto('./#/progress');
    await scan('progress');
  });
}

test('no WCAG A/AA violations in Bulgarian', async ({ page }) => {
  await page.goto('./#/settings');
  await page.getByRole('button', { name: 'Български' }).click();
  for (const path of ['./#/settings', './#/', './#/history', './#/progress']) {
    await page.goto(path);
    await page.locator('main#main').waitFor();
    const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(res.violations.map((v) => `${path}: ${v.id}`)).toEqual([]);
  }
});
