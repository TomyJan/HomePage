import { expect, it } from 'vitest';
import { parsePostsPage } from '../../src/lib/posts';

it('accepts actual WordPress fields and totals without trusting malformed posts', () => {
  const good = {
    id: 1,
    date: '2026-10-01T12:00:00',
    title: { rendered: 'A &amp; B' },
    link: 'https://blog.tomys.top/post/1',
  };
  const page = parsePostsPage(
    [
      good,
      { ...good, id: 2, link: 'javascript:alert(1)' },
      { ...good, id: 3, date: 'bad' },
      null,
    ],
    new Headers({ 'X-WP-Total': '41', 'X-WP-TotalPages': '5' }),
  );
  expect(page.posts).toEqual([good]);
  expect(page.total).toBe(41);
  expect(page.pages).toBe(5);
});
it('rejects an invalid response while allowing an empty final page', () => {
  expect(() => parsePostsPage({ code: 'error' }, new Headers())).toThrow();
  expect(parsePostsPage([], new Headers()).posts).toEqual([]);
});
