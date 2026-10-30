import { test, expect } from '@playwright/test';
import { resources, ready } from '../support/browser';

for (const width of [1440, 390, 320]) {
  for (const section of [
    { name: '首页', id: 'panel-home' },
    { name: '博客文章', id: 'panel-posts' },
  ]) {
    test(`${section.name} has a light flat backdrop without accumulated text shadows at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await resources(page);
      await ready(page);
      if (section.id === 'panel-posts') {
        await page
          .getByRole('button', { name: section.name, exact: true })
          .click();
        await expect(page.locator('.post')).toHaveCount(10);
        await expect(page.locator('.panel:not([hidden])')).toHaveCount(1);
      }
      await page.mouse.move(width - 5, 5);
      await page.screenshot({ animations: 'disabled' });
      const geometry = await page
        .locator('#' + section.id)
        .evaluate((panel) => {
          const scroll = panel.querySelector('.panel-scroll')!;
          const viewport = scroll.getBoundingClientRect();
          const style = getComputedStyle(scroll);
          const heading = panel.querySelector('h1')?.getBoundingClientRect();
          const ending = panel
            .querySelector('.quote, .posts-more')!
            .getBoundingClientRect();
          const left = viewport.left + parseFloat(style.paddingLeft);
          const right = viewport.right - parseFloat(style.paddingRight);
          const top = Math.max(
            heading?.top ?? viewport.top + parseFloat(style.paddingTop),
            viewport.top + parseFloat(style.paddingTop),
          );
          const bottom = Math.min(
            ending.bottom,
            panel.id === 'panel-home'
              ? viewport.bottom - parseFloat(style.paddingBottom)
              : ending.bottom,
          );
          const textRects: number[][] = [];
          const walker = document.createTreeWalker(panel, NodeFilter.SHOW_TEXT);
          while (walker.nextNode()) {
            if (!walker.currentNode.textContent?.trim()) continue;
            const range = document.createRange();
            range.selectNodeContents(walker.currentNode);
            for (const rect of range.getClientRects())
              textRects.push([
                rect.left - 3,
                rect.top - 3,
                rect.right + 3,
                rect.bottom + 3,
              ]);
          }
          const core = [0.15, 0.5, 0.85].flatMap((x) =>
            [0.25, 0.5, 0.75].map((y) => [
              left + (right - left) * x,
              top + (bottom - top) * y,
            ]),
          );
          const gaps: number[][] = [];
          for (let y = top + 12; y < bottom - 12; y += 3)
            for (let x = left + 12; x < right - 12; x += 3)
              if (
                !textRects.some(
                  ([l, t, r, b]) => x >= l && x <= r && y >= t && y <= b,
                )
              )
                gaps.push([x, y]);
          return {
            core,
            gaps,
            edge: [
              [right + 9, (top + bottom) / 2],
              [right + 20, (top + bottom) / 2],
            ],
          };
        });
      // Hide glyph ink without changing layout or their explicitly colored shadows.
      await page.addStyleTag({
        content:
          '.scene{visibility:hidden}.stage{background:white}.text-panel,.text-panel *{color:transparent!important}.post::before{display:none}',
      });
      const withTextShadows = await page.screenshot({ animations: 'disabled' });
      await page.addStyleTag({
        content: '.text-panel,.text-panel *{text-shadow:none!important}',
      });
      const backdropOnly = await page.screenshot({ animations: 'disabled' });
      const pixels = await page.evaluate(
        async ({ actual, baseline, geometry }) => {
          async function read(png: string) {
            const image = new Image();
            image.src = 'data:image/png;base64,' + png;
            await image.decode();
            const ctx = new OffscreenCanvas(
              image.width,
              image.height,
            ).getContext('2d')!;
            ctx.drawImage(image, 0, 0);
            return ctx;
          }
          const [painted, clean] = await Promise.all([
            read(actual),
            read(baseline),
          ]);
          const sample = (
            ctx: OffscreenCanvasRenderingContext2D,
            [x, y]: number[],
          ) => ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data[0];
          return {
            core: geometry.core.map((point) => sample(clean, point)),
            edge: geometry.edge.map((point) => sample(clean, point)),
            gapDarkening: geometry.gaps.map((point) => {
              const base = sample(clean, point);
              return (base - sample(painted, point)) / Math.max(1, base);
            }),
          };
        },
        {
          actual: withTextShadows.toString('base64'),
          baseline: backdropOnly.toString('base64'),
          geometry,
        },
      );
      expect(Math.min(...pixels.core)).toBeGreaterThan(200);
      expect(Math.max(...pixels.core)).toBeLessThan(240);
      expect(
        Math.max(...pixels.core) - Math.min(...pixels.core),
      ).toBeLessThanOrEqual(2);
      expect(pixels.edge[0]).toBeGreaterThan(Math.max(...pixels.core));
      expect(pixels.edge[0]).toBeLessThan(255);
      expect(pixels.edge[1]).toBe(255);
      expect(pixels.gapDarkening.length).toBeGreaterThan(20);
      expect(Math.max(...pixels.gapDarkening)).toBeLessThan(0.035);
    });
  }
}
