import { test, expect } from '@playwright/test';
import { resources } from '../support/browser';

async function enter(page: import('@playwright/test').Page) {
  await resources(page);
  await page.goto('/');
  await expect(page.locator('#boot')).toBeHidden();
}

async function enterHost(page: import('@playwright/test').Page, host: string) {
  await resources(page);
  await page.route('http://' + host + '/**', async (route) => {
    const url = new URL(route.request().url());
    await route.fulfill({
      response: await route.fetch({
        url: 'http://127.0.0.1:4371' + url.pathname + url.search,
      }),
    });
  });
  await page.goto('http://' + host + '/');
  await expect(page.locator('#boot')).toBeHidden();
}

for (const [width, height] of [
  [320, 240],
  [667, 270],
  [390, 256],
  [1440, 900],
  [390, 844],
  [320, 640],
]) {
  test(
    'floating notice leaves page layout unchanged at ' + width + 'x' + height,
    async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width, height },
        hasTouch: true,
        isMobile: true,
      });
      const page = await context.newPage();
      await page.addInitScript(() => {
        document.addEventListener(
          'DOMContentLoaded',
          () =>
            document.documentElement.style.setProperty('--safe-bottom', '21px'),
          { once: true },
        );
      });
      await enterHost(page, 'www.tomys.top');
      await expect(page.locator('#cookie-notice')).toHaveCSS(
        'transform',
        'matrix(1, 0, 0, 1, 0, 0)',
      );
      const noticeBounds = await page.locator('#cookie-notice').boundingBox();
      expect(noticeBounds!.y + noticeBounds!.height).toBeCloseTo(
        height - 12,
        1,
      );
      const before = await page
        .locator('.brand, .nav, #content-host, .footer, .controls')
        .evaluateAll((elements) =>
          elements.map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              stageScrollLeft: document.querySelector('#stage')!.scrollLeft,
              stageScrollTop: document.querySelector('#stage')!.scrollTop,
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
            };
          }),
        );
      await page.locator('#cookie-confirm').tap();
      await expect(page.locator('#cookie-notice')).toBeHidden();
      const after = await page
        .locator('.brand, .nav, #content-host, .footer, .controls')
        .evaluateAll((elements) =>
          elements.map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              stageScrollLeft: document.querySelector('#stage')!.scrollLeft,
              stageScrollTop: document.querySelector('#stage')!.scrollTop,
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
            };
          }),
        );
      for (let i = 0; i < before.length; i++)
        for (const key of ['x', 'y', 'width', 'height'] as const)
          expect(
            Math.abs(before[i][key] - after[i][key]),
            'layout element ' +
              i +
              ' ' +
              key +
              ' ' +
              JSON.stringify({ before: before[i], after: after[i] }),
          ).toBeLessThan(0.1);
      const geometry = await page.evaluate(() => {
        const rect = (selector: string) =>
          document.querySelector(selector)!.getBoundingClientRect();
        return {
          brand: rect('.brand').bottom,
          navTop: rect('.nav').top,
          navBottom: rect('.nav').bottom,
          footer: rect('.footer').top,
          controls: rect('.controls').bottom,
          notice: rect('#cookie-notice').top,
        };
      });
      expect(geometry.navTop).toBeGreaterThan(geometry.brand);
      expect(geometry.navBottom + 12).toBeLessThanOrEqual(
        geometry.footer + 0.1,
      );
      await page.getByRole('button', { name: '服务导航', exact: true }).tap();
      await expect(page.locator('#panel-services')).toBeVisible();
      await page.locator('#filing-trigger').tap();
      await expect(page.locator('#filing-card')).toHaveCSS(
        'transform',
        'matrix(1, 0, 0, 1, 0, 0)',
      );
      const popup = await page.locator('#filing-card').boundingBox();
      expect(popup!.y).toBeGreaterThanOrEqual(0);
      await page.locator('[data-filing-type]').last().scrollIntoViewIfNeeded();
      await page.locator('[data-filing-type]').last().click({ trial: true });
      await page.keyboard.press('Escape');
      await context.close();
    },
  );
}

test('cross-tab acknowledgement restores focus to an available policy entry', async ({
  page,
  context,
}) => {
  await enterHost(page, 'vov.moe');
  await page.locator('#cookie-notice [data-privacy-link]').click();
  const other = await context.newPage();
  await enterHost(other, 'vov.moe');
  await other.locator('#cookie-confirm').click();
  await expect(page.locator('#cookie-notice')).toBeHidden();
  await expect(page.locator('#filing')).toBeHidden();
  await page.locator('#privacy-close').click();
  await expect(page.locator('#privacy-dialog')).toBeHidden();
  await expect(page.locator('[data-footer-item="privacy"]')).toBeFocused();
});

test('clearing cross-tab acknowledgement during fade-out restores a usable notice', async ({
  page,
  context,
}) => {
  await enter(page);
  const other = await context.newPage();
  await enter(other);
  await other.evaluate(async () => {
    localStorage.setItem('tomyjan:privacy-notice', '2026-10-30');
    await new Promise((resolve) => setTimeout(resolve, 50));
    localStorage.removeItem('tomyjan:privacy-notice');
  });
  // Inspect after the original close deadline, not only during its fade-out.
  await page.waitForTimeout(300);
  await expect(page.locator('#cookie-notice')).toBeVisible();
  await page.locator('#cookie-confirm').click();
  await expect(page.locator('#cookie-notice')).toBeHidden();
});

test('the notice embeds its policy link in the explanation and keeps only confirmation on the right', async ({
  page,
}) => {
  await enter(page);
  await expect(page.locator('#cookie-notice .cookie-copy p')).toContainText(
    'Cookie',
  );
  await expect(
    page.locator('#cookie-notice .cookie-copy p [data-privacy-link]'),
  ).toBeVisible();
  await expect(page.locator('#cookie-notice .cookie-actions a')).toHaveCount(0);
  await expect(page.locator('#cookie-notice')).not.toContainText(
    '本站会记住本次提示确认',
  );
});

