import { describe, expect, it } from 'vitest';
import { CARD_STYLES } from '../src/styles.js';

describe('CARD_STYLES', () => {
  it('is a non-empty string', () => {
    expect(typeof CARD_STYLES).toBe('string');
    expect(CARD_STYLES.length).toBeGreaterThan(0);
  });

  it('defines the stock-header class', () => {
    expect(CARD_STYLES).toContain('stock-header');
  });

  it('defines the stock-row class', () => {
    expect(CARD_STYLES).toContain('stock-row');
  });

  it('defines column classes', () => {
    expect(CARD_STYLES).toContain('col-name');
    expect(CARD_STYLES).toContain('col-prepost');
    expect(CARD_STYLES).toContain('col-1d');
    expect(CARD_STYLES).toContain('col-price');
  });

  it('targets ha-card element', () => {
    expect(CARD_STYLES).toContain('ha-card');
  });
});
