import { describe, expect, it } from 'bun:test';
import { normalizePath } from '../../packages/core/src/utils/docs.ts';

describe('normalizePath', () => {
  it('adds a leading slash', () => {
    expect(normalizePath('basics/intro')).toBe('/basics/intro');
  });

  it('converts backslashes to forward slashes', () => {
    expect(normalizePath('basics\\intro')).toBe('/basics/intro');
  });

  it('collapses duplicate slashes', () => {
    expect(normalizePath('/basics///intro')).toBe('/basics/intro');
  });

  it('strips a trailing slash', () => {
    expect(normalizePath('/basics/intro/')).toBe('/basics/intro');
  });

  it('keeps the root path as a single slash', () => {
    expect(normalizePath('/')).toBe('/');
    expect(normalizePath('')).toBe('/');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizePath('  /basics/intro  ')).toBe('/basics/intro');
  });
});
