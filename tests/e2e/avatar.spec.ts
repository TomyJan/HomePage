import { test, expect } from '@playwright/test';
import { resources } from '../support/browser';

test('the CDN avatar stays nonblocking and produces a rounded favicon', async ({
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
      headers: { 'Access-Control-Allow-Origin': '*' },
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
  const icon = page.locator('link[rel="icon"]');
  await expect(icon).toHaveAttribute('href', /^data:image\/png;base64,/);
  const pixels = await icon.evaluate(async (element: HTMLLinkElement) => {
    const image = new Image();
    image.src = element.href;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 96;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    return [
      context.getImageData(0, 0, 1, 1).data[3],
      context.getImageData(12, 12, 1, 1).data[3],
      context.getImageData(48, 48, 1, 1).data[3],
    ];
  });
  expect(pixels).toEqual([0, 255, 255]);
});
