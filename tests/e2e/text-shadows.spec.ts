import { test, expect, type Page } from '@playwright/test';
import { resources, ready } from '../support/browser';

async function checkTextFootprint(page: Page, scope: string, anchor: string) {
  await page.screenshot({ animations: 'disabled' });
  const geometry = await page.locator(scope).evaluate((surface, anchor) => {
    const range = document.createRange();
    range.selectNodeContents(surface.querySelector(anchor)!);
    const text = range.getBoundingClientRect();
    const bounds = surface.getBoundingClientRect();
    const separator = surface
      .querySelector('.post + .post')
      ?.getBoundingClientRect();
    return {
      decoration: separator
        ? [separator.left + separator.width * 0.65, separator.top - 4]
        : null,
      blank: [32, 40].map((distance) => [
        text.right + distance,
        text.top + text.height / 2,
      ]),
      near: [3, 5, 7].flatMap((distance) =>
        [0.25, 0.5, 0.75].map((y) => [
          text.right + distance,
          text.top + text.height * y,
        ]),
      ),
      bounds: [
        Math.max(0, bounds.left - 18),
        Math.max(0, bounds.top - 18),
        Math.min(innerWidth - 1, bounds.right + 18),
        Math.min(innerHeight - 1, bounds.bottom + 18),
      ],
    };
  }, anchor);
  const actual = await page.screenshot({ animations: 'disabled' });
  const override = await page.addStyleTag({
    content: '.text-surface,.posts-layout{filter:none!important}',
  });
  const baseline = await page.screenshot({ animations: 'disabled' });
  await override.evaluate((style) => {
    style.parentNode?.removeChild(style);
  });
  const pixels = await page.evaluate(
    async ({ actual, baseline, geometry }) => {
      async function read(png: string) {
        const image = new Image();
        image.src = 'data:image/png;base64,' + png;
        await image.decode();
        const ctx = new OffscreenCanvas(image.width, image.height).getContext(
          '2d',
        )!;
        ctx.drawImage(image, 0, 0);
        return ctx.getImageData(0, 0, image.width, image.height);
      }
      const [painted, clean] = await Promise.all([
        read(actual),
        read(baseline),
      ]);
      const sample = (image: ImageData, [x, y]: number[]) =>
        image.data[(Math.round(y) * image.width + Math.round(x)) * 4];
      const darkening = (point: number[]) =>
        (sample(clean, point) - sample(painted, point)) /
        Math.max(1, sample(clean, point));
      let maximum = 0;
      let backgroundSamples = 0;
      let peak: { point: number[]; painted: number; baseline: number } | null =
        null;
      const [left, top, right, bottom] = geometry.bounds;
      for (let y = top; y <= bottom; y += 2)
        for (let x = left; x <= right; x += 2) {
          // Filtered glyph antialiasing can differ; measure backdrop on background.
          if (sample(clean, [x, y]) < 250) continue;
          backgroundSamples++;
          const delta = darkening([x, y]);
          if (delta > maximum) {
            maximum = delta;
            peak = {
              point: [x, y],
              painted: sample(painted, [x, y]),
              baseline: sample(clean, [x, y]),
            };
          }
        }
      return {
        peak,
        backgroundSamples,
        decorationDarkening: geometry.decoration
          ? darkening(geometry.decoration)
          : 0,
        blank: geometry.blank.map((point) => sample(painted, point)),
        near: geometry.near.map(darkening),
        maximum,
      };
    },
    {
      actual: actual.toString('base64'),
      baseline: baseline.toString('base64'),
      geometry,
    },
  );
  // A short line must not paint the empty remainder of its containing box.
  for (const value of pixels.blank) expect(value).toBeGreaterThanOrEqual(254);
  expect(Math.max(...pixels.near)).toBeGreaterThan(0.008);
  // One common alpha mask caps opacity even where glyphs and lines are dense.
  expect(pixels.backgroundSamples).toBeGreaterThan(100);
  expect(pixels.maximum, JSON.stringify(pixels.peak)).toBeLessThan(0.16);
  expect(pixels.decorationDarkening).toBeLessThan(0.002);
}

for (const width of [1440, 390, 320]) {
  for (const section of [
    { name: '首页', scope: '#panel-home .text-surface', anchor: 'h1' },
    {
      name: '博客文章',
      scope: '#panel-posts .posts-layout',
      anchor: '.post time',
    },
  ]) {
    test(`${section.name} backdrop follows text and leaves blank space transparent at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await resources(page);
      await ready(page);
      if (section.name === '博客文章') {
        await page
          .getByRole('button', { name: section.name, exact: true })
          .click();
        await expect(page.locator('.post')).toHaveCount(10);
        await expect(page.locator('.panel:not([hidden])')).toHaveCount(1);
      }
      await page.mouse.move(width - 5, 5);
      await page.addStyleTag({
        content: '.scene{visibility:hidden}.stage{background:white}',
      });
      await checkTextFootprint(page, section.scope, section.anchor);
      // Reflow and new text must update the shape without keeping an old box.
      await page
        .locator(section.scope)
        .locator(section.anchor)
        .first()
        .evaluate((element) => {
          element.textContent = 'Hi';
        });
      await checkTextFootprint(page, section.scope, section.anchor);
    });
  }
}
