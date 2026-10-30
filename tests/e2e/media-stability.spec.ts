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

// The browser still loads/seeks/decodes the real fixture. Only the unstable
// interval between loadeddata and play() settling has a controlled failure.
async function pendingRecoveryPlay(page: Page, failures = 1) {
  await page.locator('video').evaluate((v: HTMLVideoElement, failures) => {
    const nativePlay = v.play.bind(v);
    const nativeLoad = v.load.bind(v);
    let error: MediaError | null = null;
    Object.defineProperty(v, 'error', { configurable: true, get: () => error });
    v.load = () => {
      error = null;
      nativeLoad();
    };
    v.play = () => {
      if (failures-- <= 0) return nativePlay();
      return new Promise<void>((_resolve, reject) => {
        v.dataset.pendingPlay = 'true';
        v.addEventListener(
          'test-fail-play',
          (event) => {
            delete v.dataset.pendingPlay;
            const detail = (
              event as CustomEvent<{ name?: string; delayRejection?: boolean }>
            ).detail;
            const name = detail?.name ?? 'NotSupportedError';
            if (name === 'NotSupportedError') {
              error = {
                code: 3,
                message: 'Decoder failed during play',
                MEDIA_ERR_ABORTED: 1,
                MEDIA_ERR_NETWORK: 2,
                MEDIA_ERR_DECODE: 3,
                MEDIA_ERR_SRC_NOT_SUPPORTED: 4,
              };
              v.dispatchEvent(new Event('error'));
            }
            const fail = () =>
              reject(new DOMException('Controlled play failure', name));
            if (detail?.delayRejection)
              v.addEventListener('test-reject-old-play', fail, { once: true });
            else fail();
          },
          { once: true },
        );
      });
    };
    v.dataset.outagePosition = String(v.currentTime);
    error = {
      code: 2,
      message: 'Network interrupted',
      MEDIA_ERR_ABORTED: 1,
      MEDIA_ERR_NETWORK: 2,
      MEDIA_ERR_DECODE: 3,
      MEDIA_ERR_SRC_NOT_SUPPORTED: 4,
    };
    v.dispatchEvent(new Event('error'));
  }, failures);
  await expect(page.locator('video')).toHaveAttribute(
    'data-pending-play',
    'true',
  );
}

test('a decoder error while recovery play is pending uses the remaining same-source retry', async ({
  page,
}) => {
  await resources(page);
  await ready(page);
  const video = page.locator('video');
  const src = await video.getAttribute('src');
  await expect(video).toHaveCSS('opacity', '1');
  await pendingRecoveryPlay(page);
  await video.evaluate((v) =>
    v.dispatchEvent(
      new CustomEvent('test-fail-play', { detail: { delayRejection: true } }),
    ),
  );
  await expect(video).toHaveJSProperty('paused', false);
  await expect(video).toHaveCSS('opacity', '1');
  await expect(video).toHaveAttribute('src', src!);
  const frames = await video.evaluate(
    (v: HTMLVideoElement) => v.getVideoPlaybackQuality().totalVideoFrames,
  );
  await expect
    .poll(() =>
      video.evaluate(
        (v: HTMLVideoElement) => v.getVideoPlaybackQuality().totalVideoFrames,
      ),
    )
    .toBeGreaterThan(frames);
  await video.dispatchEvent('test-reject-old-play');
  await expect(
    page.getByRole('button', { name: '暂停背景视频', exact: true }),
  ).toBeVisible();
  await expect(video).toHaveJSProperty('paused', false);
});

for (const name of ['NotAllowedError', 'AbortError']) {
  test(`${name} during recovery play does not consume a decoder retry`, async ({
    page,
  }) => {
    await resources(page);
    await ready(page);
    const video = page.locator('video');
    let reloads = 0;
    page.on('request', (request) => {
      if (request.url().includes('myqcloud.com')) reloads++;
    });
    await pendingRecoveryPlay(page);
    // An error notification without MediaError must not cancel pending playback.
    await video.dispatchEvent('error');
    await expect(
      page.getByRole('button', { name: '暂停背景视频', exact: true }),
    ).toBeVisible();
    if (name === 'AbortError')
      await page
        .getByRole('button', { name: '暂停背景视频', exact: true })
        .click();
    await video.evaluate(
      (v, name) =>
        v.dispatchEvent(
          new CustomEvent('test-fail-play', { detail: { name } }),
        ),
      name,
    );
    await expect(
      page.getByRole('button', { name: '播放背景视频', exact: true }),
    ).toBeVisible();
    await expect(video).toHaveJSProperty('paused', true);
    expect(reloads).toBe(1);
    await page
      .getByRole('button', { name: '播放背景视频', exact: true })
      .click();
    await expect(video).toHaveJSProperty('paused', false);
    await expect(video).toHaveCSS('opacity', '1');
    expect(reloads).toBe(1);
  });
}

