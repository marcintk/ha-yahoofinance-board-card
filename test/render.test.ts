import { render, type TemplateResult } from 'lit';
import { describe, expect, it } from 'vitest';
import { headerHtml, stockRowHtml, stockSectionHtml } from '../src/render.js';

function doc(template: TemplateResult): HTMLElement {
  const el = document.createElement('div');
  render(template, el);
  return el;
}

const baseAttrs = {
  marketState: 'REGULAR' as const,
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
  regularMarketVolume: 75_000_000,
};

describe('headerHtml', () => {
  it('contains the stock-header class', () => {
    expect(doc(headerHtml()).querySelector('.stock-header')).not.toBeNull();
  });

  it('contains all column classes', () => {
    const el = doc(headerHtml());
    expect(el.querySelector('.col-name')).not.toBeNull();
    expect(el.querySelector('.col-prepost')).not.toBeNull();
    expect(el.querySelector('.col-1d')).not.toBeNull();
    expect(el.querySelector('.col-50d')).not.toBeNull();
    expect(el.querySelector('.col-200d')).not.toBeNull();
    expect(el.querySelector('.col-data')).not.toBeNull();
    expect(el.querySelector('.col-price')).not.toBeNull();
  });

  it('contains column label text', () => {
    const el = doc(headerHtml(0));
    expect(el.textContent).toContain('Pre/Post');
    expect(el.textContent).toContain('1d%');
    expect(el.textContent).toContain('Price');
  });

  it('shows PE for dataIndex 0', () => {
    expect(doc(headerHtml(0)).querySelector('.col-data')?.textContent).toBe('PE');
  });

  it('shows FPE for dataIndex 1', () => {
    expect(doc(headerHtml(1)).querySelector('.col-data')?.textContent).toBe('FPE');
  });

  it('shows Div for dataIndex 2', () => {
    expect(doc(headerHtml(2)).querySelector('.col-data')?.textContent).toBe('Div');
  });

  it('shows Vol for dataIndex 3', () => {
    expect(doc(headerHtml(3)).querySelector('.col-data')?.textContent).toBe('Vol');
  });

  it('falls back to PE for out-of-range dataIndex', () => {
    expect(doc(headerHtml(99)).querySelector('.col-data')?.textContent).toBe('PE');
  });
});

