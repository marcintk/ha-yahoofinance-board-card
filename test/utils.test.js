import { describe, expect, it } from 'vitest';
import { esc, MARKET_STATES } from '../src/utils.js';

describe('esc', () => {
  it('escapes ampersands', () => {
    expect(esc('a&b')).toBe('a&amp;b');
  });

  it('escapes less-than', () => {
    expect(esc('a<b')).toBe('a&lt;b');
  });

  it('escapes greater-than', () => {
    expect(esc('a>b')).toBe('a&gt;b');
  });

  it('handles empty string', () => {
    expect(esc('')).toBe('');
  });

  it('coerces non-strings to string', () => {
    expect(esc(42)).toBe('42');
    expect(esc(null)).toBe('null');
  });

  it('leaves safe characters unchanged', () => {
    expect(esc('hello world')).toBe('hello world');
  });

  it('escapes multiple occurrences', () => {
    expect(esc('a&b&c')).toBe('a&amp;b&amp;c');
  });
});

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
