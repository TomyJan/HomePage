import { expect, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
// External services are the only substitutes: tests exercise the real built UI.
export async function resources(page: Page, posts = 21) {
  const fixture = await readFile(resolve('tests/fixtures/loop.webm'));
  await page.route('https://**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.href === 'https://public-cdn.tomys.top/head.png')
      return route.fulfill({
        path: resolve('docs/design/prototypes/avatar.png'),
        contentType: 'image/png',
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    if (url.pathname.includes('/wp-json/')) {
      const n = Number(url.searchParams.get('page')),
        start = (n - 1) * 10;
      return route.fulfill({
        json: Array.from(
          { length: Math.min(10, Math.max(0, posts - start)) },
          (_, i) => ({
            id: start + i + 1,
            date: '2026-10-20T12:00:00',
            title: { rendered: `文章 ${start + i + 1} &amp; 标题` },
            link: `https://blog.tomys.top/post/${start + i + 1}`,
          }),
        ),
        headers: {
          'X-WP-Total': String(posts),
          'X-WP-TotalPages': String(Math.ceil(posts / 10)),
        },
      });
    }
    if (url.hostname.includes('myqcloud.com')) {
      const range = /^bytes=(\d+)-(\d*)$/.exec(
        route.request().headers().range || '',
      );
      const start = range ? Number(range[1]) : 0;
      const end =
        range && range[2]
          ? Math.min(Number(range[2]), fixture.length - 1)
          : fixture.length - 1;
      return route.fulfill({
        status: range ? 206 : 200,
        body: fixture.subarray(start, end + 1),
        contentType: 'video/webm',
        headers: {
          'Accept-Ranges': 'bytes',
          ...(range
            ? { 'Content-Range': `bytes ${start}-${end}/${fixture.length}` }
            : {}),
        },
      });
    }
    if (url.pathname.endsWith('.css'))
      return route.fulfill({ body: '', contentType: 'text/css' });
    if (url.pathname.includes('acgimg'))
      return route.fulfill({
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#4c6568"/></svg>',
        contentType: 'image/svg+xml',
      });
    return route.abort();
  });
}
export async function ready(page: Page) {
  await page.goto('/');
  await expect(page.locator('#stage')).toHaveClass(/is-ready/);
  await expect(page.locator('#boot')).toBeHidden();
  await acknowledgeNotice(page);
}
// Approved shadows have independent pixel coverage; the frozen layout stays immutable.
export async function omitApprovedShadows(page: Page) {
  await page.addStyleTag({
    content:
      '.text-panel::before,.text-surface::before,.posts-layout::before,.tiles::before{display:none!important}.text-surface,.posts-layout{filter:none!important}.text-panel,.text-panel *{text-shadow:none!important}.entry{box-shadow:none!important}',
  });
}
export async function acknowledgeNotice(page: Page) {
  const notice = page.locator('#cookie-notice');
  if (await notice.isVisible()) {
    const confirm = notice.getByRole('button', { name: '知道了', exact: true });
    if (await page.evaluate(() => matchMedia('(pointer: coarse)').matches))
      await confirm.tap();
    else await confirm.click();
    await expect(notice).toBeHidden();
  }
}
