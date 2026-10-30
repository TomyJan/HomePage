import { $, reduced } from './dom';
import { privacyPolicy } from '../data/site';

export function initPrivacy() {
  const dialog = $<HTMLDialogElement>('#privacy-dialog');
  const notice = $('#cookie-notice');
  let ready = false,
    acknowledged = false,
    closeTimer = 0,
    noticeTimer = 0;
  let opener: HTMLElement | null = null;
  try {
    acknowledged =
      localStorage.getItem(privacyPolicy.storageKey) === privacyPolicy.version;
  } catch {
    /* Browsing remains available when storage is restricted. */
  }

  function showNotice() {
    ready = true;
    if (acknowledged) return;
    clearTimeout(noticeTimer);
    notice.hidden = false;
    notice.inert = false;
    void notice.offsetWidth;
    notice.classList.add('is-visible');
  }
  function hideNotice() {
    notice.inert = true;
    notice.classList.remove('is-visible');
    clearTimeout(noticeTimer);
    noticeTimer = window.setTimeout(
      () => {
        notice.hidden = true;
      },
      reduced.matches ? 0 : 220,
    );
  }
  function closePolicy() {
    if (!dialog.open) return;
    dialog.classList.remove('is-open');
    clearTimeout(closeTimer);
    closeTimer = window.setTimeout(
      () => {
        dialog.close();
        const target = [
          opener,
          document.querySelector<HTMLElement>('[data-footer-item="privacy"]'),
          $('#filing-trigger'),
          $('#view-button'),
        ].find(
          (element) =>
            element?.isConnected &&
            !element.closest('[hidden], [inert]') &&
            element.getClientRects().length > 0 &&
            getComputedStyle(element).visibility !== 'hidden',
        );
        target?.focus({ preventScroll: true });
      },
      reduced.matches ? 0 : 220,
    );
  }
  document.addEventListener('click', (event) => {
    const link =
      event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>('[data-privacy-link]')
        : null;
    if (
      !link ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.shiftKey
    )
      return;
    event.preventDefault();
    opener = link;
    clearTimeout(closeTimer);
    if (!dialog.open) dialog.showModal();
    void dialog.offsetWidth;
    dialog.classList.add('is-open');
  });
  $('#privacy-close').addEventListener('click', closePolicy);
  $('#privacy-done').addEventListener('click', closePolicy);
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closePolicy();
  });
  dialog.addEventListener('click', (event) => {
    const bounds = dialog.getBoundingClientRect();
    if (
      event.target === dialog &&
      (event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom)
    )
      closePolicy();
  });
  $('#cookie-confirm').addEventListener('click', () => {
    acknowledged = true;
    try {
      localStorage.setItem(privacyPolicy.storageKey, privacyPolicy.version);
    } catch {
      /* Keep the in-memory acknowledgement for this visit. */
    }
    hideNotice();
  });
  window.addEventListener('storage', (event) => {
    if (event.key !== privacyPolicy.storageKey && event.key !== null) return;
    acknowledged =
      event.key !== null && event.newValue === privacyPolicy.version;
    if (acknowledged) hideNotice();
    else if (ready) showNotice();
  });
  return { showNotice };
}
