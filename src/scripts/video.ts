import { reduced } from './dom';

/** Owns the single video element: UI transitions never reload or replace it. */
export function initVideo(
  video: HTMLVideoElement,
  onState: () => void,
  onMessage: (message: string | null) => void,
) {
  let wantsPlayback = !reduced.matches;
  let recovering = false;
  let failed = false;
  let attempts = 0;
  let generation = 0;
  let stableTimer = 0;
  let recoveryPosition: number | null = null;

  function stopForFallback() {
    generation++;
    video.pause();
    video.classList.remove('is-ready');
  }

  function showFrame() {
    const current = generation;
    const reveal = () => {
      if (current === generation && !failed && video.readyState >= 2) {
        video.classList.add('is-ready');
        onMessage(null);
      }
    };
    if ('requestVideoFrameCallback' in video)
      video.requestVideoFrameCallback(reveal);
    else reveal();
  }

  function reloadAt(position: number) {
    return new Promise<void>((resolve, reject) => {
      const finish = (error?: Error) => {
        clearTimeout(timer);
        video.removeEventListener('loadedmetadata', seek);
        video.removeEventListener('loadeddata', ready);
        video.removeEventListener('error', fail);
        if (error) reject(error);
        else resolve();
      };
      const seek = () => {
        if (position > 0 && Number.isFinite(video.duration)) {
          video.currentTime = Math.min(
            position,
            Math.max(0, video.duration - 0.05),
          );
        }
      };
      const ready = () => finish();
      const fail = () => finish(new Error('Video reload failed'));
      const timer = window.setTimeout(
        () => finish(new Error('Video reload timed out')),
        8000,
      );
      video.addEventListener('loadedmetadata', seek, { once: true });
      video.addEventListener('loadeddata', ready, { once: true });
      video.addEventListener('error', fail, { once: true });
      // load() retains the selected URL, mute, volume and loop settings.
      video.autoplay = false;
      video.load();
    });
  }

  async function start() {
    const current = generation;
    try {
      await video.play();
    } catch {
      // load() aborts an older play promise; it must not cancel the new intent.
      if (current === generation && wantsPlayback) {
        wantsPlayback = false;
        onMessage('点击播放继续背景视频');
      }
    }
    onState();
  }

  async function recover() {
    if (recovering) return;
    const position = recoveryPosition ?? video.currentTime;
    recoveryPosition = position;
    recovering = true;
    failed = false;
    stopForFallback();
    onMessage('正在恢复背景视频…');
    onState();
    try {
      while (attempts < 2) {
        attempts++;
        try {
          await reloadAt(position);
          recoveryPosition = null;
          if (wantsPlayback) await start();
          return;
        } catch {
          /* Retry the same URL within the bounded recovery budget. */
        }
      }
      failed = true;
      wantsPlayback = false;
      stopForFallback();
      onMessage('背景视频暂时不可用，点击播放重试');
    } finally {
      recovering = false;
      onState();
    }
  }

  async function play() {
    wantsPlayback = true;
    if (recovering) {
      onState();
      return;
    }
    if (failed || video.error) {
      attempts = 0;
      await recover();
    } else await start();
  }

  function pause() {
    wantsPlayback = false;
    video.pause();
    onState();
  }

  video.addEventListener('playing', () => {
    failed = false;
    if (!video.classList.contains('is-ready')) showFrame();
    if (!stableTimer)
      stableTimer = window.setTimeout(() => {
        attempts = 0;
        stableTimer = 0;
      }, 30000);
    onState();
  });
  ['pause', 'waiting', 'stalled'].forEach((event) =>
    video.addEventListener(event, () => {
      clearTimeout(stableTimer);
      stableTimer = 0;
    }),
  );
  video.addEventListener('error', () => {
    // waiting/stalled or an event without MediaError is not a failed decoder.
    const error = video.error;
    if (!error || recovering) return;
    clearTimeout(stableTimer);
    stableTimer = 0;
    if (error.code === 2 || error.code === 3) {
      void recover();
      return;
    }
    wantsPlayback = false;
    failed = true;
    stopForFallback();
    onMessage('背景视频暂时不可用，点击播放重试');
    onState();
  });
  ['play', 'pause', 'volumechange'].forEach((event) =>
    video.addEventListener(event, onState),
  );

  return {
    play,
    pause,
    isPaused: () => (recovering ? !wantsPlayback : video.paused),
  };
}
