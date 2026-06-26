import { html, nothing, type TemplateResult } from 'lit';
import { changeBg, nameColor, prepostBg, prepostColor, rateColor } from './display.js';
import { dataText, formatRate, prepostText, priceText } from './format.js';
import type { StockEntry, YahooFinanceAttributes } from './types.js';

export const DATA_LABELS = ['PE', 'FPE', 'Div', 'Vol'];

export function headerHtml(dataIndex = 0): TemplateResult {
  return html`<div class="stock-header">
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
  dataIndex: number,
  label: string
): TemplateResult {
  const ms = attrs?.marketState ?? null;

  const bg1d = changeBg(ms);
  const bgPrepost = prepostBg(ms);
  const rowStyle = stock.mark ? `background-color:${stock.mark};` : undefined;

  return html`<div class="stock-row" style=${rowStyle ?? nothing}>
    <div class="col-name" style="color:${nameColor(attrs)};">${label}</div>
    <div
      class="col-prepost"
      style="color:${prepostColor(attrs)};${bgPrepost ? `background-color:${bgPrepost};` : ''}"
    >${prepostText(attrs)}</div>
    <div
      class="col-1d"
      style="color:${rateColor(attrs?.regularMarketChangePercent ?? 0)};${bg1d ? `background-color:${bg1d};` : ''}"
    >${formatRate(attrs?.regularMarketChangePercent, 2)}</div>
    <div class="col-50d" style="color:${rateColor(attrs?.fiftyDayAverageChangePercent ?? 0, 30)};"
    >${formatRate(attrs?.fiftyDayAverageChangePercent, 1)}</div>
    <div
      class="col-200d"
      style="color:${rateColor(attrs?.twoHundredDayAverageChangePercent ?? 0, 30)};"
    >${formatRate(attrs?.twoHundredDayAverageChangePercent, 1)}</div>
    <div class="col-data">${dataText(attrs, dataIndex)}</div>
    <div class="col-price" style="color:dimgray;">${priceText(attrs)}</div>
  </div>`;
}

export function stockSectionHtml(
  stocks: StockEntry[],
  states: Record<string, { attributes: YahooFinanceAttributes } | undefined>,
  prefix: string,
  dataIndex: number,
  rowMeta: Map<string, string>,
  sort = false
): TemplateResult {
  const entries = stocks.map((stock) => {
    const attrs = states[`${prefix}${stock.symbol}`]?.attributes ?? null;
    return { stock, attrs, change: attrs?.regularMarketChangePercent ?? 0 };
  });
  if (sort) entries.sort((a, b) => b.change - a.change);
  return html`${entries.map(({ stock, attrs }) => {
    const label = rowMeta.get(stock.symbol) ?? stock.name;
    return stockRowHtml(stock, attrs, dataIndex, label);
  })}`;
}
