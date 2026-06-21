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
    const html = headerHtml(0);
    expect(html).toContain('Pre/Post');
    expect(html).toContain('1d%');
    expect(html).toContain('Price');
  });

  it('shows PE for dataIndex 0', () => {
    expect(headerHtml(0)).toContain('>PE<');
  });

  it('shows FPE for dataIndex 1', () => {
    expect(headerHtml(1)).toContain('>FPE<');
  });

  it('shows Div for dataIndex 2', () => {
    expect(headerHtml(2)).toContain('>Div<');
  });

  it('shows Vol for dataIndex 3', () => {
    expect(headerHtml(3)).toContain('>Vol<');
  });
});

describe('stockRowHtml', () => {
  const stock = { symbol: 'aapl', name: 'Apple' };

  it('renders a stock row with stock-row class', () => {
    expect(stockRowHtml(stock, baseAttrs, '0')).toContain('stock-row');
  });

  it('renders the stock name', () => {
    expect(stockRowHtml(stock, baseAttrs, '0')).toContain('Apple');
  });

  it('applies mark color as row background', () => {
    const html = stockRowHtml({ ...stock, mark: 'gold' }, baseAttrs, '0');
    expect(html).toContain('class="stock-row" style="background-color:gold;"');
  });

  it('does not apply mark to the price cell', () => {
    const html = stockRowHtml({ ...stock, mark: 'gold' }, baseAttrs, '0');
    expect(html).toContain('class="col-price" style="color:dimgray;"');
  });

  it('renders plain name with no row style when mark is not set', () => {
    const html = stockRowHtml(stock, baseAttrs, '0');
    expect(html).toContain('>Apple<');
    expect(html).toContain('class="stock-row">');
  });

  it('shows auto-detected ◆ icon for futures symbol', () => {
    const html = stockRowHtml({ symbol: 'gc_f', name: 'Gold' }, null, '0', 'auto');
    expect(html).toContain('◆ Gold');
  });

  it('shows auto-detected ¤ icon for FX symbol', () => {
    const html = stockRowHtml({ symbol: 'usdpln_x', name: 'USD/PLN' }, null, '0', 'auto');
    expect(html).toContain('¤ USD/PLN');
  });

  it('shows auto-detected ① icon for index symbol', () => {
    const html = stockRowHtml({ symbol: 'dji', name: 'DOW JONES' }, null, '0', 'auto');
    expect(html).toContain('① DOW JONES');
  });

  it('shows auto-detected ₿ icon for crypto symbol', () => {
    const html = stockRowHtml({ symbol: 'btc_usd', name: 'Bitcoin' }, null, '0', 'auto');
    expect(html).toContain('₿ Bitcoin');
  });

  it('shows no icon for equity symbol in auto mode', () => {
    const html = stockRowHtml(stock, baseAttrs, '0', 'auto');
    expect(html).toContain('>Apple<');
  });

  it('shows no icon in none mode even for index symbol', () => {
    const html = stockRowHtml({ symbol: 'dji', name: 'DOW JONES' }, null, '0', 'none');
    expect(html).toContain('>DOW JONES<');
    expect(html).not.toContain('①');
  });

  it('uses per-entry icon override over auto-detection', () => {
    const html = stockRowHtml({ symbol: 'dji', name: 'DOW JONES', icon: '★' }, null, '0', 'auto');
    expect(html).toContain('★ DOW JONES');
    expect(html).not.toContain('①');
  });

  it('shows per-entry icon even when icons mode is none', () => {
    const html = stockRowHtml({ ...stock, icon: '★' }, baseAttrs, '0', 'none');
    expect(html).toContain('★ Apple');
  });

  it('renders with null attrs without throwing', () => {
    const html = stockRowHtml(stock, null, '0');
    expect(html).toContain('stock-row');
    expect(html).toContain('Apple');
  });

  it('applies khaki background for PRE market state', () => {
    const html = stockRowHtml(stock, { ...baseAttrs, marketState: 'PRE' }, '0');
    expect(html).toContain('khaki');
  });

  it('applies lightblue background for PREPRE market state', () => {
    const html = stockRowHtml(stock, { ...baseAttrs, marketState: 'PREPRE' }, '0');
    expect(html).toContain('lightblue');
  });

  it('applies pink background for POST market state', () => {
    const html = stockRowHtml(stock, { ...baseAttrs, marketState: 'POST' }, '0');
    expect(html).toContain('pink');
  });

  it('applies indigo background for POSTPOST market state', () => {
    const html = stockRowHtml(stock, { ...baseAttrs, marketState: 'POSTPOST' }, '0');
    expect(html).toContain('indigo');
  });

  it('applies lightgray 1d change background for REGULAR market state', () => {
    const html = stockRowHtml(stock, baseAttrs, '0');
    expect(html).toContain('lightgray');
  });

  it('escapes stock name to prevent XSS', () => {
    const xssStock = { symbol: 'test', name: '<script>alert(1)</script>' };
    const html = stockRowHtml(xssStock, null, '0');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes special chars in mark color', () => {
    const html = stockRowHtml({ ...stock, mark: '<evil>' }, baseAttrs, '0');
    expect(html).toContain('&lt;evil&gt;');
    expect(html).not.toContain('<evil>');
  });

  it('renders data column via dataText', () => {
    const html = stockRowHtml(stock, baseAttrs, '1');
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

  it('passes mark color to stock row', () => {
    const stocks = [{ symbol: 'sabr', name: 'Sabre', mark: 'gold' }];
    const states = { 'sensor.yahoofinance_sabr': { attributes: baseAttrs } };
    const html = pinnedHtml(stocks, states, prefix, '0');
    expect(html).toContain('background-color:gold');
  });

  it('propagates iconsMode to stock rows', () => {
    const stocks = [{ symbol: 'gc_f', name: 'Gold' }];
    const states = { 'sensor.yahoofinance_gc_f': { attributes: baseAttrs } };
    const html = pinnedHtml(stocks, states, prefix, '0', 'auto');
    expect(html).toContain('◆ Gold');
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

  it('passes mark color to sorted rows', () => {
    const stocks = [{ symbol: 'sabr', name: 'Sabre', mark: 'gold' }];
    const states = { 'sensor.yahoofinance_sabr': { attributes: baseAttrs } };
    const html = sortedHtml(stocks, states, prefix, '0');
    expect(html).toContain('background-color:gold');
  });

  it('propagates iconsMode to sorted rows', () => {
    const stocks = [{ symbol: 'usdpln_x', name: 'USD/PLN' }];
    const states = { 'sensor.yahoofinance_usdpln_x': { attributes: baseAttrs } };
    const html = sortedHtml(stocks, states, prefix, '0', 'auto');
    expect(html).toContain('¤ USD/PLN');
  });
});