test('exhausted recovery play errors retain the outage position for a manual retry', async ({
  page,
}) => {
  await resources(page);
  await ready(page);
  const video = page.locator('video');
  const src = await video.getAttribute('src');
  await video.evaluate((v: HTMLVideoElement) => {
    v.currentTime = 0.7;
    v.volume = 0.4;
    v.muted = false;
  });
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.seeking))
    .toBe(false);
  let reloads = 0;
  page.on('request', (request) => {
    if (request.url().includes('myqcloud.com')) reloads++;
  });
  await pendingRecoveryPlay(page, 2);
  const position = Number(await video.getAttribute('data-outage-position'));
  await video.dispatchEvent('test-fail-play');
  await expect(video).toHaveAttribute('data-pending-play', 'true');
  await video.dispatchEvent('test-fail-play');
  await expect(page.locator('#media-note')).toHaveText(
    '背景视频暂时不可用，点击播放重试',
  );
  await expect(video).toHaveJSProperty('paused', true);
  await expect(video).toHaveCSS('opacity', '0');
  expect(reloads).toBe(2);
  await video.evaluate((v: HTMLVideoElement) =>
    v.addEventListener(
      'playing',
      () => {
        v.dataset.retryPosition = String(v.currentTime);
      },
      { once: true },
    ),
  );
  await page.getByRole('button', { name: '播放背景视频', exact: true }).click();
  await expect(video).toHaveAttribute('data-retry-position');
  expect(Number(await video.getAttribute('data-retry-position'))).toBeCloseTo(
    position,
    1,
  );
  await expect(video).toHaveJSProperty('paused', false);
  await expect(video).toHaveJSProperty('volume', 0.4);
  await expect(video).toHaveJSProperty('muted', false);
  await expect(video).toHaveAttribute('src', src!);
});

test('a user pause during pending recovery play survives a subsequent decoder retry', async ({
  page,
}) => {
  await resources(page);
  await ready(page);
  const video = page.locator('video');
  let reloads = 0;
  page.on('request', (request) => {
    if (request.url().includes('myqcloud.com')) reloads++;
  });
  await pendingRecoveryPlay(page);
  await page.getByRole('button', { name: '暂停背景视频', exact: true }).click();
  await video.dispatchEvent('test-fail-play');
  await expect.poll(() => reloads).toBe(2);
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState))
    .toBeGreaterThanOrEqual(2);
  await expect(
    page.getByRole('button', { name: '播放背景视频', exact: true }),
  ).toBeVisible();
  await expect(video).toHaveJSProperty('paused', true);
  await page.getByRole('button', { name: '播放背景视频', exact: true }).click();
  await expect(video).toHaveJSProperty('paused', false);
  await expect(video).toHaveCSS('opacity', '1');
});

test('manual retry after failed reloads resumes from the position before the outage', async ({
  page,
}) => {
  await resources(page);
  await ready(page);
  const video = page.locator('video');
  const src = await video.getAttribute('src');
  await page.getByRole('button', { name: '暂停背景视频', exact: true }).click();
  await video.evaluate((v: HTMLVideoElement) => (v.currentTime = 0.7));
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.seeking))
    .toBe(false);
  let offline = true;
  let failures = 0;
  await page.route('https://**/*', (route) => {
    if (offline && route.request().url().includes('myqcloud.com')) {
      failures++;
      return route.abort('failed');
    }
    return route.fallback();
  });
  await interruptVideo(page);
  await expect(page.locator('#media-note')).toHaveText(
    '背景视频暂时不可用，点击播放重试',
  );
  expect(failures).toBe(2);
  offline = false;
  await video.evaluate((v: HTMLVideoElement) =>
    v.addEventListener(
      'playing',
      () => {
        v.dataset.retryPosition = String(v.currentTime);
      },
      { once: true },
    ),
  );
  await page.getByRole('button', { name: '播放背景视频', exact: true }).click();
  await expect(video).toHaveAttribute('data-retry-position');
  expect(Number(await video.getAttribute('data-retry-position'))).toBeCloseTo(
    0.7,
    1,
  );
  await expect(video).toHaveAttribute('src', src!);
  await expect(video).toHaveJSProperty('paused', false);
});

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
    if (interruption === 'pause') {
      await video.evaluate((v: HTMLVideoElement) =>
        v.addEventListener(
          'pause',
          () => {
            v.dataset.pauseObserved = 'true';
          },
          { once: true },
        ),
      );
      await page
        .getByRole('button', { name: '暂停背景视频', exact: true })
        .click();
      await expect(video).toHaveAttribute('data-pause-observed', 'true');
    } else await video.dispatchEvent('waiting');
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
