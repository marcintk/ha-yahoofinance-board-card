import { describe, expect, it } from 'vitest';
import { dataText, formatPrice, formatRate, prepostText, priceText } from '../src/format.js';

describe('formatRate', () => {
  it('formats positive rate with + prefix', () => {
    expect(formatRate(2.345, 2)).toBe('+2.35');
  });

  it('formats negative rate with - prefix', () => {
    expect(formatRate(-2.345, 2)).toBe('-2.35');
  });

  it('formats zero without sign', () => {
    expect(formatRate(0, 2)).toBe('0.00');
  });

  it('returns - for NaN input', () => {
    expect(formatRate(NaN, 2)).toBe('-');
  });

  it('returns - for undefined', () => {
    expect(formatRate(undefined, 2)).toBe('-');
  });

  it('respects precision for positive', () => {
    expect(formatRate(1.567, 1)).toBe('+1.6');
  });

  it('respects precision for zero decimal places', () => {
    expect(formatRate(-1.5, 0)).toBe('-2');
  });
});

describe('formatPrice', () => {
  it('uses zero decimal places for values above 1000', () => {
    expect(formatPrice(1500.5)).toBe('1501');
  });

  it('uses one decimal place for values above 10', () => {
    expect(formatPrice(25.67)).toBe('25.7');
  });

  it('uses two decimal places for values 10 and below', () => {
    expect(formatPrice(5.123)).toBe('5.12');
  });

  it('falls back to fallback price when price is zero', () => {
    expect(formatPrice(0, 150.5)).toBe('150.5');
  });

  it('falls back to fallback price when price is NaN', () => {
    expect(formatPrice(NaN, 150)).toBe('150.0');
  });

  it('returns - when both price and fallback are zero', () => {
    expect(formatPrice(0, 0)).toBe('-');
  });

  it('returns - when both are NaN', () => {
    expect(formatPrice(NaN, NaN)).toBe('-');
  });

  it('uses default fallback of 0 when omitted', () => {
    expect(formatPrice(0)).toBe('-');
  });
});

describe('priceText', () => {
  it('returns - for null attrs', () => {
    expect(priceText(null)).toBe('-');
  });

  it('returns preMarketPrice for PREPRE', () => {
    expect(
      priceText({ marketState: 'PREPRE', preMarketPrice: 120.0, regularMarketPrice: 100.0 })
    ).toBe('120.0');
  });

  it('returns preMarketPrice for PRE', () => {
    expect(
      priceText({ marketState: 'PRE', preMarketPrice: 120.0, regularMarketPrice: 100.0 })
    ).toBe('120.0');
  });

  it('returns postMarketPrice for POST', () => {
    expect(
      priceText({ marketState: 'POST', postMarketPrice: 130.0, regularMarketPrice: 100.0 })
    ).toBe('130.0');
  });

  it('returns postMarketPrice for POSTPOST', () => {
    expect(
      priceText({ marketState: 'POSTPOST', postMarketPrice: 130.0, regularMarketPrice: 100.0 })
    ).toBe('130.0');
  });

  it('returns regularMarketPrice for REGULAR', () => {
    expect(priceText({ marketState: 'REGULAR', regularMarketPrice: 100.0 })).toBe('100.0');
  });

  it('falls back to regularMarketPrice when preMarketPrice is 0', () => {
    expect(priceText({ marketState: 'PRE', preMarketPrice: 0, regularMarketPrice: 100.0 })).toBe(
      '100.0'
    );
  });

  it('falls back to regularMarketPrice when postMarketPrice is 0', () => {
    expect(priceText({ marketState: 'POST', postMarketPrice: 0, regularMarketPrice: 100.0 })).toBe(
      '100.0'
    );
  });
});

describe('prepostText', () => {
  it('returns empty string for null attrs', () => {
    expect(prepostText(null)).toBe('');
  });

  it('returns preMarketChangePercent for PREPRE', () => {
    expect(prepostText({ marketState: 'PREPRE', preMarketChangePercent: 1.5 })).toBe('+1.50');
  });

  it('returns preMarketChangePercent for PRE', () => {
    expect(prepostText({ marketState: 'PRE', preMarketChangePercent: -2.5 })).toBe('-2.50');
  });

  it('returns postMarketChangePercent for POST', () => {
    expect(prepostText({ marketState: 'POST', postMarketChangePercent: 1.5 })).toBe('+1.50');
  });

  it('returns postMarketChangePercent for POSTPOST', () => {
    expect(prepostText({ marketState: 'POSTPOST', postMarketChangePercent: -2.5 })).toBe('-2.50');
  });

  it('returns empty string for REGULAR', () => {
    expect(prepostText({ marketState: 'REGULAR' })).toBe('');
  });
});

describe('dataText', () => {
  const fullAttrs = {
    trailingPE: 25.5,
    forwardPE: 22.3,
    dividendRate: 0.88,
    regularMarketVolume: 50000000,
  };

  it('returns trailingPE for signal state 0', () => {
    expect(dataText(fullAttrs, 0)).toContain('25.5X');
  });

  it('returns forwardPE for signal state 1', () => {
    expect(dataText(fullAttrs, 1)).toContain('22.3X');
  });

  it('returns dividendRate for signal state 2', () => {
    expect(dataText(fullAttrs, 2)).toContain('0.88');
  });

  it('returns volume in M for tens of millions', () => {
    expect(dataText(fullAttrs, 3)).toContain('50M');
  });

  it('returns volume in G for billions', () => {
    expect(dataText({ regularMarketVolume: 2000000000 }, 3)).toContain('2G');
  });

  it('returns volume in K for sub-million', () => {
    expect(dataText({ regularMarketVolume: 500000 }, 3)).toContain('500K');
  });

  it('returns empty string for unknown signal state', () => {
    expect(dataText(fullAttrs, 5)).toBe('');
  });

  it('returns dash for zero PE', () => {
    expect(dataText({ trailingPE: 0 }, 0)).toContain('-');
  });

  it('returns dash for null attrs on PE', () => {
    expect(dataText(null, 0)).toContain('-');
  });

  it('returns dash for zero volume', () => {
    expect(dataText({ regularMarketVolume: 0 }, 3)).toContain('-');
  });

  it('returns dash for null attrs on volume', () => {
    expect(dataText(null, 3)).toContain('-');
  });

  it('shows seagreen for PE below threshold 50', () => {
    expect(dataText({ trailingPE: 20 }, 0)).toContain('seagreen');
  });

  it('shows indianred for PE above threshold 50', () => {
    expect(dataText({ trailingPE: 60 }, 0)).toContain('indianred');
  });

  it('shows gray color for dividendRate (threshold 0)', () => {
    expect(dataText({ dividendRate: 0.5 }, 2)).toContain('gray');
  });

  it('accepts numeric signal state', () => {
    expect(dataText(fullAttrs, 0)).toContain('25.5X');
  });

  it('returns dash for NaN PE', () => {
    expect(dataText({ trailingPE: NaN }, 0)).toContain('-');
  });
});
