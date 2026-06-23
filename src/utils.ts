import type { MarketState } from './types.js';

export function isPreMarket(state: MarketState | null | undefined): boolean {
  return state === 'PREPRE' || state === 'PRE';
}

export function isPostMarket(state: MarketState | null | undefined): boolean {
  return state === 'POST' || state === 'POSTPOST';
}
