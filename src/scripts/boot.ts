import { $, delay, reduced } from './dom';
import { resources, videoSources } from '../data/site';
import { getFilingState } from '../lib/domains';

function loadMiSans() {
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = resources.font;
  stylesheet.dataset.resource = 'misans';
  const loaded = new Promise((resolve) => {
    stylesheet.onload = () =>
      document.fonts
        .load('400 13px MiSans', '荼蘼 TomyJan 我是一只菜狗')
        .then(resolve, resolve);
    stylesheet.onerror = resolve;
  });
  document.head.append(stylesheet);
  return Promise.race([loaded, delay(1800)]);
}
function loadAnalytics() {
  if (getFilingState(location.hostname).kind === 'local') {
    document.documentElement.dataset.analytics = 'preview-skipped';
    return;
  }
  const script = document.createElement('script');
  script.async = true;
  script.src = resources.analytics;
  script.dataset.websiteId = resources.websiteId;
  script.dataset.resource = 'umami';
  document.head.append(script);
}
export function boot(
  onReady: () => void,
  showOrigin: () => void,
  play: () => Promise<void>,
  refresh: () => void,
) {
  const stage = $('#stage'),
    ui = $('#ui-layer'),
    bar = $('#player-bar'),
    loader = $('#boot'),
    video = $<HTMLVideoElement>('#scene-video');
  const source = videoSources[Math.floor(Math.random() * videoSources.length)];
  requestAnimationFrame(() =>
    requestAnimationFrame(async () => {
      const firstPaint = performance.now();
      document.documentElement.dataset.bootPhase = 'minimum';
      const fonts = loadMiSans();
      const image = $<HTMLImageElement>('.fallback-image');
      image.onload = () => image.classList.add('is-ready');
      image.src = resources.fallback;
      video.src = source;
      if (reduced.matches) {
        video.autoplay = false;
        video.preload = 'metadata';
        video.load();
        refresh();
      } else {
        video.preload = 'auto';
        void play();
      }
      await Promise.all([delay(1200), fonts]);
      document.documentElement.dataset.bootElapsed = String(
        Math.round(performance.now() - firstPaint),
      );
      document.documentElement.dataset.bootPhase = 'transition';
      loader.classList.add('is-done');
      stage.classList.add('is-ready');
      stage.setAttribute('aria-busy', 'false');
      ui.inert = false;
      bar.inert = false;
      onReady();
      if ('requestIdleCallback' in window)
        requestIdleCallback(loadAnalytics, { timeout: 2000 });
      else setTimeout(loadAnalytics, 0);
      if (!reduced.matches) {
        $('.brand').animate(
          [
            { opacity: 0, transform: 'translateY(-5px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ],
          { duration: 600, easing: 'ease-out' },
        );
        $('.dock').animate(
          [
            { opacity: 0, transform: 'translateY(10px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ],
          {
            duration: 650,
            delay: 90,
            easing: 'cubic-bezier(.22,.75,.26,1)',
            fill: 'both',
          },
        );
      }
      await delay(reduced.matches ? 0 : 550);
      loader.hidden = true;
      document.documentElement.dataset.bootPhase = 'ready';
      showOrigin();
    }),
  );
}
