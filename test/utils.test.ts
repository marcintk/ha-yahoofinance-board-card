import { describe, expect, it } from 'vitest';
import { MARKET_STATES } from '../src/utils.js';

describe('MARKET_STATES', () => {
  it('is a Set', () => {
    expect(MARKET_STATES instanceof Set).toBe(true);
  });

  it('contains all expected states', () => {
    expect(MARKET_STATES.has('PREPRE')).toBe(true);
    expect(MARKET_STATES.has('PRE')).toBe(true);
    expect(MARKET_STATES.has('REGULAR')).toBe(true);
    expect(MARKET_STATES.has('POST')).toBe(true);
    expect(MARKET_STATES.has('POSTPOST')).toBe(true);
  });

  it('does not contain invalid states', () => {
    expect(MARKET_STATES.has('UNKNOWN')).toBe(false);
    expect(MARKET_STATES.has('')).toBe(false);
  });
});
