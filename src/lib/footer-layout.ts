export function footerFoldCount(
  widths: number[],
  available: number,
  filingWidth: number,
  moreWidth: number,
  separatorWidth: number,
  showFilings: boolean,
): number {
  if (!widths.length) return 0;
  for (let folded = 0; folded < widths.length; folded++) {
    const visible = [widths[0], ...widths.slice(1 + folded)],
      showTrigger = showFilings || folded > 0;
    const count = visible.length + (showTrigger ? 1 : 0);
    const width =
      visible.reduce((sum, value) => sum + value, 0) +
      (showTrigger ? (folded ? moreWidth : filingWidth) : 0) +
      Math.max(0, count - 1) * separatorWidth;
    if (width <= available) return folded;
  }
  return widths.length - 1;
}
