import { defineConfig } from 'astro/config';
import { execFileSync } from 'node:child_process';
import { resolveRevision } from './src/lib/version.ts';

const revision = resolveRevision(process.env, () =>
  execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }),
);

export default defineConfig({
  site: 'https://www.tomys.top',
  output: 'static',
  build: { inlineStylesheets: 'always', format: 'file' },
  vite: { define: { __SITE_REVISION__: JSON.stringify(revision) } },
  devToolbar: { enabled: false },
});
