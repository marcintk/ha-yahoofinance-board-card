import { changeBg, nameColor, prepostBg, prepostColor, rateColor } from './display.js';
import { dataText, formatRate, prepostText, priceText } from './format.js';
import { resolveIcon } from './icons.js';
import type { HassEntityState, StockEntry, YahooFinanceAttributes } from './types.js';
import { esc } from './utils.js';

function styleAttr(color: string, bg: string | null): string {
  let s = `color:${esc(color)};`;
  if (bg) s += `background-color:${esc(bg)};`;
  return ` style="${s}"`;
}

function displayName(stock: StockEntry, icon: string): string {
  return icon ? `${icon} ${stock.name}` : stock.name;
}

const DATA_LABELS = ['PE', 'FPE', 'Div', 'Vol'];

export function headerHtml(dataIndex: number): string {
  return `<div class="stock-header">
    <div class="col-name"></div>
    <div class="col-prepost">Pre/Post</div>
    <div class="col-1d">1d%</div>
    <div class="col-50d">50d%</div>
    <div class="col-200d">200d%</div>
    <div class="col-data">${DATA_LABELS[dataIndex] ?? 'PE'}</div>
    <div class="col-price">Price</div>
  </div>`;
}

export function stockRowHtml(
  stock: StockEntry,
  attrs: YahooFinanceAttributes | null,
  signalState: number,
  iconsMode: 'auto' | 'none' = 'none'
): string {
  const ms = attrs?.marketState ?? null;
  const icon = resolveIcon(stock.symbol, stock.icon, iconsMode);

  const nameStyle = styleAttr(nameColor(attrs), null);
  const prepostStyle = styleAttr(prepostColor(attrs), prepostBg(ms));
  const change1dStyle = styleAttr(rateColor(attrs?.regularMarketChangePercent ?? 0), changeBg(ms));
  const change50dStyle = styleAttr(rateColor(attrs?.fiftyDayAverageChangePercent ?? 0, 30), null);
  const change200dStyle = styleAttr(
    rateColor(attrs?.twoHundredDayAverageChangePercent ?? 0, 30),
    null
  );
  const priceStyle = styleAttr('dimgray', null);
  const rowStyle = stock.mark ? ` style="background-color:${esc(stock.mark)};"` : '';

  return `<div class="stock-row"${rowStyle}>
    <div class="col-name"${nameStyle}>${esc(displayName(stock, icon))}</div>
    <div class="col-prepost"${prepostStyle}>${esc(prepostText(attrs))}</div>
    <div class="col-1d"${change1dStyle}>${esc(formatRate(attrs?.regularMarketChangePercent, 2))}</div>
    <div class="col-50d"${change50dStyle}>${esc(formatRate(attrs?.fiftyDayAverageChangePercent, 1))}</div>
    <div class="col-200d"${change200dStyle}>${esc(formatRate(attrs?.twoHundredDayAverageChangePercent, 1))}</div>
    <div class="col-data">${dataText(attrs, signalState)}</div>
    <div class="col-price"${priceStyle}>${esc(priceText(attrs))}</div>
  </div>`;
}

export function pinnedHtml(
  stocks: StockEntry[],
  states: Record<string, HassEntityState | undefined>,
  prefix: string,
  signalState: number,
  iconsMode: 'auto' | 'none' = 'none'
): string {
  return stocks
    .map((stock) => {
      const entity = states[`${prefix}${stock.symbol}`];
      return stockRowHtml(stock, entity?.attributes ?? null, signalState, iconsMode);
    })
    .join('');
}

export function sortedHtml(
  stocks: StockEntry[],
  states: Record<string, HassEntityState | undefined>,
  prefix: string,
  signalState: number,
  iconsMode: 'auto' | 'none' = 'none'
): string {
  const withChange = stocks.map((stock) => {
    const attrs = states[`${prefix}${stock.symbol}`]?.attributes ?? null;
    return { stock, attrs, change: attrs?.regularMarketChangePercent ?? 0 };
  });

  withChange.sort((a, b) => b.change - a.change);

  return withChange
    .map(({ stock, attrs }) => stockRowHtml(stock, attrs, signalState, iconsMode))
    .join('');
}
