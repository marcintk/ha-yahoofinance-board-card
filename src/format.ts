import type { YahooFinanceAttributes } from './types.js';

export function formatRate(rate: number | null | undefined, precision: number): string {
  if (rate === null || rate === undefined || Number.isNaN(rate)) return '-';
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
  if (state === 'PREPRE' || state === 'PRE') {
    return formatPrice(attrs.preMarketPrice, attrs.regularMarketPrice);
  }
  if (state === 'POST' || state === 'POSTPOST') {
    return formatPrice(attrs.postMarketPrice, attrs.regularMarketPrice);
  }
  return formatPrice(attrs.regularMarketPrice);
}

export function prepostText(attrs: YahooFinanceAttributes | null): string {
  if (!attrs) return '';
  const state = attrs.marketState;
  if (state === 'PREPRE' || state === 'PRE') return formatRate(attrs.preMarketChangePercent, 2);
  if (state === 'POST' || state === 'POSTPOST') return formatRate(attrs.postMarketChangePercent, 2);
  return '';
}

export function dataText(
  attrs: YahooFinanceAttributes | null | undefined,
  signalState: number
): string {
  if (signalState === 0) return _dataVal(attrs?.trailingPE, 1, 'X', 50);
  if (signalState === 1) return _dataVal(attrs?.forwardPE, 1, 'X', 50);
  if (signalState === 2) return _dataVal(attrs?.dividendRate, 2, '', 0);
  if (signalState === 3) return _volumeVal(attrs?.regularMarketVolume);
  return '';
}

function _dataVal(
  raw: number | undefined,
  precision: number,
  suffix: string,
  threshold: number
): string {
  const data = raw ?? NaN;
  if (Number.isNaN(data) || data === 0) return '<span style="color:gray;">-</span>';
  let color = 'gray';
  if (threshold > 0 && data > 0) color = 'seagreen';
  if (threshold > 0 && data > threshold) color = 'indianred';
  return `<span style="color:${color};">${data.toFixed(precision)}${suffix}</span>`;
}

function _volumeVal(raw: number | undefined): string {
  const data = raw ?? 0;
  if (!data) return '<span style="color:gray;">-</span>';
  if (data > 1000000000)
    return `<span style="color:gray;">${(data / 1000000000).toFixed(0)}G</span>`;
  if (data > 1000000) return `<span style="color:gray;">${(data / 1000000).toFixed(0)}M</span>`;
  return `<span style="color:gray;">${(data / 1000).toFixed(0)}K</span>`;
}
