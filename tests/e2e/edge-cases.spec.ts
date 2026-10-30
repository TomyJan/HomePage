import { test, expect, type Page } from '@playwright/test';
import { resources, ready, acknowledgeNotice } from '../support/browser';

async function atHost(page: Page, hostname: string, referrer?: string) {
  await page.route(`http://${hostname}/**`, async (route) => {
    const url = new URL(route.request().url());
    await route.fulfill({
      response: await route.fetch({
        url: `http://127.0.0.1:4371${url.pathname}${url.search}`,
      }),
    });
  });
  await page.goto(
    `http://${hostname}/`,
    referrer ? { referer: referrer } : undefined,
  );
  await expect(page.locator('#boot')).toBeHidden();
  if (!(await page.locator('#hostloc-dialog').isVisible()))
    await acknowledgeNotice(page);
}

test('filing popup uses actual domain, animates near its trigger, and closes with Escape', async ({
  page,
}) => {
  await resources(page);
  await atHost(page, 'www.tomys.top');
  await page.locator('#filing-trigger').click();
  await expect(page.locator('[data-filing-type]')).toHaveCount(3);
  await expect(page.locator('#filing-card')).toHaveClass(/is-open/);
  await expect(page.locator('#filing-card')).toHaveCSS(
    'transform',
    'matrix(1, 0, 0, 1, 0, 0)',
  );
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

test('the first touch entering hidden UI lets the toolbar sleep without another tap', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await resources(page);
  await ready(page);
  await page.locator('#view-button').tap();
  await expect(page.locator('#stage')).toHaveClass(/is-viewing/);
  await expect(page.locator('#stage')).toHaveClass(/controls-asleep/, {
    timeout: 2500,
  });
  await page.locator('#stage').tap({ position: { x: 170, y: 200 } });
  await expect(page.locator('#stage')).not.toHaveClass(/controls-asleep/);
  await context.close();
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

test('late font metrics update the overflow indicator after initial entry', async ({
  page,
}) => {
  await resources(page);
  await ready(page);
  await expect(page.locator('#content-host')).not.toHaveClass(/has-scroll/);
  await page.addStyleTag({
    content: '#panel-home .legacy-bio{font-size:28px}',
  });
  await page.evaluate(() =>
    document.fonts.dispatchEvent(new Event('loadingdone')),
  );
  await expect(page.locator('#content-host')).toHaveClass(/has-scroll/);
});

for (const height of [360, 390]) {
  test(`landscape ${height}px keeps touch controls and footer in the viewport`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 844, height },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await resources(page);
    await ready(page);
    for (const selector of ['.controls', '.footer-links']) {
      const rect = await page.locator(selector).boundingBox();
      expect(rect!.y).toBeGreaterThanOrEqual(0);
      expect(rect!.y + rect!.height).toBeLessThanOrEqual(height);
    }
    await page.getByRole('button', { name: '隐藏界面', exact: true }).tap();
    await expect(
      page.getByRole('button', { name: '恢复界面（Esc）', exact: true }),
    ).toBeVisible();
    await context.close();
  });
}

for (const [width, height] of [
  [667, 240],
  [320, 240],
  [667, 270],
  [667, 320],
  [667, 350],
]) {
  for (const safeBottom of [0, 21]) {
    test(`short landscape ${width}x${height}px safe inset ${safeBottom}px keeps navigation clear of the brand and all controls usable`, async ({
      browser,
    }) => {
      const context = await browser.newContext({
        viewport: { width, height },
        isMobile: true,
        hasTouch: true,
      });
      const page = await context.newPage();
      await resources(page);
      await atHost(page, 'www.tomys.top');
      if (safeBottom)
        await page.addStyleTag({
          content: `:root { --safe-bottom: ${safeBottom}px; }`,
        });
      const geometry = await page.evaluate(() => {
        const brand = document.querySelector('.brand')!.getBoundingClientRect();
        const nav = document.querySelector('.nav')!.getBoundingClientRect();
        const footer = document
          .querySelector('.footer')!
          .getBoundingClientRect();
        const links = document
          .querySelector('.footer-links')!
          .getBoundingClientRect();
        const controls = document
          .querySelector('.controls')!
          .getBoundingClientRect();
        return {
          brandBottom: brand.bottom,
          navTop: nav.top,
          navBottom: nav.bottom,
          footerTop: footer.top,
          footerBottom: footer.bottom,
          linksRight: links.right,
          controlsLeft: controls.left,
          controlsBottom: controls.bottom,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      expect(geometry.navTop).toBeGreaterThan(geometry.brandBottom);
      expect(geometry.navBottom + 18).toBeLessThanOrEqual(geometry.footerTop);
      expect(geometry.footerBottom).toBeLessThanOrEqual(height);
      expect(geometry.controlsBottom).toBeLessThanOrEqual(height);
      expect(geometry.linksRight).toBeLessThan(geometry.controlsLeft);
      expect(geometry.overflow).toBe(false);
      for (const [name, id] of [
        ['服务导航', 'services'],
        ['博客文章', 'posts'],
        ['联系支持', 'contact'],
        ['首页', 'home'],
      ]) {
        const button = page.getByRole('button', { name, exact: true });
        if (id === 'posts' || id === 'home') {
          await button.focus();
          await page.keyboard.press('Enter');
        } else await button.tap();
        await expect(button).toHaveAttribute('aria-pressed', 'true');
        await expect
          .poll(() => page.locator('.panel:not([hidden])').count())
          .toBe(1);
        const scroll = page.locator(`#panel-${id} .panel-scroll`);
        if (id === 'home') {
          await scroll.focus();
          await page.keyboard.press('End');
          await expect
            .poll(() =>
              scroll.evaluate(
                (el) => el.scrollHeight - el.clientHeight - el.scrollTop,
              ),
            )
            .toBeLessThan(1);
        } else
          await scroll.evaluate((el) => {
            el.scrollTop = el.scrollHeight;
          });
        if (id !== 'contact')
          await expect
            .poll(() => scroll.evaluate((el) => el.scrollTop))
            .toBeGreaterThan(0);
        const aligned = await page.evaluate((id) => {
          const nav = document.querySelector('.nav')!.getBoundingClientRect();
          const content = document
            .querySelector(
              id === 'posts' ? '#posts-more' : `#panel-${id} .panel-content`,
            )!
            .getBoundingClientRect();
          return Math.abs(nav.bottom - content.bottom);
        }, id);
        expect(aligned).toBeLessThan(1);
      }
      await page.locator('#filing-trigger').tap();
      await expect(page.locator('#filing-card')).toBeVisible();
      await expect(page.locator('[data-filing-type]')).toHaveCount(3);
      await expect(page.locator('#filing-card')).toHaveCSS(
        'transform',
        'matrix(1, 0, 0, 1, 0, 0)',
      );
      const popup = await page.locator('#filing-card').boundingBox();
      const trigger = await page.locator('#filing-trigger').boundingBox();
      expect(popup!.y).toBeGreaterThanOrEqual(0);
      expect(popup!.y + popup!.height).toBeLessThan(height);
      expect(Math.abs(trigger!.y - popup!.y - popup!.height - 8)).toBeLessThan(
        1,
      );
      if (width === 320) {
        await expect(
          page.locator('#footer-folded-links [data-footer-item="sitemap"]'),
        ).toBeVisible();
        await page.locator('#filing-card a').first().click({ trial: true });
      }
      await page.locator('[data-filing-type]').last().click({ trial: true });
      await page.keyboard.press('Escape');
      await page
        .getByRole('button', { name: '暂停背景视频', exact: true })
        .tap();
      await expect(page.locator('video')).toHaveJSProperty('paused', true);
      await page.getByRole('button', { name: '取消静音', exact: true }).tap();
      await expect(page.locator('video')).toHaveJSProperty('muted', false);
      await page.getByRole('button', { name: '隐藏界面', exact: true }).tap();
      await expect(page.locator('#stage')).toHaveClass(/is-viewing/);
      await context.close();
    });
  }
}

test('short-height boundaries preserve brand clearance and shadow space while resizing', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 667, height: 390 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await resources(page);
  await atHost(page, 'www.tomys.top');
  for (const width of [320, 667, 844]) {
    for (const safeBottom of [0, 21]) {
      await page.addStyleTag({
        content: `:root { --safe-bottom: ${safeBottom}px; }`,
      });
      for (const height of [
        240, 258, 259, 260, 269, 270, 271, 272, 273, 274, 275, 320, 348, 349,
        350, 351, 360, 390,
      ]) {
        await page.setViewportSize({ width, height });
        await expect
          .poll(
            () =>
              page.evaluate(() => {
                const nav = document
                  .querySelector('.nav')!
                  .getBoundingClientRect();
                const brand = document
                  .querySelector('.brand')!
                  .getBoundingClientRect();
                const footer = document
                  .querySelector('.footer')!
                  .getBoundingClientRect();
                return (
                  nav.top > brand.bottom &&
                  nav.bottom + 18 <= footer.top &&
                  Array.from(document.querySelectorAll('.entry')).every(
                    (entry) => entry.getBoundingClientRect().height >= 24,
                  )
                );
              }),
            { message: `${width}x${height}px / ${safeBottom}px inset` },
          )
          .toBe(true);
      }
    }
  }
  await context.close();
});
