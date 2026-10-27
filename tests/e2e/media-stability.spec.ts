import { test, expect, type Page } from '@playwright/test';
import { resources, ready } from '../support/browser';

test('native context menus remain available while the background video is not a pointer target', async ({
  page,
}) => {
  await resources(page);
  await ready(page);
  const video = page.locator('video');
  const menuAllowed = (element: Element) =>
    element.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
    );
  const checkBackgroundMenu = async () => {
    await page.evaluate(() => {
      delete document.documentElement.dataset.testContext;
      window.addEventListener(
        'contextmenu',
        (event) => {
          document.documentElement.dataset.testContext = JSON.stringify({
            prevented: event.defaultPrevented,
            target: (event.target as Element).tagName,
          });
        },
        { once: true },
      );
    });
    await page.mouse.click(700, 200, { button: 'right' });
    await expect(page.locator('html')).toHaveAttribute('data-test-context');
    const event = JSON.parse(
      (await page.locator('html').getAttribute('data-test-context'))!,
    );
    expect(event.prevented).toBe(false);
    expect(event.target).not.toBe('VIDEO');
  };
  await checkBackgroundMenu();
  expect(await page.locator('#ui-layer').evaluate(menuAllowed)).toBe(true);
  expect(await page.locator('.commit-link').evaluate(menuAllowed)).toBe(true);
  expect(await page.locator('#uptime').evaluate(menuAllowed)).toBe(true);
  await page.getByRole('button', { name: '备案信息', exact: true }).click();
  expect(await page.locator('.filing-note').evaluate(menuAllowed)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(video).toHaveJSProperty('controls', false);
  await expect(video).toHaveJSProperty('disablePictureInPicture', true);
  await expect(video).toHaveJSProperty('disableRemotePlayback', true);
  await expect(video).toHaveJSProperty('inert', true);
  await page.getByRole('button', { name: '隐藏界面', exact: true }).click();
  await checkBackgroundMenu();
  expect(await page.locator('#stage').evaluate(menuAllowed)).toBe(true);
  await expect(page.locator('#stage')).toHaveClass(/controls-asleep/);
  await checkBackgroundMenu();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '暂停背景视频', exact: true }).click();
  await expect(video).toHaveJSProperty('paused', true);
});

async function interruptVideo(page: Page) {
  await page.locator('video').evaluate((v: HTMLVideoElement) => {
    Object.defineProperty(v, 'error', {
      configurable: true,
      value: { code: 2, message: 'Network interrupted' },
    });
    v.dispatchEvent(new Event('error'));
    Reflect.deleteProperty(v, 'error');
  });
}

test('an interrupted first play cannot cancel recovery of the selected video', async ({
  page,
}) => {
  await resources(page);
  let requests = 0;
  let release!: () => void;
  const firstRequest = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('https://**/*', async (route) => {
    if (route.request().url().includes('myqcloud.com') && ++requests === 1)
      await firstRequest;
    await route.fallback();
  });
  await ready(page);
  await expect.poll(() => requests).toBeGreaterThan(0);
  await expect(page.locator('video')).toHaveJSProperty('paused', false);
  await interruptVideo(page);
  release();
  await expect.poll(() => requests).toBeGreaterThan(1);
  await expect(page.locator('video')).toHaveCSS('opacity', '1');
  await expect(page.locator('video')).toHaveJSProperty('paused', false);
});

for (const interruption of ['pause', 'waiting'] as const) {
  test(`${interruption} does not replenish the bounded recovery budget`, async ({
    page,
  }) => {
    await resources(page);
    await ready(page);
    const video = page.locator('video');
    await expect(video).toHaveCSS('opacity', '1');
    await page.clock.install();
    let reloads = 0;
    page.on('request', (request) => {
      if (request.url().includes('myqcloud.com')) reloads++;
    });
    for (let i = 1; i <= 2; i++) {
      await interruptVideo(page);
      await expect.poll(() => reloads).toBe(i);
      await expect(video).toHaveJSProperty('paused', false);
      await expect
        .poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState))
        .toBeGreaterThanOrEqual(2);
    }
    if (interruption === 'pause')
      await page
        .getByRole('button', { name: '暂停背景视频', exact: true })
        .click();
    else await video.dispatchEvent('waiting');
    await page.clock.runFor(30001);
    await interruptVideo(page);
    await expect(video).toHaveJSProperty('paused', true);
    await expect(page.locator('#media-note')).toHaveText(
      '背景视频暂时不可用，点击播放重试',
    );
    expect(reloads).toBe(2);
  });
}

