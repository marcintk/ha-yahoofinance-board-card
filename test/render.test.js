import { describe, expect, it } from 'vitest';
import { headerHtml, pinnedHtml, sortedHtml, stockRowHtml } from '../src/render.js';

const baseAttrs = {
  marketState: 'REGULAR',
  regularMarketChangePercent: 2.5,
  preMarketChangePercent: 0.5,
  postMarketChangePercent: -0.5,
  fiftyDayAverageChangePercent: 5,
  twoHundredDayAverageChangePercent: -3,
  regularMarketPrice: 175.5,
  preMarketPrice: 178.0,
  postMarketPrice: 174.0,
  trailingPE: 30,
  forwardPE: 25,
  dividendRate: 0.92,
  regularMarketVolume: 75000000,
};

describe('headerHtml', () => {
  it('returns a string', () => {
    expect(typeof headerHtml()).toBe('string');
  });

  it('contains the stock-header class', () => {
    expect(headerHtml()).toContain('stock-header');
  });

  it('contains all column classes', () => {
    const html = headerHtml();
    expect(html).toContain('col-name');
    expect(html).toContain('col-prepost');
    expect(html).toContain('col-1d');
    expect(html).toContain('col-50d');
    expect(html).toContain('col-200d');
    expect(html).toContain('col-data');
    expect(html).toContain('col-price');
  });

  it('contains column label text', () => {
    const html = headerHtml();
    expect(html).toContain('Pre/Post');
    expect(html).toContain('1d%');
    expect(html).toContain('Price');
  });
});

describe('stockRowHtml', () => {
  const stock = { symbol: 'aapl', name: 'Apple' };

  it('renders a stock row with stock-row class', () => {
    expect(stockRowHtml(stock, baseAttrs, '0', null)).toContain('stock-row');
  });

  it('renders the stock name', () => {
    expect(stockRowHtml(stock, baseAttrs, '0', null)).toContain('Apple');
  });

  it('wraps name in -- when special flag is set', () => {
    const specialStock = { symbol: 'cost', name: 'Costco', special: true };
    expect(stockRowHtml(specialStock, baseAttrs, '0', null)).toContain('--Costco--');
  });

  it('does not wrap name when special is false', () => {
    const html = stockRowHtml(stock, baseAttrs, '0', null);
    expect(html).not.toContain('--Apple--');
    expect(html).toContain('>Apple<');
  });

  it('applies highlight color as row background', () => {
    const html = stockRowHtml(stock, baseAttrs, '0', 'gold');
    expect(html).toContain('class="stock-row" style="background-color:gold;"');
  });

  it('does not apply highlight to the price cell', () => {
    const html = stockRowHtml(stock, baseAttrs, '0', 'gold');
    expect(html).toContain('class="col-price" style="color:dimgray;"');
  });

  it('renders row with no style attribute when highlight is null', () => {
    const html = stockRowHtml(stock, baseAttrs, '0', null);
    expect(html).toContain('class="stock-row">');
  });

  it('renders with null attrs without throwing', () => {
    const html = stockRowHtml(stock, null, '0', null);
    expect(html).toContain('stock-row');
    expect(html).toContain('Apple');
  });

  it('applies khaki background for PRE market state', () => {
    const html = stockRowHtml(stock, { ...baseAttrs, marketState: 'PRE' }, '0', null);
    expect(html).toContain('khaki');
  });

  it('applies lightblue background for PREPRE market state', () => {
    const html = stockRowHtml(stock, { ...baseAttrs, marketState: 'PREPRE' }, '0', null);
    expect(html).toContain('lightblue');
  });

  it('applies pink background for POST market state', () => {
    const html = stockRowHtml(stock, { ...baseAttrs, marketState: 'POST' }, '0', null);
    expect(html).toContain('pink');
  });

  it('applies indigo background for POSTPOST market state', () => {
    const html = stockRowHtml(stock, { ...baseAttrs, marketState: 'POSTPOST' }, '0', null);
    expect(html).toContain('indigo');
  });

  it('applies lightgray 1d change background for REGULAR market state', () => {
    const html = stockRowHtml(stock, baseAttrs, '0', null);
    expect(html).toContain('lightgray');
  });

  it('escapes stock name to prevent XSS', () => {
    const xssStock = { symbol: 'test', name: '<script>alert(1)</script>' };
    const html = stockRowHtml(xssStock, null, '0', null);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes special chars in highlight color', () => {
    const html = stockRowHtml(stock, baseAttrs, '0', '<evil>');
    expect(html).toContain('&lt;evil&gt;');
    expect(html).not.toContain('<evil>');
  });

  it('renders data column via dataText', () => {
    const html = stockRowHtml(stock, baseAttrs, '1', null);
    expect(html).toContain('col-data');
  });
});

