export function $<T extends HTMLElement = HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T {
  const node = root.querySelector<T>(selector);
  if (!node) throw new Error(`Missing required element: ${selector}`);
  return node;
}
export const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
export const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
