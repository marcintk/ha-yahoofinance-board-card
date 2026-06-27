import type { MarketState } from "./types.js";

export function isPreMarket(state: MarketState | null | undefined): boolean {
  return state === "PREPRE" || state === "PRE";
}

export function isPostMarket(state: MarketState | null | undefined): boolean {
  return state === "POST" || state === "POSTPOST";
}

export function timeAgo(ms: number): string {
  if (ms < 60_000) return `${Math.floor(ms / 1_000)}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  return `${Math.floor(ms / 3_600_000)}h`;
}
