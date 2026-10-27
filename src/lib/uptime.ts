export function formatUptime(now: number): { text: string; iso: string } {
  let elapsed = Math.max(0, Math.floor(now / 1000) + 8 * 3600 - 1594836000);
  const years = Math.floor(elapsed / 31536000);
  elapsed %= 31536000;
  const days = Math.floor(elapsed / 86400);
  elapsed %= 86400;
  const hours = Math.floor(elapsed / 3600);
  elapsed %= 3600;
  const minutes = Math.floor(elapsed / 60),
    seconds = elapsed % 60;
  return {
    text: `${years}年${days}天${hours}时${minutes}分${seconds}秒`,
    iso: `P${years}Y${days}DT${hours}H${minutes}M${seconds}S`,
  };
}
