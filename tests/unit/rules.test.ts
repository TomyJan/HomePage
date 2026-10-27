import { describe, expect, it } from 'vitest';
import { getFilingState, isHostlocReferrer } from '../../src/lib/domains';
import { footerFoldCount } from '../../src/lib/footer-layout';
import { resolveRevision } from '../../src/lib/version';
import { formatUptime } from '../../src/lib/uptime';

describe('filings do not leak across domains', () => {
  it.each([
    ['tomys.top', ['moe', 'icp', 'security']],
    ['WWW.TOMYS.TOP.', ['moe', 'icp', 'security']],
    ['a.b.tomys.top', ['moe', 'icp', 'security']],
    ['amoe.cc', ['icp']],
    ['www.tomyjan.com', ['icp']],
  ])('%s gets only its configured categories', (hostname, types) => {
    expect(
      getFilingState(hostname).records.map((record) => record.type),
    ).toEqual(types);
  });
  it.each(['eviltomys.top', 'tomys.top.evil.com', 'evilamoe.cc'])(
    'rejects %s',
    (hostname) => {
      expect(getFilingState(hostname)).toMatchObject({
        kind: 'unknown',
        records: [],
      });
    },
  );
  it.each(['vov.moe', 'cdn.喵.cf', 'xn--i2r.cf', '荼蘼.tk'])(
    'recognizes no-filing alias %s',
    (hostname) => {
      expect(getFilingState(hostname).kind).toBe('empty');
    },
  );
  it.each([
    'localhost',
    'a.localhost',
    '127.0.0.1',
    '10.0.2.9',
    '10.1.0.4',
    '[::1]',
    '::1',
  ])('recognizes local %s', (hostname) => {
    expect(getFilingState(hostname).kind).toBe('local');
  });
  it('keeps different ICP suffixes for different roots', () => {
    expect(getFilingState('amoe.cc').records[0].label).toBe(
      '鲁ICP备2021003464号-1',
    );
    expect(getFilingState('tomyjan.com').records[0].label).toBe(
      '鲁ICP备2021003464号-10',
    );
  });
  it.each([
    ['https://hostloc.com/thread/1', true],
    ['https://www.hostloc.com/', true],
    ['https://hostloc.com.evil.com/', false],
    ['https://example.com/?from=hostloc.com', false],
    ['', false],
  ])('checks actual HostLoc hostname: %s', (url, expected) => {
    expect(isHostlocReferrer(url)).toBe(expected);
  });
});

describe('footer responsive folding', () => {
  it('folds sitemap then status while preserving the version', () => {
    expect(footerFoldCount([45, 45, 45], 250, 60, 36, 18, true)).toBe(0);
    expect(footerFoldCount([45, 45, 45], 180, 60, 36, 18, true)).toBe(1);
    expect(footerFoldCount([45, 45, 45], 100, 60, 36, 18, true)).toBe(2);
    expect(footerFoldCount([45, 45, 45], 1, 60, 36, 18, true)).toBe(2);
  });
  it('uses one shared more trigger on domains without filings', () => {
    expect(footerFoldCount([45, 45, 45], 180, 60, 36, 18, false)).toBe(0);
    expect(footerFoldCount([45, 45, 45], 150, 60, 36, 18, false)).toBe(2);
  });
});

describe('revision injection', () => {
  const sha = '1234567890abcdef1234567890abcdef12345678';
  it('uses a valid CI SHA when git is unavailable', () => {
    expect(
      resolveRevision({ GITHUB_SHA: sha }, () => {
        throw Error('no git');
      }),
    ).toBe(sha);
  });
  it('prefers the actual checkout and rejects unsafe CI strings', () => {
    expect(resolveRevision({ GITHUB_SHA: 'not-a-sha' }, () => sha)).toBe(sha);
    expect(() =>
      resolveRevision({ GITHUB_SHA: 'not-a-sha' }, () => ''),
    ).toThrow();
  });
});

it('retains legacy uptime offset and 365-day years', () => {
  expect(formatUptime(1594836000 * 1000)).toEqual({
    text: '0年0天8时0分0秒',
    iso: 'P0Y0DT8H0M0S',
  });
  expect(formatUptime((1594836000 + 31536000 + 86400 + 61) * 1000).text).toBe(
    '1年1天8时1分1秒',
  );
});