describe('stockRowHtml', () => {
  const stock = { symbol: 'aapl', name: 'Apple' };

  it('renders a stock row with stock-row class', () => {
    expect(
      doc(stockRowHtml(stock, baseAttrs, 0, 'Apple')).querySelector('.stock-row')
    ).not.toBeNull();
  });

  it('renders the stock name', () => {
    expect(
      doc(stockRowHtml(stock, baseAttrs, 0, 'Apple')).querySelector('.col-name')?.textContent
    ).toContain('Apple');
  });

  it('applies mark color as row background', () => {
    const el = doc(stockRowHtml({ ...stock, mark: 'gold' }, baseAttrs, 0, 'Apple'));
    expect(el.querySelector('.stock-row')?.getAttribute('style')).toContain('gold');
  });

  it('does not apply mark to the price cell', () => {
    const el = doc(stockRowHtml({ ...stock, mark: 'gold' }, baseAttrs, 0, 'Apple'));
    expect(el.querySelector('.col-price')?.getAttribute('style')).toContain('gray');
    expect(el.querySelector('.col-price')?.getAttribute('style')).not.toContain('gold');
  });

  it('renders no style attribute on row when mark is not set', () => {
    const el = doc(stockRowHtml(stock, baseAttrs, 0, 'Apple'));
    expect(el.querySelector('.stock-row')?.getAttribute('style')).toBeNull();
  });

  it('renders label with auto-detected ◆ icon for futures symbol', () => {
    const el = doc(stockRowHtml({ symbol: 'gc_f', name: 'Gold' }, null, 0, '◆ Gold'));
    expect(el.querySelector('.col-name')?.textContent).toContain('◆ Gold');
  });

  it('renders label with auto-detected ¤ icon for FX symbol', () => {
    const el = doc(stockRowHtml({ symbol: 'usdpln_x', name: 'USD/PLN' }, null, 0, '¤ USD/PLN'));
    expect(el.querySelector('.col-name')?.textContent).toContain('¤ USD/PLN');
  });

  it('renders label with auto-detected △ icon for index symbol', () => {
    const el = doc(stockRowHtml({ symbol: 'dji', name: 'DOW JONES' }, null, 0, '△ DOW JONES'));
    expect(el.querySelector('.col-name')?.textContent).toContain('△ DOW JONES');
  });

  it('renders label with auto-detected ⬢ icon for crypto symbol', () => {
    const el = doc(stockRowHtml({ symbol: 'btc_usd', name: 'Bitcoin' }, null, 0, '⬢ Bitcoin'));
    expect(el.querySelector('.col-name')?.textContent).toContain('⬢ Bitcoin');
  });

  it('renders plain name label when no icon applies', () => {
    const el = doc(stockRowHtml(stock, baseAttrs, 0, 'Apple'));
    expect(el.querySelector('.col-name')?.textContent?.trim()).toBe('Apple');
  });

  it('renders plain name label without icon when label has no prefix', () => {
    const el = doc(stockRowHtml({ symbol: 'dji', name: 'DOW JONES' }, null, 0, 'DOW JONES'));
    expect(el.querySelector('.col-name')?.textContent?.trim()).toBe('DOW JONES');
    expect(el.querySelector('.col-name')?.textContent).not.toContain('△');
  });

  it('renders label with per-entry icon override', () => {
    const el = doc(
      stockRowHtml({ symbol: 'dji', name: 'DOW JONES', icon: '★' }, null, 0, '★ DOW JONES')
    );
    expect(el.querySelector('.col-name')?.textContent).toContain('★ DOW JONES');
    expect(el.querySelector('.col-name')?.textContent).not.toContain('△');
  });

  it('renders label with per-entry icon when provided', () => {
    const el = doc(stockRowHtml({ ...stock, icon: '★' }, baseAttrs, 0, '★ Apple'));
    expect(el.querySelector('.col-name')?.textContent).toContain('★ Apple');
  });

  it('renders with null attrs without throwing', () => {
    const el = doc(stockRowHtml(stock, null, 0, 'Apple'));
    expect(el.querySelector('.stock-row')).not.toBeNull();
    expect(el.querySelector('.col-name')?.textContent).toContain('Apple');
  });

  it('applies khaki background for PRE market state', () => {
    const el = doc(stockRowHtml(stock, { ...baseAttrs, marketState: 'PRE' }, 0, 'Apple'));
    expect(el.querySelector('.col-prepost')?.getAttribute('style')).toContain('khaki');
  });

  it('applies lightblue background for PREPRE market state', () => {
    const el = doc(stockRowHtml(stock, { ...baseAttrs, marketState: 'PREPRE' }, 0, 'Apple'));
    expect(el.querySelector('.col-prepost')?.getAttribute('style')).toContain('lightblue');
  });

  it('applies pink background for POST market state', () => {
    const el = doc(stockRowHtml(stock, { ...baseAttrs, marketState: 'POST' }, 0, 'Apple'));
    expect(el.querySelector('.col-prepost')?.getAttribute('style')).toContain('pink');
  });

  it('applies indigo background for POSTPOST market state', () => {
    const el = doc(stockRowHtml(stock, { ...baseAttrs, marketState: 'POSTPOST' }, 0, 'Apple'));
    expect(el.querySelector('.col-prepost')?.getAttribute('style')).toContain('indigo');
  });

  it('colors price cell with prepost rate color for PRE market state', () => {
    const el = doc(stockRowHtml(stock, { ...baseAttrs, marketState: 'PRE' }, 0, 'Apple'));
    expect(el.querySelector('.col-price')?.getAttribute('style')).toContain('seagreen');
  });

  it('colors price cell with prepost rate color for POST market state', () => {
    const el = doc(stockRowHtml(stock, { ...baseAttrs, marketState: 'POST' }, 0, 'Apple'));
    expect(el.querySelector('.col-price')?.getAttribute('style')).toContain('indianred');
  });

  it('colors price cell with prepost rate color for PREPRE market state', () => {
    const el = doc(stockRowHtml(stock, { ...baseAttrs, marketState: 'PREPRE' }, 0, 'Apple'));
    expect(el.querySelector('.col-price')?.getAttribute('style')).toContain('seagreen');
  });

  it('colors price cell with prepost rate color for POSTPOST market state', () => {
    const el = doc(stockRowHtml(stock, { ...baseAttrs, marketState: 'POSTPOST' }, 0, 'Apple'));
    expect(el.querySelector('.col-price')?.getAttribute('style')).toContain('indianred');
  });

  it('colors price cell gray during REGULAR market state', () => {
    const el = doc(stockRowHtml(stock, baseAttrs, 0, 'Apple'));
    expect(el.querySelector('.col-price')?.getAttribute('style')).toContain('gray');
    expect(el.querySelector('.col-price')?.getAttribute('style')).not.toContain('background-color');
  });

  it('applies lightgray 1d change background for REGULAR market state', () => {
    const el = doc(stockRowHtml(stock, baseAttrs, 0, 'Apple'));
    expect(el.querySelector('.col-1d')?.getAttribute('style')).toContain('lightgray');
  });

  it('does not inject HTML from label content', () => {
    const xssName = '<script>alert(1)</script>';
    const el = doc(stockRowHtml({ symbol: 'test', name: xssName }, null, 0, xssName));
    expect(el.querySelector('script')).toBeNull();
    expect(el.querySelector('.col-name')?.textContent).toContain('<script>');
  });

  it('does not allow event handler injection via mark color', () => {
    const mark = 'red;" onmouseenter="fetch(\'evil.com\')"';
    const el = doc(stockRowHtml({ ...stock, mark }, baseAttrs, 0, 'Apple'));
    const row = el.querySelector('.stock-row') as HTMLElement;
    expect(row.onmouseenter).toBeNull();
    expect(row.getAttribute('style')).toContain('red');
  });

  it('renders data column via dataText', () => {
    const el = doc(stockRowHtml(stock, baseAttrs, 1, 'Apple'));
    expect(el.querySelector('.col-data')).not.toBeNull();
  });
});

