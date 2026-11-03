import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const rounded = {
  home: 'house',
  grid: 'layout-grid',
  posts: 'file-text',
  send: 'send',
  arrow: 'arrow-up-right',
  blog: 'feather',
  key: 'key-round',
  download: 'download',
  drive: 'cloud',
  globe: 'globe',
  robot: 'bot',
  image: 'image',
  link: 'link',
  api: 'square-code',
  heart: 'heart',
  play: 'play',
  pause: 'pause',
  volume: 'volume-2',
  muted: 'volume-x',
  eye: 'eye',
  'eye-off': 'eye-off',
  chevron: 'chevron-up',
  close: 'x',
} as const;

const brands = {
  github: 'github',
  telegram: 'telegram',
  qq: 'qq',
} as const;

export type IconName = keyof typeof rounded | keyof typeof brands;

// Build-time only: inline selected SVG paths without shipping the library runtime.
const require = createRequire(import.meta.url);
function readIcon(source: string) {
  const svg = readFileSync(require.resolve(source), 'utf8');
  const content = /<svg\b[^>]*>([\s\S]*?)<\/svg>\s*$/.exec(svg)?.[1];
  if (!content?.trim()) throw new Error(`Invalid icon SVG: ${source}`);
  return content;
}

export const icons = [
  ...Object.entries(rounded).map(([name, source]) => ({
    name,
    content: readIcon(`lucide-static/icons/${source}.svg`),
  })),
  ...Object.entries(brands).map(([name, source]) => ({
    name,
    content: `<g fill="currentColor" stroke="none">${readIcon(`remixicon/icons/Logos/${source}-line.svg`)}</g>`,
  })),
];

export const iconLicense = readFileSync(
  require.resolve('lucide-static/LICENSE'),
  'utf8',
);
