import { changeBg, nameColor, prepostBg, prepostColor, rateColor } from './display.js';
import { dataText, formatRate, prepostText, priceText } from './format.js';
import { esc } from './utils.js';

function styleAttr(color, bg) {
  let s = `color:${esc(color)};`;
  if (bg) s += `background-color:${esc(bg)};`;
  return ` style="${s}"`;
}

function displayName(stock) {
  if (stock.special) return `--${stock.name}--`;
  return stock.name;
}

export function headerHtml() {
  return `<div class="stock-header">
    <div class="col-name"></div>
    <div class="col-prepost">Pre/Post</div>
    <div class="col-1d">1d%</div>
    <div class="col-50d">50d%</div>
    <div class="col-200d">200d%</div>
    <div class="col-data">Data</div>
    <div class="col-price">Price</div>
  </div>`;
}

export function stockRowHtml(stock, attrs, signalState, highlightColor) {
  const ms = attrs?.marketState ?? null;

  const nameStyle = styleAttr(nameColor(attrs), null);
  const prepostStyle = styleAttr(prepostColor(attrs), prepostBg(ms));
  const change1dStyle = styleAttr(rateColor(attrs?.regularMarketChangePercent ?? 0), changeBg(ms));
  const change50dStyle = styleAttr(rateColor(attrs?.fiftyDayAverageChangePercent ?? 0, 30), null);
  const change200dStyle = styleAttr(
    rateColor(attrs?.twoHundredDayAverageChangePercent ?? 0, 30),
    null
  );
  const priceStyle = styleAttr('dimgray', null);
  const rowStyle = highlightColor ? ` style="background-color:${esc(highlightColor)};"` : '';

  return `<div class="stock-row"${rowStyle}>
    <div class="col-name"${nameStyle}>${esc(displayName(stock))}</div>
    <div class="col-prepost"${prepostStyle}>${esc(prepostText(attrs))}</div>
    <div class="col-1d"${change1dStyle}>${esc(formatRate(attrs?.regularMarketChangePercent, 2))}</div>
    <div class="col-50d"${change50dStyle}>${esc(formatRate(attrs?.fiftyDayAverageChangePercent, 1))}</div>
    <div class="col-200d"${change200dStyle}>${esc(formatRate(attrs?.twoHundredDayAverageChangePercent, 1))}</div>
    <div class="col-data">${dataText(attrs, signalState)}</div>
    <div class="col-price"${priceStyle}>${esc(priceText(attrs))}</div>
  </div>`;
}

export function pinnedHtml(stocks, states, prefix, signalState) {
  return stocks
    .map((stock) => {
      const entity = states[`${prefix}${stock.symbol}`];
      return stockRowHtml(stock, entity?.attributes ?? null, signalState, stock.highlight ?? null);
    })
    .join('');
}

export function sortedHtml(stocks, states, prefix, signalState) {
  const withChange = stocks.map((stock) => {
    const attrs = states[`${prefix}${stock.symbol}`]?.attributes ?? null;
    return { stock, attrs, change: attrs?.regularMarketChangePercent ?? 0 };
  });

  withChange.sort((a, b) => b.change - a.change);

  return withChange
    .map(({ stock, attrs }) => stockRowHtml(stock, attrs, signalState, stock.highlight ?? null))
    .join('');
}
