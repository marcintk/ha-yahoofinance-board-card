export function formatRate(rate, precision) {
  const data = parseFloat(rate);
  if (Number.isNaN(data)) return '-';
  const abs = Math.abs(data).toFixed(precision);
  if (data > 0) return `+${abs}`;
  if (data < 0) return `-${abs}`;
  return abs;
}

export function formatPrice(price, fallback = 0) {
  let data = parseFloat(price);
  if (!data || data === 0) data = parseFloat(fallback);
  if (!data || data === 0) return '-';
  if (data > 1000) return data.toFixed(0);
  if (data > 10) return data.toFixed(1);
  return data.toFixed(2);
}

export function priceText(attrs) {
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

export function prepostText(attrs) {
  if (!attrs) return '';
  const state = attrs.marketState;
  if (state === 'PREPRE' || state === 'PRE') return formatRate(attrs.preMarketChangePercent, 2);
  if (state === 'POST' || state === 'POSTPOST') return formatRate(attrs.postMarketChangePercent, 2);
  return '';
}

export function dataText(attrs, signalState) {
  const s = String(signalState);
  if (s === '0') return _dataVal(attrs?.trailingPE, 1, 'X', 50);
  if (s === '1') return _dataVal(attrs?.forwardPE, 1, 'X', 50);
  if (s === '2') return _dataVal(attrs?.dividendRate, 2, '', 0);
  if (s === '3') return _volumeVal(attrs?.regularMarketVolume);
  return '';
}

function _dataVal(raw, precision, suffix, threshold) {
  const data = parseFloat(raw);
  if (Number.isNaN(data) || data === 0) return '<span style="color:gray;">-</span>';
  let color = 'gray';
  if (threshold > 0 && data > 0) color = 'seagreen';
  if (threshold > 0 && data > threshold) color = 'indianred';
  return `<span style="color:${color};">${data.toFixed(precision)}${suffix}</span>`;
}

function _volumeVal(raw) {
  const data = parseInt(raw, 10);
  if (!data || data === 0) return '<span style="color:gray;">-</span>';
  if (data > 1000000000)
    return `<span style="color:gray;">${(data / 1000000000).toFixed(0)}G</span>`;
  if (data > 1000000) return `<span style="color:gray;">${(data / 1000000).toFixed(0)}M</span>`;
  return `<span style="color:gray;">${(data / 1000).toFixed(0)}K</span>`;
}