test('continuous stable playback replenishes the recovery budget', async ({
  page,
}) => {
  await resources(page);
  await ready(page);
  const video = page.locator('video');
  await expect(video).toHaveCSS('opacity', '1');
  await page.clock.install();
  let reloads = 0;
  page.on('request', (request) => {
    if (request.url().includes('myqcloud.com')) reloads++;
  });
  for (let i = 1; i <= 2; i++) {
    await interruptVideo(page);
    await expect.poll(() => reloads).toBe(i);
    await expect(video).toHaveJSProperty('paused', false);
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState))
      .toBeGreaterThanOrEqual(2);
  }
  await page.clock.runFor(30001);
  await interruptVideo(page);
  await expect.poll(() => reloads).toBe(3);
  await expect(video).toHaveJSProperty('paused', false);
});

test('buffering and an error notification without a native failure keep decoded video visible', async ({
  page,
}) => {
  await resources(page);
  await ready(page);
  const video = page.locator('video');
  await expect(video).toHaveCSS('opacity', '1');
  const frames = await video.evaluate(
    (v: HTMLVideoElement) => v.getVideoPlaybackQuality().totalVideoFrames,
  );
  const opacity = await video.evaluate((v: HTMLVideoElement) => {
    v.dispatchEvent(new Event('waiting'));
    v.dispatchEvent(new Event('stalled'));
    v.dispatchEvent(new Event('error'));
    void v.offsetWidth;
    v.getAnimations().forEach((animation) => animation.finish());
    return getComputedStyle(v).opacity;
  });
  expect(opacity).toBe('1');
  await expect
    .poll(() =>
      video.evaluate(
        (v: HTMLVideoElement) => v.getVideoPlaybackQuality().totalVideoFrames,
      ),
    )
    .toBeGreaterThan(frames);
  await expect(video).toHaveJSProperty('paused', false);
});

test('a recoverable media failure reloads the same selected video and preserves a manual pause', async ({
  page,
}) => {
  await resources(page);
  await ready(page);
  const video = page.locator('video');
  const src = await video.getAttribute('src');
  await page.getByRole('button', { name: '暂停背景视频', exact: true }).click();
  await page.getByRole('button', { name: '取消静音', exact: true }).click();
  await video.evaluate((v: HTMLVideoElement) => (v.currentTime = 0.4));
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.seeking))
    .toBe(false);
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeCloseTo(0.4, 1);
  let reloads = 0;
  page.on('request', (request) => {
    if (request.url().includes('myqcloud.com')) reloads++;
  });
  await video.evaluate((v: HTMLVideoElement) => {
    Object.defineProperty(v, 'error', {
      configurable: true,
      value: { code: 2, message: 'Network interrupted' },
    });
    v.dispatchEvent(new Event('error'));
    Reflect.deleteProperty(v, 'error');
  });
  await expect.poll(() => reloads).toBeGreaterThan(0);
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState))
    .toBeGreaterThanOrEqual(2);
  await expect(video).toHaveAttribute('src', src!);
  await expect(video).toHaveJSProperty('paused', true);
  await expect(video).toHaveJSProperty('muted', false);
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeCloseTo(0.4, 1);
  await page.getByRole('button', { name: '播放背景视频', exact: true }).click();
  await expect(video).toHaveCSS('opacity', '1');
  await expect(video).toHaveJSProperty('paused', false);
  await expect(page.locator('video')).toHaveCount(1);
});

test('native unsupported-media failure stops audio before showing the fallback', async ({
  page,
}) => {
  await resources(page);
  await ready(page);
  const video = page.locator('video');
  await expect(video).toHaveJSProperty('paused', false);
  await video.evaluate((v: HTMLVideoElement) => {
    Object.defineProperty(v, 'error', {
      configurable: true,
      value: { code: 4, message: 'Unsupported media' },
    });
    v.dispatchEvent(new Event('error'));
    Reflect.deleteProperty(v, 'error');
  });
  await expect(video).toHaveJSProperty('paused', true);
  await expect(video).toHaveCSS('opacity', '0');
  await expect(page.locator('.fallback-image')).toHaveCSS('opacity', '1');
});

test('a decoder failure resumes actual video frames from the same source', async ({
  page,
}) => {
  await resources(page);
  await ready(page);
  const video = page.locator('video'),
    src = await video.getAttribute('src');
  let reloads = 0;
  page.on('request', (request) => {
    if (request.url().includes('myqcloud.com')) reloads++;
  });
  await video.evaluate((v: HTMLVideoElement) => {
    Object.defineProperty(v, 'error', {
      configurable: true,
      value: { code: 3, message: 'Decoder interrupted' },
    });
    v.dispatchEvent(new Event('error'));
    Reflect.deleteProperty(v, 'error');
  });
  await expect.poll(() => reloads).toBeGreaterThan(0);
  await expect(video).toHaveCSS('opacity', '1');
  await expect(video).toHaveJSProperty('paused', false);
  await expect
    .poll(() =>
      video.evaluate(
        (v: HTMLVideoElement) => v.getVideoPlaybackQuality().totalVideoFrames,
      ),
    )
    .toBeGreaterThan(0);
  await expect(video).toHaveAttribute('src', src!);
});