describe('stockSectionHtml (pinned, no sort)', () => {
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
    const rowMeta = new Map([
      ['dji', 'DOW JONES'],
      ['gspc', 'S&P 500'],
    ]);
    const el = doc(stockSectionHtml(stocks, states, prefix, 0, rowMeta));
    const rows = el.querySelectorAll('.stock-row');
    expect(rows[0].querySelector('.col-name')?.textContent).toContain('DOW JONES');
    expect(rows[1].querySelector('.col-name')?.textContent).toContain('S&P 500');
  });

  it('renders gracefully when entity is missing', () => {
    const stocks = [{ symbol: 'unknown', name: 'Unknown' }];
    const el = doc(stockSectionHtml(stocks, {}, prefix, 0, new Map([['unknown', 'Unknown']])));
    expect(el.querySelector('.col-name')?.textContent).toContain('Unknown');
  });

  it('passes mark color to stock row', () => {
    const stocks = [{ symbol: 'sabr', name: 'Sabre', mark: 'gold' }];
    const states = { 'sensor.yahoofinance_sabr': { attributes: baseAttrs } };
    const el = doc(stockSectionHtml(stocks, states, prefix, 0, new Map([['sabr', 'Sabre']])));
    expect(el.querySelector('.stock-row')?.getAttribute('style')).toContain('gold');
  });

  it('renders pre-computed icon label', () => {
    const stocks = [{ symbol: 'gc_f', name: 'Gold' }];
    const states = { 'sensor.yahoofinance_gc_f': { attributes: baseAttrs } };
    const el = doc(stockSectionHtml(stocks, states, prefix, 0, new Map([['gc_f', '◆ Gold']])));
    expect(el.querySelector('.col-name')?.textContent).toContain('◆ Gold');
  });
});

describe('stockSectionHtml (sorted, sort=true)', () => {
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
    const rowMeta = new Map([
      ['low', 'LowChange'],
      ['high', 'HighChange'],
    ]);
    const el = doc(stockSectionHtml(stocks, states, prefix, 0, rowMeta, true));
    const rows = el.querySelectorAll('.stock-row');
    expect(rows[0].querySelector('.col-name')?.textContent).toContain('HighChange');
    expect(rows[1].querySelector('.col-name')?.textContent).toContain('LowChange');
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
    const rowMeta = new Map([
      ['known', 'Known'],
      ['unknown', 'Unknown'],
    ]);
    const el = doc(stockSectionHtml(stocks, states, prefix, 0, rowMeta, true));
    const rows = el.querySelectorAll('.stock-row');
    expect(rows[0].querySelector('.col-name')?.textContent).toContain('Known');
    expect(rows[1].querySelector('.col-name')?.textContent).toContain('Unknown');
  });

  it('sorts two missing stocks without error (both attrs null, ?? 0 for both sides)', () => {
    const stocks = [
      { symbol: 'a', name: 'A' },
      { symbol: 'b', name: 'B' },
    ];
    const rowMeta = new Map([
      ['a', 'A'],
      ['b', 'B'],
    ]);
    const el = doc(stockSectionHtml(stocks, {}, prefix, 0, rowMeta, true));
    expect(el.querySelectorAll('.stock-row').length).toBe(2);
  });

  it('passes mark color to sorted rows', () => {
    const stocks = [{ symbol: 'sabr', name: 'Sabre', mark: 'gold' }];
    const states = { 'sensor.yahoofinance_sabr': { attributes: baseAttrs } };
    const el = doc(stockSectionHtml(stocks, states, prefix, 0, new Map([['sabr', 'Sabre']]), true));
    expect(el.querySelector('.stock-row')?.getAttribute('style')).toContain('gold');
  });

  it('renders pre-computed icon label in sorted rows', () => {
    const stocks = [{ symbol: 'usdpln_x', name: 'USD/PLN' }];
    const states = { 'sensor.yahoofinance_usdpln_x': { attributes: baseAttrs } };
    const el = doc(
      stockSectionHtml(stocks, states, prefix, 0, new Map([['usdpln_x', '¤ USD/PLN']]), true)
    );
    expect(el.querySelector('.col-name')?.textContent).toContain('¤ USD/PLN');
  });
});
