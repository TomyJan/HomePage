import { expect, type Page } from '@playwright/test';
import { resolve } from 'node:path';
// External services are the only substitutes: tests exercise the real built UI.
export async function resources(page: Page, posts = 21) {
  await page.route('https://**/*', async (route) => {
    const url = new URL(route.request().url());
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
    if (url.hostname.includes('myqcloud.com'))
      return route.fulfill({
        path: resolve('tests/fixtures/loop.webm'),
        contentType: 'video/webm',
      });
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
}
