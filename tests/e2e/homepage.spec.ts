import { test, expect } from '@playwright/test';
import { resources, ready } from '../support/browser';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('without JavaScript the introduction and static links stay visible and usable', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.route('https://**/*', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('#boot')).toBeHidden();
  await expect(page.locator('#ui-layer')).toHaveCSS('opacity', '1');
  await expect(
    page.getByRole('heading', { name: 'TomyJan', exact: true }),
  ).toBeVisible();
  const brand = page.getByRole('link', { name: '荼蘼 TomyJan', exact: true });
  await brand.click();
  await expect(page).toHaveURL(/#home$/);
  await page.locator('.commit-link').focus();
  await expect(page.locator('.commit-link')).toBeFocused();
  await expect(page.locator('.noscript-links a')).toHaveCount(3);
  await expect(page.locator('#stage')).toHaveAttribute('aria-busy', 'false');
  await context.close();
});

test('the dark loader paints immediately and does not await failed media or fonts', async ({
  page,
}) => {
  await page.route('https://**/*', (route) => route.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#boot')).toBeVisible();
  await expect(page.locator('#boot')).toHaveCSS(
    'background-color',
    'rgb(16, 21, 25)',
  );
  await expect(page.locator('#stage')).toHaveClass(/is-ready/);
  const elapsed = await page.locator('html').getAttribute('data-boot-elapsed');
  expect(Number(elapsed)).toBeGreaterThanOrEqual(1190);
  expect(Number(elapsed)).toBeLessThan(3500);
  await expect(
    page.getByRole('heading', { name: 'TomyJan', exact: true }),
  ).toBeVisible();
});

test('navigation, hiding and native looping preserve the selected video', async ({
  page,
}) => {
  await resources(page);
  await ready(page);
  const video = page.locator('video');
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused))
    .toBe(true);
  const src = await video.getAttribute('src');
  await page.getByRole('button', { name: '服务导航', exact: true }).click();
  await expect(page.locator('#panel-services')).toBeVisible();
  await expect(page.locator('#panel-services .tile')).toHaveCount(8);
  await page.getByRole('button', { name: '暂停背景视频', exact: true }).click();
  await page.getByRole('button', { name: '隐藏界面', exact: true }).click();
  await page.mouse.move(500, 200);
  await expect(page.locator('#stage')).toHaveClass(/controls-asleep/, {
    timeout: 2500,
  });
  await page.mouse.move(510, 210);
  await expect(page.locator('#stage')).not.toHaveClass(/controls-asleep/);
  await page.keyboard.press('Escape');
  await expect(video).toHaveAttribute('src', src!);
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.paused))
    .toBe(true);
  await page.getByRole('button', { name: '播放背景视频', exact: true }).click();
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime > 0))
    .toBe(true);
  await video.evaluate((v: HTMLVideoElement) => {
    v.currentTime = Math.max(0, v.duration - 0.08);
  });
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime < 0.8))
    .toBe(true);
  expect(await video.evaluate((v: HTMLVideoElement) => v.loop)).toBe(true);
  await expect(page.locator('video')).toHaveCount(1);
});

