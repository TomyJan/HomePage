import { $, reduced } from './dom';
export function initNavigation(maybeLoadPosts: () => void) {
  const host = $('#content-host');
  const panels = Array.from(
    document.querySelectorAll<HTMLElement>('[data-panel]'),
  );
  const entries = Array.from(
    document.querySelectorAll<HTMLButtonElement>('.entry'),
  );
  let currentPage: string | null = 'home';
  let transition = 0;
  let panelAnimations: Animation[] = [];
  function panelHeight(panel: HTMLElement | undefined) {
    return panel ? Math.ceil(panel.getBoundingClientRect().height) : 0;
  }
  let layoutFrame = 0;
  function updateScroll() {
    const panel = panels.find((panel) => panel.dataset.panel === currentPage);
    const scroll = panel?.querySelector<HTMLElement>('.panel-scroll'),
      track = $('#scroll-indicator'),
      thumb = $('#scroll-thumb');
    const overflow = !!scroll && scroll.scrollHeight > scroll.clientHeight + 1;
    host.classList.toggle('has-scroll', overflow);
    if (!scroll) return;
    // 按实际矩形对齐导航的上下沿，避开整数高度和阴影留白造成的偏差。
    const navBounds = $('.nav').getBoundingClientRect(),
      hostBounds = host.getBoundingClientRect();
    track.style.top = navBounds.top - hostBounds.top + 'px';
    track.style.height = navBounds.height + 'px';
    const remaining =
      scroll.scrollHeight - scroll.clientHeight - scroll.scrollTop;
    scroll.style.setProperty(
      '--fade-top',
      scroll.scrollTop > 1 ? '18px' : '0px',
    );
    scroll.style.setProperty('--fade-bottom', remaining > 1 ? '22px' : '0px');
    scroll.style.setProperty(
      '--clip-top',
      scroll.scrollTop > 1 ? '24px' : '0px',
    );
    scroll.style.setProperty(
      '--clip-bottom',
      remaining > 1 ? getComputedStyle(scroll).paddingBottom : '0px',
    );
    if (overflow) {
      const height = Math.max(
        18,
        (track.clientHeight * scroll.clientHeight) / scroll.scrollHeight,
      );
      thumb.style.height = height + 'px';
      thumb.style.transform =
        'translateY(' +
        Math.max(
          0,
          Math.min(
            track.clientHeight - height,
            ((track.clientHeight - height) * scroll.scrollTop) /
              (scroll.scrollHeight - scroll.clientHeight),
          ),
        ) +
        'px)';
    }
  }
  function sizeHost() {
    host.style.height =
      panelHeight(panels.find((panel) => panel.dataset.panel === currentPage)) +
      'px';
    updateScroll();
  }
  function scheduleLayout() {
    cancelAnimationFrame(layoutFrame);
    layoutFrame = requestAnimationFrame(sizeHost);
  }
  function markNavigation() {
    entries.forEach((button) => {
      const active = button.dataset.page === currentPage;
      button.setAttribute('aria-pressed', String(active));
      button.setAttribute('aria-expanded', String(active));
    });
  }
  async function switchPage(next: string) {
    const version = ++transition;
    const previous = panels.find(
      (panel) => panel.dataset.panel === currentPage,
    );
    const outgoingStyle =
      previous && !previous.hidden
        ? {
            opacity: getComputedStyle(previous).opacity,
            transform: getComputedStyle(previous).transform,
          }
        : null;
    panelAnimations.forEach((animation) => animation.cancel());
    panelAnimations = [];
    currentPage = next === currentPage ? null : next;
    const incoming = panels.find(
      (panel) => panel.dataset.panel === currentPage,
    );
    panels.forEach((panel) => {
      if (panel !== previous && panel !== incoming) {
        panel.hidden = true;
        panel.inert = true;
      }
    });
    if (incoming) {
      incoming.hidden = false;
      incoming.inert = false;
    }
    if (previous) previous.inert = true;
    if (incoming) incoming.inert = false;
    markNavigation();
    sizeHost();
    if (currentPage === 'posts') maybeLoadPosts();
    if (reduced.matches) {
      panels.forEach((panel) => {
        panel.hidden = panel !== incoming;
        panel.inert = panel !== incoming;
      });
      return;
    }
    if (previous && previous !== incoming && !previous.hidden) {
      panelAnimations.push(
        previous.animate(
          [
            {
              opacity: outgoingStyle?.opacity || 1,
              transform:
                outgoingStyle?.transform === 'none'
                  ? 'translateX(0)'
                  : outgoingStyle?.transform || 'translateX(0)',
            },
            { opacity: 0, transform: 'translateX(-12px)' },
          ],
          { duration: 160, easing: 'ease-out', fill: 'both' },
        ),
      );
    }
    if (incoming) {
      panelAnimations.push(
        incoming.animate(
          [
            { opacity: 0, transform: 'translateX(15px)' },
            { opacity: 1, transform: 'translateX(0)' },
          ],
          {
            duration: 290,
            delay: previous ? 80 : 0,
            easing: 'cubic-bezier(.22,.75,.26,1)',
            fill: 'both',
          },
        ),
      );
    }
    await Promise.allSettled(
      panelAnimations.map((animation) => animation.finished),
    );
    if (version !== transition) return;
    panels.forEach((panel) => {
      panel.hidden = panel !== incoming;
      panel.inert = panel !== incoming;
    });
    panelAnimations.forEach((animation) => animation.cancel());
    panelAnimations = [];
  }
  entries.forEach((button) =>
    button.addEventListener('click', () => switchPage(button.dataset.page!)),
  );
  $('.brand').addEventListener('click', (event) => {
    event.preventDefault();
    if (currentPage !== 'home') switchPage('home');
  });
  const panelObserver = new ResizeObserver(scheduleLayout);
  panels.forEach((panel) => {
    const scroll = $<HTMLElement>('.panel-scroll', panel);
    scroll.tabIndex = 0;
    scroll.setAttribute('role', 'region');
    scroll.setAttribute(
      'aria-label',
      panel.getAttribute('aria-label') + '内容',
    );
    panelObserver.observe(scroll);
    scroll.addEventListener(
      'scroll',
      () => {
        if (panel.dataset.panel === currentPage) updateScroll();
      },
      { passive: true },
    );
  });
  new ResizeObserver(updateScroll).observe(host);
  panelObserver.observe($('.nav'));
  window.addEventListener('resize', scheduleLayout);

  return { sizeHost, scheduleLayout, isPosts: () => currentPage === 'posts' };
}
