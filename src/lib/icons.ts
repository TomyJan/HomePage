import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const sources = {
  home: 'Buildings/home-5-line',
  grid: 'Design/layout-grid-line',
  posts: 'Document/article-line',
  send: 'Business/send-plane-line',
  arrow: 'Arrows/arrow-right-up-line',
  blog: 'Design/quill-pen-line',
  key: 'Others/key-2-line',
  download: 'System/download-2-line',
  drive: 'Business/cloud-line',
  globe: 'Business/global-line',
  robot: 'User & Faces/robot-2-line',
  image: 'Media/image-line',
  link: 'Business/links-line',
  api: 'Development/code-box-line',
  github: 'Logos/github-line',
  heart: 'Health & Medical/heart-line',
  telegram: 'Logos/telegram-line',
  qq: 'Logos/qq-line',
  play: 'Media/play-line',
  pause: 'Media/pause-line',
  volume: 'Media/volume-up-line',
  muted: 'Media/volume-mute-line',
  eye: 'System/eye-line',
  'eye-off': 'System/eye-off-line',
  chevron: 'Arrows/arrow-up-s-line',
  close: 'System/close-line',
} as const;

export type IconName = keyof typeof sources;

// Build-time only: inline selected SVG paths without shipping the library runtime.
const require = createRequire(import.meta.url);
export const icons = Object.entries(sources).map(([name, source]) => {
  const svg = readFileSync(
    require.resolve(`remixicon/icons/${source}.svg`),
    'utf8',
  );
  const content = /^<svg\b[^>]*>([\s\S]*?)<\/svg>\s*$/.exec(svg)?.[1];
  if (!content?.trim()) throw new Error(`Invalid icon SVG: ${source}`);
  return { name, content };
});
