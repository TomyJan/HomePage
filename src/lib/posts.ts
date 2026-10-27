export interface Post {
  id: number;
  date: string;
  title: { rendered: string };
  link: string;
}
export function parsePostsPage(
  data: unknown,
  headers: Headers,
): { posts: Post[]; total: number | null; pages: number | null } {
  if (!Array.isArray(data)) throw new Error('Invalid posts response');
  const posts = data.filter((post): post is Post => {
    if (
      !post ||
      !Number.isSafeInteger(post.id) ||
      post.id < 1 ||
      typeof post.title?.rendered !== 'string' ||
      typeof post.date !== 'string' ||
      !Number.isFinite(Date.parse(post.date))
    )
      return false;
    try {
      return ['http:', 'https:'].includes(new URL(post.link).protocol);
    } catch {
      return false;
    }
  });
  const count = (key: string) => {
    const value = headers.get(key);
    return value !== null && /^\d+$/.test(value) ? Number(value) : null;
  };
  return { posts, total: count('X-WP-Total'), pages: count('X-WP-TotalPages') };
}
