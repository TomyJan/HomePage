import { test, expect, type Page } from '@playwright/test';
import { resources, ready } from '../support/browser';

async function edgePixels(page: Page) {
  const png = await page.screenshot({ animations: 'disabled' });
  return page.evaluate(async (base64) => {
    const image = new Image();
    image.src = 'data:image/png;base64,' + base64;
    await image.decode();
    const canvas = new OffscreenCanvas(image.width, image.height);
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    const points = [0.1, 0.5, 0.9].flatMap((fraction) => [
      [Math.floor((image.width - 1) * fraction), 0],
      [Math.floor((image.width - 1) * fraction), image.height - 1],
      [0, Math.floor((image.height - 1) * fraction)],
      [image.width - 1, Math.floor((image.height - 1) * fraction)],
    ]);
    return points.flatMap(([x, y]) =>
      Array.from(context.getImageData(x, y, 1, 1).data),
    );
  }, png.toString('base64'));
}

for (const device of [
  { width: 1440, height: 901, dpr: 1.5, mobile: false },
  { width: 400, height: 773, dpr: 3, mobile: true },
]) {
  test(`media edges retain coverage at ${device.width}px and DPR ${device.dpr}`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: device.width, height: device.height },
      deviceScaleFactor: device.dpr,
      isMobile: device.mobile,
      hasTouch: device.mobile,
    });
    try {
      const page = await context.newPage();
      await resources(page);
      await ready(page);
      const video = page.locator('#scene-video');
      await expect(video).toHaveClass(/is-ready/);
      const pause = page.getByRole('button', { name: '暂停背景视频' });
      if (device.mobile) await pause.tap();
      else await pause.click();
      await expect(video).toHaveJSProperty('paused', true);
      // A bright underlying surface makes a one-device-pixel texture gap visible.
      await page.addStyleTag({
        content:
          '.fallback { background: white !important } .fallback-image { visibility: hidden !important }',
      });
      const baseline = await edgePixels(page);
      // Model a raster/compositor edge losing one physical pixel, not a UI border.
      await page.addStyleTag({
        content: `#scene-video { clip-path: inset(${1 / device.dpr}px) }`,
      });
      const assertCovered = async () => {
        const actual = await edgePixels(page);
        const difference = Math.max(
          ...actual.map((channel, index) =>
            Math.abs(channel - baseline[index]),
          ),
        );
        expect(difference).toBeLessThanOrEqual(2);
      };
      await assertCovered();
      const hide = page.getByRole('button', { name: '隐藏界面', exact: true });
      if (device.mobile) await hide.tap();
      else await hide.click();
      if (!device.mobile) await page.mouse.move(device.width / 2, 100);
      await expect(page.locator('#stage')).toHaveClass(/controls-asleep/);
      await assertCovered();
      await expect(video).toHaveJSProperty('paused', true);
      expect(await page.locator('video').count()).toBe(1);
      expect(
        await page.evaluate(() => ({
          horizontal: document.documentElement.scrollWidth > innerWidth,
          vertical: document.documentElement.scrollHeight > innerHeight,
        })),
      ).toEqual({ horizontal: false, vertical: false });
    } finally {
      await context.close();
    }
  });
}
