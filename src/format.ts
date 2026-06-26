import { html, type TemplateResult } from 'lit';
import type { YahooFinanceAttributes } from './types.js';
import { isPostMarket, isPreMarket } from './utils.js';

const _DASH = html`<span style="color:gray;">-</span>`;

export function formatRate(rate: number | null | undefined, precision: number): string {
  if (rate == null || Number.isNaN(rate)) return '-';
  const abs = Math.abs(rate).toFixed(precision);
  if (rate > 0) return `+${abs}`;
  if (rate < 0) return `-${abs}`;
  return abs;
}

export function formatPrice(price: number | null | undefined, fallback = 0): string {
  const data = price || fallback;
  if (!data) return '-';
  if (data > 1000) return data.toFixed(0);
  if (data > 10) return data.toFixed(1);
  return data.toFixed(2);
}

export function priceText(attrs: YahooFinanceAttributes | null): string {
  if (!attrs) return '-';
  const state = attrs.marketState;
  if (isPreMarket(state)) return formatPrice(attrs.preMarketPrice, attrs.regularMarketPrice);
  if (isPostMarket(state)) return formatPrice(attrs.postMarketPrice, attrs.regularMarketPrice);
  return formatPrice(attrs.regularMarketPrice);
}

export function prepostText(attrs: YahooFinanceAttributes | null): string {
  if (!attrs) return '';
  const state = attrs.marketState;
  if (isPreMarket(state)) return formatRate(attrs.preMarketChangePercent, 2);
  if (isPostMarket(state)) return formatRate(attrs.postMarketChangePercent, 2);
  return '';
}

export function dataText(
  attrs: YahooFinanceAttributes | null | undefined,
  signalState: number
): TemplateResult {
  if (signalState === 0) return _dataVal(attrs?.trailingPE, 1, 'X', 50);
  if (signalState === 1) return _dataVal(attrs?.forwardPE, 1, 'X', 50);
  if (signalState === 2) return _dataVal(attrs?.dividendRate, 2, '', 0);
  if (signalState === 3) return _volumeVal(attrs?.regularMarketVolume);
  return _DASH;
}

function _dataVal(
  raw: number | undefined,
  precision: number,
  suffix: string,
  threshold: number
): TemplateResult {
  const data = raw ?? NaN;
  if (Number.isNaN(data) || data === 0) return _DASH;
  let color = 'gray';
  if (threshold > 0 && data > 0) color = 'seagreen';
  if (threshold > 0 && data > threshold) color = 'indianred';
  return html`<span style="color:${color};">${data.toFixed(precision)}${suffix}</span>`;
}

function _volumeVal(raw: number | undefined): TemplateResult {
  const data = raw ?? 0;
  if (!data) return _DASH;
  const [n, s]: [number, string] =
    data > 1_000_000_000
      ? [data / 1_000_000_000, 'G']
      : data > 1_000_000
        ? [data / 1_000_000, 'M']
        : [data / 1_000, 'K'];
  return html`<span style="color:gray;">${n.toFixed(0)}${s}</span>`;
}
