import { describe, expect, it } from 'vitest';
import { detectIcon, resolveIcon } from '../src/icons.js';

describe('detectIcon', () => {
  it('returns ◆ for futures symbols ending _f', () => {
    expect(detectIcon('gc_f')).toBe('◆');
    expect(detectIcon('bz_f')).toBe('◆');
    expect(detectIcon('cl_f')).toBe('◆');
    expect(detectIcon('ng_f')).toBe('◆');
  });

  it('returns ¤ for FX symbols ending _x', () => {
    expect(detectIcon('usdpln_x')).toBe('¤');
    expect(detectIcon('usdjpy_x')).toBe('¤');
    expect(detectIcon('usdcny_x')).toBe('¤');
  });

  it('returns △ for known index symbols', () => {
    expect(detectIcon('dji')).toBe('△');
    expect(detectIcon('gspc')).toBe('△');
    expect(detectIcon('ixic')).toBe('△');
    expect(detectIcon('dax')).toBe('△');
    expect(detectIcon('n225')).toBe('△');
    expect(detectIcon('tnx')).toBe('△');
    expect(detectIcon('vix')).toBe('△');
  });

  it('returns ⬢ for known crypto base symbols', () => {
    expect(detectIcon('btc_usd')).toBe('⬢');
    expect(detectIcon('eth_usd')).toBe('⬢');
    expect(detectIcon('sol_usd')).toBe('⬢');
  });

  it('returns empty string for equity symbols', () => {
    expect(detectIcon('aapl')).toBe('');
    expect(detectIcon('tsla')).toBe('');
    expect(detectIcon('msft')).toBe('');
    expect(detectIcon('brk_a')).toBe('');
    expect(detectIcon('brk_b')).toBe('');
  });
});

describe('resolveIcon', () => {
  it('returns per-entry icon when set, regardless of mode', () => {
    expect(resolveIcon('dji', '★', 'auto')).toBe('★');
    expect(resolveIcon('dji', '★', 'none')).toBe('★');
    expect(resolveIcon('aapl', '★', 'none')).toBe('★');
  });

  it('returns auto-detected icon when mode is auto and no stock icon', () => {
    expect(resolveIcon('gc_f', undefined, 'auto')).toBe('◆');
    expect(resolveIcon('usdpln_x', undefined, 'auto')).toBe('¤');
    expect(resolveIcon('dji', undefined, 'auto')).toBe('△');
    expect(resolveIcon('btc_usd', undefined, 'auto')).toBe('⬢');
  });

  it('returns empty string for equity in auto mode', () => {
    expect(resolveIcon('aapl', undefined, 'auto')).toBe('');
  });

  it('returns empty string when mode is none and no stock icon', () => {
    expect(resolveIcon('dji', undefined, 'none')).toBe('');
    expect(resolveIcon('gc_f', undefined, 'none')).toBe('');
  });
});
