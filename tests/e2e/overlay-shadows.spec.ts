import { test, expect, type Page } from '@playwright/test';
import { resources, acknowledgeNotice } from '../support/browser';

const surfaces = [
  { name: 'cookie notice', selector: '#cookie-notice' },
  { name: 'footer popup', selector: '#filing-card' },
  { name: 'privacy dialog', selector: '#privacy-dialog' },
  { name: 'HostLoc dialog', selector: '#hostloc-dialog' },
  { name: 'standalone policy', selector: '.privacy-standalone' },
  { name: 'media message', selector: '#media-note' },
  { name: 'media tooltip', selector: '#play-button::after' },
];

async function openSurface(page: Page, name: string) {
  await resources(page);
  if (name === 'standalone policy') {
    await page.goto('/privacy.html');
  } else {
    await page.goto('/', {
      ...(name === 'HostLoc dialog'
        ? { referer: 'https://hostloc.com/thread-1' }
        : {}),
    });
    await expect(page.locator('#boot')).toBeHidden();
    if (name !== 'cookie notice' && name !== 'HostLoc dialog')
      await acknowledgeNotice(page);
    if (name === 'footer popup') await page.locator('#filing-trigger').click();
    if (name === 'privacy dialog')
      await page.locator('#footer-links [data-privacy-link]').click();
    if (name === 'media message') {
      // The first decoded frame clears transient media messages.
      await expect(page.locator('.scene video')).toHaveClass(/is-ready/);
      await page.locator('#media-note').evaluate((note) => {
        note.textContent = '背景视频暂时不可用，点击播放重试';
        (note as HTMLElement).hidden = false;
      });
    }
    if (name === 'media tooltip') await page.locator('#play-button').hover();
  }
  await page.addStyleTag({
    content:
      '.scene { visibility: hidden } .stage, .privacy-page { background: white }',
  });
}

for (const { name, selector } of surfaces) {
  test(`${name} has a balanced outer shadow on all four sides`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openSurface(page, name);
    const tooltip = name === 'media tooltip';
    const surface = page.locator(tooltip ? '#play-button' : selector);
    await expect(surface).toBeVisible();
    if (tooltip)
      await expect
        .poll(() =>
          surface.evaluate(
            (element) => getComputedStyle(element, '::after').opacity,
          ),
        )
        .toBe('1');
    else if (name !== 'standalone policy' && name !== 'media message')
      await expect(surface).toHaveCSS('opacity', '1');
    // Freeze transitions before measuring actual painted coordinates.
    await page.screenshot({ animations: 'disabled' });
    const points = await surface.evaluate((element, pseudo) => {
      const rect = element.getBoundingClientRect();
      let { left, top, width, height } = rect;
      if (pseudo) {
        const style = getComputedStyle(element, '::after');
        width =
          parseFloat(style.width) +
          parseFloat(style.paddingLeft) +
          parseFloat(style.paddingRight);
        height =
          parseFloat(style.height) +
          parseFloat(style.paddingTop) +
          parseFloat(style.paddingBottom);
        left = rect.right - parseFloat(style.right) - width;
        top = rect.bottom - parseFloat(style.bottom) - height;
      }
      return [4, 10].flatMap((distance) => [
        [left - distance, top + height / 2],
        [left + width + distance, top + height / 2],
        [left + width / 2, top - distance],
        [left + width / 2, top + height + distance],
      ]);
    }, tooltip);
    const actual = await page.screenshot({ animations: 'disabled' });
    await page.addStyleTag({
      content: selector + ' { box-shadow: none !important }',
    });
    const baseline = await page.screenshot({ animations: 'disabled' });
    const opacity = await page.evaluate(
      async ({ actual, baseline, points }) => {
        async function pixels(png: string) {
          const image = new Image();
          image.src = 'data:image/png;base64,' + png;
          await image.decode();
          const context = new OffscreenCanvas(
            image.width,
            image.height,
          ).getContext('2d')!;
          context.drawImage(image, 0, 0);
          return points.map(
            ([x, y]) =>
              context.getImageData(Math.round(x), Math.round(y), 1, 1).data[0],
          );
        }
        const [painted, clear] = await Promise.all([
          pixels(actual),
          pixels(baseline),
        ]);
        return clear.map(
          (value, index) => (value - painted[index]) / Math.max(1, value),
        );
      },
      {
        actual: actual.toString('base64'),
        baseline: baseline.toString('base64'),
        points,
      },
    );
    const near = opacity.slice(0, 4);
    for (const value of near) {
      expect(value).toBeGreaterThan(0.04);
      expect(value).toBeLessThan(0.16);
    }
    expect(Math.max(...near) - Math.min(...near)).toBeLessThan(0.09);
    for (let side = 0; side < 4; side++)
      expect(near[side]).toBeGreaterThan(opacity[side + 4]);
  });
}
