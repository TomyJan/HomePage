import { $ } from './dom';
import { icon } from './icon';
import { initVideo } from './video';
import type { initFooter } from './footer';
import type { initOrigin } from './origin';
export function initMedia(
  footer: ReturnType<typeof initFooter>,
  origin: ReturnType<typeof initOrigin>,
) {
  const stage = $<HTMLElement>('#stage');
  const ui = $<HTMLElement>('#ui-layer');
  const video = $<HTMLVideoElement>('#scene-video');
  const bar = $<HTMLElement>('#player-bar');
  const viewButton = $<HTMLButtonElement>('#view-button');
  const playButton = $<HTMLButtonElement>('#play-button');
  const soundButton = $<HTMLButtonElement>('#sound-button');
  let viewing = false,
    pointerInBar = false,
    hideTimer = 0;
  let noteTimer = 0;
  const playback = initVideo(video, refreshMedia, (message) => {
    const note = $('#media-note');
    clearTimeout(noteTimer);
    note.hidden = !message;
    if (message) {
      note.textContent = message;
      noteTimer = window.setTimeout(() => {
        note.hidden = true;
      }, 4500);
    }
  });
  function keyboardFocusInBar() {
    return (
      bar.contains(document.activeElement) &&
      document.activeElement?.matches(':focus-visible')
    );
  }
  function wakeControls() {
    stage.classList.remove('controls-asleep');
    clearTimeout(hideTimer);
    if (viewing && !pointerInBar && !keyboardFocusInBar())
      hideTimer = window.setTimeout(() => {
        if (viewing && !pointerInBar && !keyboardFocusInBar())
          stage.classList.add('controls-asleep');
      }, 1000);
  }
  function setViewing(next: boolean) {
    viewing = next;
    stage.classList.toggle('is-viewing', viewing);
    ui.inert = viewing;
    viewButton.setAttribute('aria-pressed', String(viewing));
    viewButton.setAttribute(
      'aria-label',
      viewing ? '恢复界面（Esc）' : '隐藏界面',
    );
    icon(viewButton, viewing ? 'eye' : 'eye-off');
    footer.setFiling(false);
    wakeControls();
  }
  viewButton.addEventListener('click', () => setViewing(!viewing));
  stage.addEventListener(
    'pointermove',
    (event) => {
      if (!viewing) return;
      const bounds = bar.getBoundingClientRect();
      pointerInBar =
        event.pointerType !== 'touch' &&
        event.clientX >= bounds.left &&
        event.clientX <= bounds.right &&
        event.clientY >= bounds.top &&
        event.clientY <= bounds.bottom;
      wakeControls();
    },
    { passive: true },
  );
  stage.addEventListener('pointerleave', () => {
    pointerInBar = false;
    if (viewing) wakeControls();
  });
  stage.addEventListener(
    'pointerdown',
    (event) => {
      if (viewing && event.pointerType === 'touch') {
        pointerInBar = false;
        wakeControls();
      }
    },
    { passive: true },
  );
  bar.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'touch') {
      pointerInBar = true;
      if (viewing) wakeControls();
    }
  });
  bar.addEventListener('pointerleave', () => {
    pointerInBar = false;
    if (viewing) wakeControls();
  });
  bar.addEventListener('focusin', () => {
    if (viewing) wakeControls();
  });
  bar.addEventListener('focusout', () =>
    queueMicrotask(() => {
      if (viewing) wakeControls();
    }),
  );
  window.addEventListener('keydown', (event) => {
    if (origin.isOpen()) return;
    if (viewing) wakeControls();
    if (event.key === 'Escape') {
      if (footer.isOpen()) {
        footer.setFiling(false);
        $('#filing-trigger').focus({ preventScroll: true });
      } else if (viewing) {
        setViewing(false);
        viewButton.focus({ preventScroll: true });
      }
    }
  });
  function refreshMedia() {
    icon(playButton, playback.isPaused() ? 'play' : 'pause');
    playButton.setAttribute(
      'aria-label',
      playback.isPaused() ? '播放背景视频' : '暂停背景视频',
    );
    icon(soundButton, video.muted ? 'muted' : 'volume');
    soundButton.setAttribute('aria-label', video.muted ? '取消静音' : '静音');
    soundButton.setAttribute('aria-pressed', String(!video.muted));
  }
  playButton.addEventListener('click', () => {
    if (playback.isPaused()) void playback.play();
    else playback.pause();
    wakeControls();
  });
  soundButton.addEventListener('click', () => {
    video.muted = !video.muted;
    refreshMedia();
    wakeControls();
  });
  return { play: playback.play, refreshMedia };
}
