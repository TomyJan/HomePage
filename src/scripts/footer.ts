import { $, reduced } from './dom';
import { normalizeHostname, getFilingState } from '../lib/domains';
import { footerFoldCount } from '../lib/footer-layout';
import { formatUptime } from '../lib/uptime';
export function initFooter() {
  const stage = $('#stage');
  const controls = $('.controls');
  const footer = $('.footer');
  const footerLinks = $('#footer-links');
  const footerFoldedLinks = $('#footer-folded-links');
  const filingRecordsHost = $('#filing-records');
  const filingTriggerLabel = $('#filing-trigger-label');
  const filing = $('#filing');
  const filingTrigger = $('#filing-trigger');
  const filingCard = $('#filing-card');
  const footerItems = Array.from(
    footerLinks.querySelectorAll<HTMLElement>(':scope > [data-footer-item]'),
  );
  let filingOpen = false,
    filingCloseTimer = 0,
    filingFrame = 0;
  let footerLayoutFrame = 0,
    footerSignature = '',
    hasFilingContent = true;
  function getSiteHostname() {
    let hostname = window.location.hostname;
    try {
      if (window.self !== window.top) hostname = window.top!.location.hostname;
    } catch (_) {
      if (document.referrer) {
        try {
          hostname = new URL(document.referrer).hostname;
        } catch (_) {}
      }
    }
    return normalizeHostname(hostname);
  }
  function updateUptime() {
    const value = $<HTMLTimeElement>('#uptime'),
      elapsed = formatUptime(Date.now());
    value.textContent = elapsed.text;
    value.dateTime = elapsed.iso;
  }
  updateUptime();
  setInterval(updateUptime, 1000);
  function renderFilings() {
    const state = getFilingState(getSiteHostname());
    document.documentElement.dataset.siteHostname = state.hostname;
    document.documentElement.dataset.filingState = state.kind;
    hasFilingContent = state.kind !== 'empty';
    filingRecordsHost.hidden = !hasFilingContent;
    filingRecordsHost.replaceChildren();
    if (state.kind === 'local') {
      const note = document.createElement('p');
      note.className = 'filing-note';
      note.textContent = '正如你所见，你正在本地进行开发～';
      filingRecordsHost.append(note);
    } else {
      const records =
        state.kind === 'unknown'
          ? [
              {
                type: 'unknown',
                label: '天哪，这居然是个未知的域名？',
                href: 'https://www.tomys.top/',
              },
            ]
          : state.records;
      records.forEach((record) => {
        const link = document.createElement('a');
        link.href = record.href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.dataset.filingType = record.type;
        link.textContent = record.label;
        const svg = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'svg',
        );
        svg.classList.add('icon');
        svg.setAttribute('aria-hidden', 'true');
        const use = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'use',
        );
        use.setAttribute('href', '#i-arrow');
        svg.append(use);
        link.append(svg);
        filingRecordsHost.append(link);
      });
    }
    scheduleFooterLayout();
  }
  renderFilings();
  function positionFiling() {
    if (filingCard.hidden) return;
    const trigger = filingTrigger.getBoundingClientRect(),
      parent = filing.getBoundingClientRect();
    const width = filingCard.offsetWidth,
      edge =
        parseFloat(getComputedStyle(stage).getPropertyValue('--edge')) || 18;
    const left = Math.max(
      edge,
      Math.min(
        trigger.right - width,
        document.documentElement.clientWidth - edge - width,
      ),
    );
    filingCard.style.left = left - parent.left + 'px';
    filingCard.style.right = 'auto';
    filingCard.style.setProperty(
      '--anchor-x',
      Math.max(
        12,
        Math.min(width - 20, trigger.left + trigger.width / 2 - left - 4),
      ) + 'px',
    );
  }
  function setFiling(next: boolean) {
    if (next === filingOpen) return;
    filingOpen = next;
    clearTimeout(filingCloseTimer);
    cancelAnimationFrame(filingFrame);
    filingTrigger.setAttribute('aria-expanded', String(next));
    filingCard.inert = !next;
    if (next) {
      filingCard.hidden = false;
      positionFiling();
      // 先建立闭合样式，再触发过渡；关闭时保留节点直到淡出完成。
      void filingCard.offsetWidth;
      filingFrame = requestAnimationFrame(() =>
        filingCard.classList.add('is-open'),
      );
    } else {
      filingCard.classList.remove('is-open');
      filingCloseTimer = window.setTimeout(
        () => {
          if (!filingOpen) filingCard.hidden = true;
        },
        reduced.matches ? 0 : 220,
      );
    }
  }
  filingTrigger.addEventListener('click', () => setFiling(!filingOpen));
  filingCard.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('a'))
      setFiling(false);
  });
  document.addEventListener('click', (event) => {
    if (!filing.contains(event.target as Node)) setFiling(false);
  });
  document.addEventListener('focusin', (event) => {
    if (filingOpen && !filing.contains(event.target as Node)) setFiling(false);
  });
  window.addEventListener('resize', positionFiling);

  function measureFooter(eligible: HTMLElement[]) {
    const measurer = document.createElement('div');
    measurer.className = 'footer-links footer-measure';
    measurer.setAttribute('aria-hidden', 'true');
    measurer.inert = true;
    measurer.style.font = getComputedStyle(footerLinks).font;
    const clean = (clone: HTMLElement) => {
      clone.classList.remove('has-separator');
      clone.removeAttribute('id');
      clone
        .querySelectorAll('[id]')
        .forEach((node) => node.removeAttribute('id'));
      return clone;
    };
    const clones = eligible.map((item) => {
      const clone = clean(item.cloneNode(true) as HTMLElement);
      measurer.append(clone);
      return clone;
    });
    const normal = clean(filingTrigger.cloneNode(true) as HTMLElement);
    $('span', normal).textContent = '备案信息';
    measurer.append(normal);
    const more = clean(filingTrigger.cloneNode(true) as HTMLElement);
    $('span', more).textContent = '更多';
    measurer.append(more);
    const separator = document.createElement('span');
    separator.style.font = '9px MiSans,sans-serif';
    separator.textContent = '/';
    measurer.append(separator);
    document.body.append(measurer);
    const gap =
      parseFloat(
        getComputedStyle(footerLinks).getPropertyValue('--footer-gap'),
      ) || 0;
    const result = {
      widths: clones.map((clone) =>
        Math.ceil(clone.getBoundingClientRect().width),
      ),
      filingWidth: Math.ceil(normal.getBoundingClientRect().width),
      moreWidth: Math.ceil(more.getBoundingClientRect().width),
      separatorWidth: separator.getBoundingClientRect().width + 2 * gap,
      separatorGlyphWidth: separator.getBoundingClientRect().width,
    };
    measurer.remove();
    return result;
  }
  function layoutFooter() {
    const edge =
      parseFloat(getComputedStyle(stage).getPropertyValue('--edge')) || 18;
    const available = Math.max(
      24,
      Math.floor(controls.getBoundingClientRect().left - edge - 12),
    );
    footer.style.width = available + 'px';
    footerLinks.style.removeProperty('--footer-gap');
    const eligible = footerItems.filter((item) => !item.hidden),
      measure = measureFooter(eligible);
    const count = footerFoldCount(
      measure.widths,
      available - 2,
      measure.filingWidth,
      measure.moreWidth,
      measure.separatorWidth,
      hasFilingContent,
    );
    const folded = eligible.slice(1, 1 + count),
      signature =
        String(hasFilingContent) +
        '|' +
        folded.map((item) => item.dataset.footerItem).join(',');
    if (signature !== footerSignature) {
      const active = document.activeElement,
        hadFocus = footer.contains(active);
      setFiling(false);
      footerItems.forEach((item) => {
        item.classList.remove('has-separator');
        footerLinks.insertBefore(item, filing);
      });
      folded.forEach((item) => footerFoldedLinks.append(item));
      footerSignature = signature;
      if (hadFocus && active instanceof HTMLElement) {
        const target = footerFoldedLinks.contains(active)
          ? filingTrigger
          : active;
        if (target.isConnected && !target.closest('[hidden]'))
          target.focus({ preventScroll: true });
      }
    }
    filing.hidden = !hasFilingContent && !folded.length;
    filing.classList.toggle('is-overflow', folded.length > 0);
    filingTriggerLabel.textContent = folded.length ? '更多' : '备案信息';
    filingTrigger.setAttribute(
      'aria-label',
      folded.length ? '更多链接与备案信息' : '备案信息',
    );
    if (count === eligible.length - 1 && count > 0) {
      const gap = Math.max(
        0,
        Math.min(
          parseFloat(
            getComputedStyle(footerLinks).getPropertyValue('--footer-gap'),
          ) || 0,
          (available -
            2 -
            measure.widths[0] -
            measure.moreWidth -
            measure.separatorGlyphWidth) /
            2,
        ),
      );
      footerLinks.style.setProperty('--footer-gap', gap + 'px');
    }
    const inline = (Array.from(footerLinks.children) as HTMLElement[]).filter(
      (item) => item.classList.contains('footer-item') && !item.hidden,
    );
    inline.forEach((item, index) =>
      item.classList.toggle('has-separator', index > 0),
    );
    footer.dataset.folded = folded
      .map((item) => item.dataset.footerItem)
      .join(',');
    if (filingOpen) positionFiling();
  }
  function scheduleFooterLayout() {
    cancelAnimationFrame(footerLayoutFrame);
    footerLayoutFrame = requestAnimationFrame(layoutFooter);
  }
  const footerObserver = new ResizeObserver(scheduleFooterLayout);
  footerObserver.observe(stage);
  footerObserver.observe(controls);
  window.addEventListener('resize', scheduleFooterLayout);
  document.fonts.ready.then(scheduleFooterLayout);
  document.fonts.addEventListener('loadingdone', scheduleFooterLayout);
  scheduleFooterLayout();

  return { setFiling, scheduleFooterLayout, isOpen: () => filingOpen };
}
