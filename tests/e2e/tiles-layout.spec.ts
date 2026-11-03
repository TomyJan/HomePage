import { test, expect } from '@playwright/test';
import { resources, ready } from '../support/browser';

for (const width of [1440, 390, 320]) {
  test(`card grids leave odd space at the upper right at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await resources(page);
    await ready(page);
    for (const name of ['服务导航', '联系支持']) {
      await page.getByRole('button', { name, exact: true }).click();
      await expect
        .poll(() => page.locator('.panel:not([hidden])').count())
        .toBe(1);
      const tiles = page.locator('.panel:not([hidden]) .tiles');
      // Exercise both parities in both real panels without changing their data.
      for (const removeLast of [false, true]) {
        if (removeLast)
          await tiles
            .locator('.tile')
            .last()
            .evaluate((el) => el.remove());
        const { columns, bounds } = await tiles.evaluate((grid) => ({
          columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
          bounds: Array.from(grid.querySelectorAll('.tile'), (tile) => {
            const rect = tile.getBoundingClientRect();
            return {
              left: rect.left,
              right: rect.right,
              top: rect.top,
              bottom: rect.bottom,
            };
          }),
        }));
        if (columns === 1) {
          for (let i = 1; i < bounds.length; i++) {
            expect(bounds[i].left).toBeCloseTo(bounds[0].left, 1);
            expect(bounds[i].top).toBeGreaterThan(bounds[i - 1].bottom);
          }
          continue;
        }
        expect(columns).toBe(2);
        const odd = bounds.length % 2;
        if (odd) {
          expect(bounds[1].left).toBeCloseTo(bounds[0].left, 1);
          expect(bounds[1].top).toBeGreaterThan(bounds[0].bottom);
        }
        for (let i = odd; i + 1 < bounds.length; i += 2) {
          expect(bounds[i].top).toBeCloseTo(bounds[i + 1].top, 1);
          expect(bounds[i].right).toBeLessThan(bounds[i + 1].left);
          if (i > 0)
            expect(bounds[i].top).toBeGreaterThan(bounds[i - 1].bottom);
        }
      }
    }
  });
}
