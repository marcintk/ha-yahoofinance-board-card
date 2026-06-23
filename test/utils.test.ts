import { describe, expect, it } from 'vitest';
import { isPostMarket, isPreMarket } from '../src/utils.js';

describe('isPreMarket', () => {
  it('returns true for PREPRE', () => {
    expect(isPreMarket('PREPRE')).toBe(true);
  });

  it('returns true for PRE', () => {
    expect(isPreMarket('PRE')).toBe(true);
  });

  it('returns false for REGULAR', () => {
    expect(isPreMarket('REGULAR')).toBe(false);
  });

  it('returns false for POST', () => {
    expect(isPreMarket('POST')).toBe(false);
  });

  it('returns false for POSTPOST', () => {
    expect(isPreMarket('POSTPOST')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isPreMarket(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isPreMarket(undefined)).toBe(false);
  });
});

describe('isPostMarket', () => {
  it('returns true for POST', () => {
    expect(isPostMarket('POST')).toBe(true);
  });

  it('returns true for POSTPOST', () => {
    expect(isPostMarket('POSTPOST')).toBe(true);
  });

  it('returns false for REGULAR', () => {
    expect(isPostMarket('REGULAR')).toBe(false);
  });

  it('returns false for PRE', () => {
    expect(isPostMarket('PRE')).toBe(false);
  });

  it('returns false for PREPRE', () => {
    expect(isPostMarket('PREPRE')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isPostMarket(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isPostMarket(undefined)).toBe(false);
  });
});
