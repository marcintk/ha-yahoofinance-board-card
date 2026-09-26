import type { MarketState, YahooFinanceAttributes } from "./types.js";

export interface MarketPhase {
  state: MarketState | "UNKNOWN";
  isRegular: boolean;
  isExtended: boolean;
  activePrice: number | undefined;
  activeChangePercent: number | undefined;
}

export function rateColor(rate: number, threshold = 10.0): string {
  if (rate > threshold) return "lightseagreen";
  if (rate > 0) return "seagreen";
  if (rate < -threshold) return "darkorange";
  if (rate < 0) return "indianred";
  return "gray";
}

export function deriveMarketPhase(attrs: YahooFinanceAttributes | null): MarketPhase {
  const state = attrs?.marketState ?? "UNKNOWN";
  const isRegular = state === "REGULAR";
  const isPre = state === "PRE" || state === "PREPRE";
  const isPost = state === "POST" || state === "POSTPOST";
  const isExtended = isPre || isPost;

  let activePrice: number | undefined;
  let activeChangePercent: number | undefined;

  if (isPre) {
    activePrice = attrs?.preMarketPrice || attrs?.regularMarketPrice;
    activeChangePercent = attrs?.preMarketChangePercent;
  } else if (isPost) {
    activePrice = attrs?.postMarketPrice || attrs?.regularMarketPrice;
    activeChangePercent = attrs?.postMarketChangePercent;
  } else {
    activePrice = attrs?.regularMarketPrice;
    activeChangePercent = attrs?.regularMarketChangePercent;
  }

  return { state, isRegular, isExtended, activePrice, activeChangePercent };
}