describe('pinnedHtml', () => {
  const prefix = 'sensor.yahoofinance_';

  it('renders stocks in configured order', () => {
    const stocks = [
      { symbol: 'dji', name: 'DOW JONES' },
      { symbol: 'gspc', name: 'S&P 500' },
    ];
    const states = {
      'sensor.yahoofinance_dji': {
        attributes: { ...baseAttrs, regularMarketPrice: 42000, regularMarketChangePercent: 1 },
      },
      'sensor.yahoofinance_gspc': {
        attributes: { ...baseAttrs, regularMarketPrice: 5500, regularMarketChangePercent: -1 },
      },
    };
    const html = pinnedHtml(stocks, states, prefix, '0');
    const djiPos = html.indexOf('DOW JONES');
    const sp500Pos = html.indexOf('S&amp;P 500');
    expect(djiPos).toBeGreaterThanOrEqual(0);
    expect(sp500Pos).toBeGreaterThan(djiPos);
  });

  it('renders gracefully when entity is missing', () => {
    const stocks = [{ symbol: 'unknown', name: 'Unknown' }];
    const html = pinnedHtml(stocks, {}, prefix, '0');
    expect(html).toContain('Unknown');
  });

  it('passes highlight color to stock row', () => {
    const stocks = [{ symbol: 'sabr', name: 'Sabre', highlight: 'gold' }];
    const states = { 'sensor.yahoofinance_sabr': { attributes: baseAttrs } };
    const html = pinnedHtml(stocks, states, prefix, '0');
    expect(html).toContain('background-color:gold');
  });
});

describe('sortedHtml', () => {
  const prefix = 'sensor.yahoofinance_';

  it('sorts stocks by 1d change descending', () => {
    const stocks = [
      { symbol: 'low', name: 'LowChange' },
      { symbol: 'high', name: 'HighChange' },
    ];
    const states = {
      'sensor.yahoofinance_low': {
        attributes: { ...baseAttrs, regularMarketChangePercent: 1 },
      },
      'sensor.yahoofinance_high': {
        attributes: { ...baseAttrs, regularMarketChangePercent: 5 },
      },
    };
    const html = sortedHtml(stocks, states, prefix, '0');
    expect(html.indexOf('HighChange')).toBeLessThan(html.indexOf('LowChange'));
  });

  it('places stocks with missing entity after positive-change stocks', () => {
    const stocks = [
      { symbol: 'known', name: 'Known' },
      { symbol: 'unknown', name: 'Unknown' },
    ];
    const states = {
      'sensor.yahoofinance_known': {
        attributes: { ...baseAttrs, regularMarketChangePercent: 3 },
      },
    };
    const html = sortedHtml(stocks, states, prefix, '0');
    expect(html.indexOf('Known')).toBeLessThan(html.indexOf('Unknown'));
  });

  it('passes highlight to sorted rows', () => {
    const stocks = [{ symbol: 'sabr', name: 'Sabre', highlight: 'gold' }];
    const states = { 'sensor.yahoofinance_sabr': { attributes: baseAttrs } };
    const html = sortedHtml(stocks, states, prefix, '0');
    expect(html).toContain('background-color:gold');
  });
});
