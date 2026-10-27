import { $, delay, reduced } from './dom';
import { resources } from '../data/site';
import { parsePostsPage } from '../lib/posts';

export function initBlog(isCurrent: () => boolean, onChange: () => void) {
  const scroll = $('#posts-scroll'),
    feed = $('#posts-feed'),
    spinner = $('#posts-spinner'),
    text = $('#posts-status-text'),
    retry = $('#posts-retry'),
    status = $('#posts-status'),
    more = $('#posts-more-label');
  const ids = new Set<number>();
  let page = 1,
    busy = false,
    ended = false,
    failed = false;
  function maybeLoadPosts() {
    if (!isCurrent() || busy || ended || failed) return;
    if (
      !ids.size ||
      scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 100
    )
      void loadPosts();
  }
  async function loadPosts() {
    if (busy || ended) return;
    busy = true;
    failed = false;
    status.hidden = false;
    spinner.hidden = false;
    retry.hidden = true;
    feed.setAttribute('aria-busy', 'true');
    text.textContent = ids.size ? '正在加载更多文章…' : '正在加载文章…';
    const controller = new AbortController(),
      timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const url = new URL(resources.posts);
      url.search = new URLSearchParams({
        per_page: '10',
        page: String(page),
        _fields: 'id,date,title,link',
      }).toString();
      const [response] = await Promise.all([
        fetch(url, { signal: controller.signal, credentials: 'omit' }),
        delay(320),
      ]);
      if (!response.ok) throw Error(`HTTP ${response.status}`);
      const data = parsePostsPage(await response.json(), response.headers);
      const fragment = document.createDocumentFragment(),
        added: HTMLElement[] = [];
      for (const post of data.posts) {
        if (ids.has(post.id)) continue;
        ids.add(post.id);
        const link = document.createElement('a');
        link.className = 'post';
        link.href = post.link;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        const time = document.createElement('time');
        time.dateTime = post.date;
        time.textContent = post.date.slice(0, 10).replaceAll('-', ' / ');
        const title = document.createElement('span');
        title.className = 'post-title';
        const decoded = new DOMParser().parseFromString(
          post.title.rendered,
          'text/html',
        ).body.textContent;
        title.textContent = decoded || '未命名文章';
        link.append(time, title);
        fragment.append(link);
        added.push(link);
      }
      feed.append(fragment);
      // A duplicate-only or malformed page must not trigger an unbounded request loop.
      ended =
        !data.posts.length ||
        !added.length ||
        (data.pages !== null && page >= data.pages) ||
        (data.total !== null && ids.size >= data.total) ||
        (data.pages === null && data.posts.length < 10);
      page++;
      status.hidden = ended;
      text.textContent = ended ? '' : '继续向下，加载更多文章';
      more.textContent = ended
        ? `已加载全部 ${ids.size} 篇, 去博客读`
        : '去博客读更多';
      if (!reduced.matches)
        added.forEach((link, index) =>
          link.animate(
            [
              { opacity: 0, transform: 'translateY(6px)' },
              { opacity: 1, transform: 'translateY(0)' },
            ],
            {
              duration: 320,
              delay: Math.min(index * 28, 170),
              easing: 'ease-out',
              fill: 'backwards',
            },
          ),
        );
    } catch {
      failed = true;
      text.textContent = ids.size ? '更多文章加载失败' : '文章暂时加载失败';
      retry.hidden = false;
    } finally {
      clearTimeout(timeout);
      busy = false;
      spinner.hidden = true;
      feed.setAttribute('aria-busy', 'false');
      onChange();
      requestAnimationFrame(maybeLoadPosts);
    }
  }
  retry.addEventListener('click', () => void loadPosts());
  scroll.addEventListener('scroll', maybeLoadPosts, { passive: true });
  if ('IntersectionObserver' in window)
    new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) maybeLoadPosts();
      },
      { root: scroll, rootMargin: '100px' },
    ).observe($('#post-sentinel'));
  return { maybeLoadPosts };
}
