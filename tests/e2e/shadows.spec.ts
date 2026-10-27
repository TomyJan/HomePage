import { test, expect } from '@playwright/test';
import { resources, ready } from '../support/browser';

for (const panel of [
  { name: '服务导航', id: 'panel-services' },
  { name: '联系支持', id: 'panel-contact' },
]) {
  test(`${panel.name} shadow has a constant core, transparent edges and a clear footer`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await resources(page);
    await ready(page);
    // A flat white scene makes opacity differences measurable independently of video frames.
    await page.addStyleTag({
      content: '.scene { visibility: hidden } .stage { background: white }',
    });
    await page.getByRole('button', { name: panel.name, exact: true }).click();
    await expect
      .poll(() => page.locator('.panel:not([hidden])').count())
      .toBe(1);
    await page.mouse.move(1400, 20);
    const points = await page
      .locator(`#${panel.id} .tile`)
      .evaluateAll((tiles) => {
        const bounds = tiles.map((tile) => tile.getBoundingClientRect());
        const gapX = (bounds[0].right + bounds[1].left) / 2;
        return [
          [gapX, bounds[0].top + 4],
          [gapX, bounds[2].top + bounds[2].height / 2],
          [gapX, bounds.at(-1)!.bottom - 4],
          [innerWidth / 2, innerHeight - 42],
          [gapX, bounds[0].top - 20],
          [gapX, bounds[0].top - 9],
        ];
      });
    const screenshot = await page.screenshot({ animations: 'disabled' });
    const pixels = await page.evaluate(
      async ({ png, points }) => {
        const image = new Image();
        image.src = 'data:image/png;base64,' + png;
        await image.decode();
        const canvas = new OffscreenCanvas(image.width, image.height);
        const context = canvas.getContext('2d')!;
        context.drawImage(image, 0, 0);
        return points.map(([x, y]) =>
          Array.from(
            context.getImageData(Math.round(x), Math.round(y), 1, 1).data,
          ),
        );
      },
      { png: screenshot.toString('base64'), points },
    );
    const core = pixels.slice(0, 3).map((pixel) => pixel[0]);
    expect(Math.max(...core) - Math.min(...core)).toBeLessThanOrEqual(1);
    expect(core[0]).toBeLessThan(250);
    expect(pixels[3]).toEqual([255, 255, 255, 255]);
    expect(pixels[4]).toEqual([255, 255, 255, 255]);
    expect(pixels[5][0]).toBeGreaterThan(core[0]);
    expect(pixels[5][0]).toBeLessThan(255);
  });
}
