export function rateColor(rate, threshold = 10.0) {
  if (rate > threshold) return 'lightseagreen';
  if (rate > 0) return 'seagreen';
  if (rate < -threshold) return 'darkorange';
  if (rate < 0) return 'indianred';
  return 'gray';
}

export function nameColor(attrs) {
  if (!attrs) return 'gray';
  if (attrs.marketState === 'REGULAR') {
    return rateColor(attrs.regularMarketChangePercent ?? 0);
  }
  return 'gray';
}

export function prepostColor(attrs) {
  if (!attrs) return 'gray';
  const state = attrs.marketState;
  if (state === 'PREPRE' || state === 'PRE') return rateColor(attrs.preMarketChangePercent ?? 0);
  if (state === 'POST' || state === 'POSTPOST')
    return rateColor(attrs.postMarketChangePercent ?? 0);
  return 'gray';
}

export function prepostBg(marketState) {
  if (marketState === 'PREPRE') return 'lightblue';
  if (marketState === 'PRE') return 'khaki';
  if (marketState === 'POST') return 'pink';
  if (marketState === 'POSTPOST') return 'indigo';
  return null;
}

export function changeBg(marketState) {
  if (marketState === 'REGULAR') return 'lightgray';
  return null;
}
