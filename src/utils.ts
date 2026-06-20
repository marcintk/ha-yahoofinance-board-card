import type { MarketState } from './types.js';

export const esc = (s: string): string =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const MARKET_STATES = new Set<MarketState>(['PREPRE', 'PRE', 'REGULAR', 'POST', 'POSTPOST']);
