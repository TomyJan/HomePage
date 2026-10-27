import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resources, ready } from '../support/browser';

for (const width of [1440, 390, 320]) {
  test(`service, contact and article panels match frozen design at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await resources(page);
    await ready(page);
    const reference = await page.context().newPage();
    await reference.setViewportSize({ width, height: 900 });
    await resources(reference);
    await reference.route('**/__baseline', async (route) =>
      route.fulfill({
        body: await readFile(
          'docs/design/prototypes/video-first-v2.html',
          'utf8',
        ),
        contentType: 'text/html',
      }),
    );
    await reference.goto('/__baseline');
    await expect(reference.locator('#boot')).toBeHidden();
    for (const name of ['服务导航', '联系支持', '博客文章']) {
      for (const target of [page, reference]) {
        await target.getByRole('button', { name, exact: true }).click();
        await expect
          .poll(() => target.locator('.panel:not([hidden])').count())
          .toBe(1);
        if (name === '博客文章')
          await expect(target.locator('.post')).toHaveCount(10);
        await target.mouse.move(width - 5, 5);
      }
      const actual = await page
        .locator('.dock')
        .screenshot({ animations: 'disabled' });
      const expected = await reference
        .locator('.dock')
        .screenshot({ animations: 'disabled' });
      if (!actual.equals(expected)) {
        await info.attach(`${name}-implementation`, {
          body: actual,
          contentType: 'image/png',
        });
        await info.attach(`${name}-reference`, {
          body: expected,
          contentType: 'image/png',
        });
      }
      expect(actual.equals(expected), `${name} at ${width}px`).toBe(true);
    }
    await reference.close();
  });
}
