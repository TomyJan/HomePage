import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';

for (const file of [
  'index.html',
  '404.html',
  'pay.html',
  'ads.txt',
  'sitemap.txt',
  'robots.txt',
])
  assert((await stat(`dist/${file}`)).isFile(), `Missing ${file}`);
const frozen = JSON.parse(
  await readFile('docs/design/frozen-sha256.json', 'utf8'),
);
for (const [file, hash] of Object.entries(frozen)) {
  let bytes = await readFile(`docs/design/${file}`);
  if (/\.(html|md)$/.test(file))
    bytes = Buffer.from(bytes.toString('utf8').replaceAll('\r\n', '\n'));
  assert.equal(
    createHash('sha256').update(bytes).digest('hex'),
    hash,
    `Frozen design modified: ${file}`,
  );
}
const sha = execFileSync('git', ['rev-parse', 'HEAD'], {
  encoding: 'utf8',
}).trim();
const html = await readFile('dist/index.html', 'utf8');
assert(
  html.includes(`/HomePage/commit/${sha}`),
  'Build must embed checkout SHA',
);
assert.equal(
  (html.match(/<video\b/g) || []).length,
  1,
  'Only one persistent video is allowed',
);
assert(
  html.includes('<style>') && html.includes('data-min-duration="1200"'),
  'Critical loader styles must be in HTML',
);
assert(
  !html.includes('ssr:') && !html.includes('/docs/design/'),
  'Static build must not expose internal source',
);
assert(
  !html.includes('googletagmanager') && !html.includes('mastodon.social'),
  'Unselected legacy integrations must be absent',
);
const files = await readdir('dist', { recursive: true });
assert(
  !files.some((file) => file.startsWith('server') || file.startsWith('docs')),
  'Only public static output may ship',
);
let scriptBytes = 0;
for (const file of files.filter((file) => file.endsWith('.js')))
  scriptBytes += gzipSync(await readFile(`dist/${file}`)).byteLength;
assert(scriptBytes < 25000, `Client scripts exceed 25 kB gzip: ${scriptBytes}`);
const config = JSON.parse(await readFile('edgeone.json', 'utf8'));
assert.equal(config.outputDirectory, 'dist');
assert.equal(config.redirects.length, 2);
assert.equal(config.redirects[0].destination, '/pay.html?from=old_paycode');
assert.equal(
  config.redirects[1].destination,
  'https://donate.tomys.top/?from=old_feed',
);
console.log(
  `Verified static routes, frozen design, version ${sha.slice(0, 7)}, redirects and ${scriptBytes} B gzip client JS.`,
);
