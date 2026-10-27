import { test, expect, type Page } from '@playwright/test';
import { resources, ready } from '../support/browser';

async function atHost(page: Page, hostname: string, referrer?: string) {
  await page.route(`http://${hostname}/**`, async (route) => {
    const url = new URL(route.request().url());
    await route.fulfill({
      response: await route.fetch({
        url: `http://127.0.0.1:4321${url.pathname}${url.search}`,
      }),
    });
  });
  await page.goto(
    `http://${hostname}/`,
    referrer ? { referer: referrer } : undefined,
  );
  await expect(page.locator('#boot')).toBeHidden();
}

test('filing popup uses actual domain, animates near its trigger, and closes with Escape', async ({
  page,
}) => {
  await resources(page);
  await atHost(page, 'www.tomys.top');
  await page.locator('#filing-trigger').click();
  await expect(page.locator('[data-filing-type]')).toHaveCount(3);
  await expect(page.locator('#filing-card')).toHaveClass(/is-open/);
  await expect(page.locator('#filing-trigger')).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  const trigger = await page.locator('#filing-trigger').boundingBox(),
    card = await page.locator('#filing-card').boundingBox();
  expect(Math.abs(trigger!.y - card!.y - card!.height - 8)).toBeLessThan(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('#filing-card')).toBeHidden();
  await expect(page.locator('#filing-trigger')).toBeFocused();
});

test('narrow touch footer shares the more popup and never folds the version or media buttons', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 320, height: 740 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await resources(page);
  await ready(page);
  await expect(page.locator('#filing-trigger-label')).toHaveText('更多');
  await expect(page.locator('[data-footer-item="commit"]')).toBeVisible();
  await expect(page.locator('.control')).toHaveCount(3);
  await page.locator('#filing-trigger').click();
  await expect(
    page.locator('#footer-folded-links [data-footer-item="sitemap"]'),
  ).toBeVisible();
  const layout = await page.evaluate(() => {
    const footer = document
        .querySelector('.footer-links')!
        .getBoundingClientRect(),
      controls = document.querySelector('.controls')!.getBoundingClientRect();
    return {
      right: footer.right,
      left: controls.left,
      midY: footer.y + footer.height / 2,
      controlsY: controls.y + controls.height / 2,
    };
  });
  expect(layout.right).toBeLessThanOrEqual(layout.left);
  expect(layout.midY).toBeCloseTo(layout.controlsY, 0);
  await page.keyboard.press('Escape');
  await page.locator('#view-button').tap();
  await page.locator('#stage').tap({ position: { x: 170, y: 200 } });
  await expect(page.locator('#stage')).not.toHaveClass(/controls-asleep/);
  await context.close();
});

test('HostLoc notice is custom, source-bounded, dismissible and leaves video playing', async ({
  page,
}) => {
  await resources(page);
  await atHost(page, 'www.tomys.top', 'https://hostloc.com/thread-1');
  await expect(page.locator('#hostloc-dialog')).toBeVisible();
  await expect(page.locator('video')).toHaveJSProperty('paused', false);
  await page.getByRole('button', { name: '我知道了，继续浏览' }).click();
  await expect(page.locator('#hostloc-dialog')).toBeHidden();
  await atHost(page, 'www.tomys.top', 'https://hostloc.com.evil.com/');
  await expect(page.locator('#hostloc-dialog')).toBeHidden();
});

test('empty and unsafe API responses do not execute HTML or create unsafe links', async ({
  page,
}) => {
  await resources(page);
  await page.route('**/wp-json/**', (route) =>
    route.fulfill({
      json: [
        {
          id: 1,
          date: '2026-10-20T12:00:00',
          title: {
            rendered:
              '<img src=x onerror="window.unsafe=true"> 安全 &amp; 文本',
          },
          link: 'https://blog.tomys.top/1',
        },
        {
          id: 2,
          date: '2026-10-20T12:00:00',
          title: { rendered: 'unsafe' },
          link: 'javascript:alert(1)',
        },
      ],
    }),
  );
  await ready(page);
  await page.getByRole('button', { name: '博客文章', exact: true }).click();
  await expect(page.locator('.post')).toHaveCount(1);
  await expect(page.locator('.post-title')).toHaveText('安全 & 文本');
  await expect(page.locator('.post img')).toHaveCount(0);
  await expect(page.locator('#posts-more-label')).toHaveText(
    '已加载全部 1 篇, 去博客读',
  );
});

test('empty blog still provides the fixed blog link and zero count', async ({
  page,
}) => {
  await resources(page, 0);
  await ready(page);
  await page.getByRole('button', { name: '博客文章', exact: true }).click();
  await expect(page.locator('#posts-more-label')).toHaveText(
    '已加载全部 0 篇, 去博客读',
  );
  await expect(page.locator('#posts-more')).toHaveAttribute(
    'href',
    'https://blog.tomys.top/',
  );
});

test('rapid switching keeps only the final panel active and the indicator within navigation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 520 });
  await resources(page);
  await ready(page);
  for (const name of ['服务导航', '联系支持', '博客文章', '服务导航'])
    await page.getByRole('button', { name, exact: true }).click();
  await expect.poll(() => page.locator('.panel:not([hidden])').count()).toBe(1);
  await expect(page.locator('#panel-services')).toBeVisible();
  const rects = await page.evaluate(() => {
    const nav = document.querySelector('.nav')!.getBoundingClientRect(),
      indicator = document
        .querySelector('#scroll-indicator')!
        .getBoundingClientRect();
    return [nav.top, nav.bottom, indicator.top, indicator.bottom];
  });
  expect(rects[0]).toBeCloseTo(rects[2], 0);
  expect(rects[1]).toBeCloseTo(rects[3], 0);
  await expect(page.locator('#scroll-indicator')).toHaveCSS(
    'pointer-events',
    'none',
  );
});

test('legacy redirects and standalone static pages are present', async ({
  request,
}) => {
  const pay = await request.get('/pay.php', { maxRedirects: 0 });
  expect(pay.status()).toBe(301);
  expect(pay.headers().location).toBe('/pay.html?from=old_paycode');
  const feed = await request.get('/feed/rss', { maxRedirects: 0 });
  expect(feed.status()).toBe(301);
  expect(feed.headers().location).toBe(
    'https://donate.tomys.top/?from=old_feed',
  );
  expect((await request.get('/missing-page')).status()).toBe(404);
  expect((await request.get('/pay.html')).status()).toBe(200);
  expect((await request.get('/ads.txt')).status()).toBe(200);
  expect((await request.get('/sitemap.txt')).status()).toBe(200);
});
