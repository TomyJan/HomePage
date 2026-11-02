import { test, expect } from '@playwright/test';
import { resources } from '../support/browser';

test('the CDN avatar stays nonblocking and the favicon uses the original image without CORS', async ({
  page,
}) => {
  const avatarUrl = 'https://public-cdn.tomys.top/head.png';
  await resources(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => (release = resolve));
  await page.route(avatarUrl, async (route) => {
    await pending;
    await route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#456789"/></svg>',
    });
  });
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#stage')).toHaveClass(/is-ready/);
    await expect(page.locator('#boot')).toBeHidden();
    await expect(page.locator('.brand img')).toHaveAttribute('src', avatarUrl);
    await expect(page.locator('.boot-logo img')).toHaveAttribute(
      'src',
      avatarUrl,
    );
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
      'href',
      avatarUrl,
    );
  } finally {
    release();
  }
  await expect(page.locator('.brand img')).toHaveJSProperty('naturalWidth', 96);
  await expect(page.locator('.boot-logo img')).toHaveJSProperty(
    'naturalWidth',
    96,
  );
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
    'href',
    avatarUrl,
  );
  await page.goto('/404.html');
  await expect(page.locator('main > img')).toHaveJSProperty('naturalWidth', 96);
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
    'href',
    avatarUrl,
  );
});
