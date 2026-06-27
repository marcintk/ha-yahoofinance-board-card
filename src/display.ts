import type { YahooFinanceAttributes } from "./types.js";
import { isPostMarket, isPreMarket } from "./utils.js";

export function rateColor(rate: number, threshold = 10.0): string {
  if (rate > threshold) return "lightseagreen";
  if (rate > 0) return "seagreen";
  if (rate < -threshold) return "darkorange";
  if (rate < 0) return "indianred";
  return "gray";
}

export function nameColor(attrs: YahooFinanceAttributes | null): string | null {
  if (!attrs || attrs.marketState !== "REGULAR") return null;
  return rateColor(attrs.regularMarketChangePercent ?? 0);
}

export function prepostColor(attrs: YahooFinanceAttributes | null): string {
  if (!attrs) return "gray";
  const state = attrs.marketState;
  if (isPreMarket(state)) return rateColor(attrs.preMarketChangePercent ?? 0);
  if (isPostMarket(state)) return rateColor(attrs.postMarketChangePercent ?? 0);
  return "gray";
}