test('the notice policy entry is not acknowledgement and confirmation survives reload', async ({
  page,
}) => {
  await enter(page);
  const notice = page.getByRole('region', { name: 'Cookie 与隐私提示' });
  await expect(notice).toBeVisible();
  const source = await page.locator('video').getAttribute('src');
  const entry = notice.getByRole('link', { name: '隐私政策', exact: true });
  await entry.click();
  const dialog = page.getByRole('dialog', { name: '隐私政策', exact: true });
  await expect(dialog).toBeVisible();
  await expect(page.locator('video')).toHaveJSProperty('paused', false);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(entry).toBeFocused();
  await expect(notice).toBeVisible();
  await expect(page.locator('video')).toHaveAttribute('src', source!);
  await notice.getByRole('button', { name: '知道了', exact: true }).click();
  await expect(notice).toBeHidden();
  await page.reload();
  await expect(page.locator('#boot')).toBeHidden();
  await expect(notice).toBeHidden();
  await expect(page.locator('video')).toHaveCount(1);
  const footerEntry = page.locator('[data-footer-item="privacy"]');
  await footerEntry.click();
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole('button', { name: '关闭隐私政策', exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await expect(footerEntry).toBeFocused();
});

test('storage denial still allows acknowledging and reading the policy', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    for (const method of ['getItem', 'setItem'])
      Object.defineProperty(Storage.prototype, method, {
        value() {
          throw new DOMException('Storage unavailable', 'SecurityError');
        },
      });
  });
  await enter(page);
  await page.getByRole('button', { name: '知道了', exact: true }).click();
  await expect(page.locator('#cookie-notice')).toBeHidden();
  await page.locator('[data-footer-item="privacy"]').click();
  await expect(
    page.getByRole('dialog', { name: '隐私政策', exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

for (const [width, height] of [
  [390, 844],
  [320, 640],
  [568, 320],
]) {
  test(
    'notice and folded policy remain usable at ' + width + 'x' + height,
    async ({ page }) => {
      await page.setViewportSize({ width, height });
      await enterHost(page, 'www.tomys.top');
      const notice = page.locator('#cookie-notice');
      await expect(notice).toBeVisible();
      await expect(notice).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
      const bounds = await notice.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.y).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height);
      expect(bounds!.y + bounds!.height).toBeCloseTo(height - 12, 1);
      await notice.getByRole('button', { name: '知道了', exact: true }).click();
      await expect(notice).toBeHidden();
      await page.locator('#filing-trigger').click();
      await expect(page.locator('#filing-card')).toBeVisible();
      await page.locator('#filing-card a').first().click({ trial: true });
      await page.locator('#filing-trigger').click();
      const entry = page.locator('[data-footer-item="privacy"]');
      if (!(await entry.isVisible()))
        await page.locator('#filing-trigger').click();
      await entry.click();
      const dialog = page.getByRole('dialog', {
        name: '隐私政策',
        exact: true,
      });
      await expect(dialog).toBeVisible();
      const sheet = await dialog.boundingBox();
      expect(sheet!.x).toBeGreaterThanOrEqual(0);
      expect(sheet!.y + sheet!.height).toBeLessThanOrEqual(height);
      await dialog
        .getByRole('button', { name: '关闭隐私政策', exact: true })
        .click();
      await expect(dialog).toBeHidden();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    },
  );
}

test('the standalone policy is readable without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.route('https://**/*', (route) => route.abort());
  const response = await page.goto('/privacy.html');
  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole('heading', { name: '隐私政策', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: '您的选择与联系' }),
  ).toBeVisible();
  await page.getByRole('link', { name: '返回主页' }).click();
  await expect(page).toHaveURL(/\/$/);
  await context.close();
});

test('an old acknowledgement is renewed and hidden UI keeps the video unobstructed', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('tomyjan:privacy-notice', 'old-version'),
  );
  await enter(page);
  const notice = page.locator('#cookie-notice');
  await expect(notice).toBeVisible();
  // The bottom notice can cover pointer controls until it is dismissed.
  await page.locator('#view-button').press('Enter');
  await expect(notice).toBeHidden();
  await page.mouse.click(250, 150);
  await expect(page.locator('#stage')).toHaveClass(/controls-asleep/);
  await page.keyboard.press('Escape');
  await expect(notice).toBeVisible();
  await expect(page.locator('video')).toHaveJSProperty('paused', false);
  await notice.getByRole('button', { name: '知道了', exact: true }).click();
  await expect(notice).toBeHidden();
  expect(
    await page.evaluate(() => localStorage.getItem('tomyjan:privacy-notice')),
  ).not.toBe('old-version');
});

test('the informational acknowledgement does not gate existing statistics', async ({
  page,
}) => {
  await resources(page);
  await page.route('http://www.tomys.top/**', async (route) => {
    const url = new URL(route.request().url());
    await route.fulfill({
      response: await route.fetch({
        url: 'http://127.0.0.1:4371' + url.pathname + url.search,
      }),
    });
  });
  await page.goto('http://www.tomys.top/');
  await expect(page.locator('#boot')).toBeHidden();
  await expect(page.locator('#cookie-notice')).toBeVisible();
  await expect(page.locator('script[data-resource="umami"]')).toHaveCount(1);
  await page.getByRole('button', { name: '知道了', exact: true }).click();
  await expect(page.locator('#cookie-notice')).toBeHidden();
  await expect(page.locator('script[data-resource="umami"]')).toHaveCount(1);
});
