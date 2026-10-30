import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(
  new URL('../../scripts/verify-build.mjs', import.meta.url),
);
const revision = '1234567890abcdef1234567890abcdef12345678';
let archive: string;

beforeEach(() => {
  archive = mkdtempSync(join(tmpdir(), 'homepage-build-verification-'));
  mkdirSync(join(archive, 'dist'));
  mkdirSync(join(archive, 'docs'));
  cpSync(
    new URL('../../docs/design/', import.meta.url),
    join(archive, 'docs/design'),
    {
      recursive: true,
    },
  );
  cpSync(
    new URL('../../edgeone.json', import.meta.url),
    join(archive, 'edgeone.json'),
  );
  for (const name of [
    '404.html',
    'pay.html',
    'privacy.html',
    'ads.txt',
    'sitemap.txt',
    'robots.txt',
  ])
    writeFileSync(join(archive, 'dist', name), 'fixture');
  writeFileSync(
    join(archive, 'dist/index.html'),
    `<style></style><div data-min-duration="1200"></div><video></video><a href="/HomePage/commit/${revision}">version</a>`,
  );
});

afterEach(() => {
  rmSync(archive, { recursive: true, force: true });
});

function verify(extra: NodeJS.ProcessEnv) {
  return spawnSync(process.execPath, [script], {
    cwd: archive,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_DIR: undefined,
      GIT_WORK_TREE: undefined,
      SITE_REVISION: '',
      GITHUB_SHA: '',
      CI_COMMIT_SHA: '',
      COMMIT_SHA: '',
      ...extra,
    },
  });
}

describe('build verification without a Git checkout', () => {
  it.each(['SITE_REVISION', 'GITHUB_SHA'])(
    'accepts matching output when %s supplies the full revision',
    (key) => {
      const result = verify({ [key]: revision });
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain('version ' + revision.slice(0, 7));
    },
  );

  it('rejects an archive without a valid revision', () => {
    const result = verify({ SITE_REVISION: 'invalid' });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('A full Git commit SHA is required');
  });

  it('rejects output built with a different revision', () => {
    const result = verify({ SITE_REVISION: 'f'.repeat(40) });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Build must embed checkout SHA');
  });
});