test('blog paginates, retries, and keeps the final link fixed', async ({
  page,
}) => {
  await resources(page);
  await ready(page);
  let failed = false;
  await page.route('**/wp-json/**', async (route) => {
    if (
      new URL(route.request().url()).searchParams.get('page') === '2' &&
      !failed
    ) {
      failed = true;
      return route.fulfill({ status: 503, body: '' });
    }
    return route.fallback();
  });
  await page.getByRole('button', { name: '博客文章', exact: true }).click();
  await expect(page.locator('.post')).toHaveCount(10);
  const bottom = await page.locator('#posts-more').boundingBox();
  const scroll = page.locator('#posts-scroll');
  await scroll.evaluate((el) => (el.scrollTop = el.scrollHeight));
  await expect(
    page.getByRole('button', { name: '重试', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '重试', exact: true }).click();
  await expect(page.locator('.post')).toHaveCount(20);
  await scroll.evaluate((el) => (el.scrollTop = el.scrollHeight));
  await expect(page.locator('.post')).toHaveCount(21);
  await expect(page.locator('#posts-more-label')).toHaveText(
    '已加载全部 21 篇, 去博客读',
  );
  await expect(page.locator('#posts-status')).toBeHidden();
  expect((await page.locator('#posts-more').boundingBox())!.y).toBeCloseTo(
    bottom!.y,
    0,
  );
  await expect(page.locator('.post-title').first()).toHaveText('文章 1 & 标题');
});

for (const width of [1440, 390, 320]) {
  test(`layout stays aligned at ${width}px and matches the frozen prototype`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await resources(page);
    await ready(page);
    for (const section of ['服务导航', '联系支持', '首页']) {
      if (section !== '首页')
        await page.getByRole('button', { name: section, exact: true }).click();
      else
        await page.getByRole('button', { name: '首页', exact: true }).click();
      await page
        .locator('.panel:not([hidden])')
        .last()
        .waitFor({ state: 'visible' });
      await expect
        .poll(() => page.locator('.panel:not([hidden])').count())
        .toBe(1);
      const aligned = await page.evaluate(() => {
        const nav = document.querySelector('.nav')!.getBoundingClientRect();
        const panel = document.querySelector('.panel:not([hidden])')!;
        const scroll = panel.querySelector('.panel-scroll')!;
        scroll.scrollTop = scroll.scrollHeight;
        const content = panel
          .querySelector('.panel-content')!
          .getBoundingClientRect();
        const pad = parseFloat(getComputedStyle(scroll).paddingBottom);
        return {
          navBottom: nav.bottom,
          contentBottom: content.bottom,
          pad,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      expect(aligned.overflow).toBe(false);
      expect(Math.abs(aligned.navBottom - aligned.contentBottom)).toBeLessThan(
        1,
      );
    }
    await expect(page.locator('[data-footer-item="commit"]')).toBeVisible();
    const bounds = await page.locator('.footer-links').boundingBox(),
      controls = await page.locator('.controls').boundingBox();
    expect(bounds!.y + bounds!.height / 2).toBeCloseTo(
      controls!.y + controls!.height / 2,
      0,
    );
    await page.mouse.move(width - 5, 5);
    await page
      .locator('#panel-home .panel-scroll')
      .evaluate((el) => (el.scrollTop = 0));
    const current = await page
      .locator('.dock')
      .screenshot({ animations: 'disabled' });
    await testInfo.attach('implementation', {
      body: current,
      contentType: 'image/png',
    });
    // Serve the immutable baseline through a test-only intercepted URL.
    await page.route('**/__baseline', async (route) =>
      route.fulfill({
        body: await readFile(
          'docs/design/prototypes/video-first-v3.html',
          'utf8',
        ),
        contentType: 'text/html',
      }),
    );
    await page.route('**/avatar.png', (route) =>
      route.fulfill({
        path: resolve('docs/design/prototypes/avatar.png'),
        contentType: 'image/png',
      }),
    );
    await page.goto('/__baseline');
    await expect(page.locator('#boot')).toBeHidden();
    const baseline = await page
      .locator('.dock')
      .screenshot({ animations: 'disabled' });
    await testInfo.attach('baseline', {
      body: baseline,
      contentType: 'image/png',
    });
    expect(current.equals(baseline)).toBe(true);
  });
}

test('reduced motion keeps the image, disables autoplay, and allows manual playback', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await resources(page);
  await ready(page);
  expect(
    await page.locator('video').evaluate((v: HTMLVideoElement) => v.paused),
  ).toBe(true);
  await expect(page.locator('.fallback-image')).toBeVisible();
  await expect(page.locator('video')).toHaveCSS('opacity', '0');
  await page.getByRole('button', { name: '播放背景视频', exact: true }).click();
  await expect
    .poll(() =>
      page.locator('video').evaluate((v: HTMLVideoElement) => v.paused),
    )
    .toBe(false);
});
