import { $, reduced } from './dom';
import { isHostlocReferrer } from '../lib/domains';
export function initOrigin() {
  const originDialog = $<HTMLDialogElement>('#hostloc-dialog');
  let originCloseTimer = 0,
    originFrame = 0,
    originFocus: HTMLElement | null = null;
  function closeOriginNotice() {
    if (!originDialog.open) return;
    clearTimeout(originCloseTimer);
    cancelAnimationFrame(originFrame);
    originDialog.classList.remove('is-open');
    originCloseTimer = window.setTimeout(
      () => {
        originDialog.close();
        if (originFocus?.isConnected)
          originFocus.focus({ preventScroll: true });
      },
      reduced.matches ? 0 : 240,
    );
  }
  function showOriginNotice() {
    if (!isHostlocReferrer(document.referrer) || originDialog.open) return;
    originFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    originDialog.showModal();
    void originDialog.offsetWidth;
    originFrame = requestAnimationFrame(() =>
      originDialog.classList.add('is-open'),
    );
  }
  $('#hostloc-close').addEventListener('click', closeOriginNotice);
  $('#hostloc-confirm').addEventListener('click', closeOriginNotice);
  originDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeOriginNotice();
  });
  originDialog.addEventListener('click', (event) => {
    const bounds = originDialog.getBoundingClientRect();
    if (
      event.target === originDialog &&
      (event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom)
    )
      closeOriginNotice();
  });

  return { showOriginNotice, isOpen: () => originDialog.open };
}
