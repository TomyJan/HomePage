import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import {
  faArrowUpRightFromSquare,
  faChevronUp,
  faCloud,
  faCode,
  faDownload,
  faEye,
  faEyeSlash,
  faFileLines,
  faGlobe,
  faHeart,
  faHouse,
  faImage,
  faKey,
  faLink,
  faPaperPlane,
  faPause,
  faPenNib,
  faPlay,
  faRobot,
  faTableCellsLarge,
  faVolumeHigh,
  faVolumeXmark,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { faGithub, faQq, faTelegram } from '@fortawesome/free-brands-svg-icons';

const sources = {
  home: faHouse,
  grid: faTableCellsLarge,
  posts: faFileLines,
  send: faPaperPlane,
  arrow: faArrowUpRightFromSquare,
  blog: faPenNib,
  key: faKey,
  download: faDownload,
  drive: faCloud,
  globe: faGlobe,
  robot: faRobot,
  image: faImage,
  link: faLink,
  api: faCode,
  github: faGithub,
  telegram: faTelegram,
  qq: faQq,
  heart: faHeart,
  play: faPlay,
  pause: faPause,
  volume: faVolumeHigh,
  muted: faVolumeXmark,
  eye: faEye,
  'eye-off': faEyeSlash,
  chevron: faChevronUp,
  close: faXmark,
} as const;

export type IconName = keyof typeof sources;

// Build-time only: preserve each icon's native canvas and inline selected paths.
export const icons = Object.entries(sources).map(([name, source]) => {
  const [width, height, , , pathData] = source.icon;
  const paths = Array.isArray(pathData) ? pathData : [pathData];
  return {
    name,
    viewBox: `0 0 ${width} ${height}`,
    content: paths.map((path) => `<path d="${path}"/>`).join(''),
  };
});

const require = createRequire(import.meta.url);
const packageDirectory = dirname(
  require.resolve('@fortawesome/free-solid-svg-icons/package.json'),
);
export const iconLicense = readFileSync(
  resolve(packageDirectory, 'LICENSE.txt'),
  'utf8',
);
