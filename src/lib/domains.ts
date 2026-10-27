export interface FilingRecord {
  type: string;
  label: string;
  href: string;
  domains: string[];
}
const filingRecords: FilingRecord[] = [
  {
    type: 'moe',
    domains: ['tomys.top'],
    label: '萌ICP备20210101号',
    href: 'https://icp.gov.moe/?keyword=20210101',
  },
  {
    type: 'icp',
    domains: ['tomys.top'],
    label: '陇ICP备20002637号-1',
    href: 'https://beian.miit.gov.cn/',
  },
  {
    type: 'security',
    domains: ['tomys.top'],
    label: '甘公网安备62082502000107号',
    href: 'https://www.beian.gov.cn/portal/registerSystemInfo?recordcode=62082502000107',
  },
  {
    type: 'icp',
    domains: ['amoe.cc'],
    label: '鲁ICP备2021003464号-1',
    href: 'https://beian.miit.gov.cn/',
  },
  {
    type: 'icp',
    domains: ['tomyjan.com'],
    label: '鲁ICP备2021003464号-10',
    href: 'https://beian.miit.gov.cn/',
  },
];
export function normalizeHostname(value: string): string {
  const hostname = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\.$/, '');
  if (hostname === '::1') return '[::1]';
  try {
    return new URL('https://' + hostname).hostname;
  } catch {
    return hostname;
  }
}
export function matchesDomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith('.' + domain);
}
const noFilingDomains = [
  'vov.moe',
  'misaka.site',
  'ctx.cm',
  'tu.edu.kg',
  'tomy.pp.ua',
  'tomyjan.pp.ua',
  '喵.cf',
  '喵.tk',
  'tomyjan.cf',
  'tomyjan.gq',
  'tomyjan.tk',
  '荼蘼.gq',
  '荼蘼.tk',
  'tomyjan.me',
].map(normalizeHostname);
export function getFilingState(value: string) {
  const hostname = normalizeHostname(value);
  const records = filingRecords.filter((record) =>
    record.domains.some((domain) => matchesDomain(hostname, domain)),
  );
  const local =
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '[::1]' ||
    /^127\.\d+\.\d+\.\d+$/.test(hostname) ||
    /^10\.(?:0|1)\.\d+\.\d+$/.test(hostname);
  const kind = records.length
    ? 'records'
    : noFilingDomains.some((domain) => matchesDomain(hostname, domain))
      ? 'empty'
      : local
        ? 'local'
        : 'unknown';
  return { hostname, kind, records };
}
export function isHostlocReferrer(value: string): boolean {
  try {
    return matchesDomain(
      normalizeHostname(new URL(value).hostname),
      'hostloc.com',
    );
  } catch {
    return false;
  }
}
