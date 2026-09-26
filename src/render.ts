import { html, nothing, type TemplateResult } from "lit";
import { dataText, formatPrice, formatRate } from "./format.js";
import { deriveMarketPhase, rateColor } from "./market-phase.js";
import type { CardConfig, Hass, StateColors, StockEntry, YahooFinanceAttributes } from "./types.js";

export type CardView =
  | { kind: "error"; message: string }
  | { kind: "ok"; template: TemplateResult };

export const CARD_STYLES = `
  :host { display: block; }

  ha-card {
    padding: 4px 2px;
    box-sizing: border-box;
    font-family: var(--paper-font-body1_-_font-family, sans-serif);
    color: var(--secondary-text-color, darkgray);
    font-size: 13px;
    overflow: hidden;
  }

  .stock-header, .stock-row {
    display: grid;
    grid-template-columns: 1fr 50px 50px 50px 50px 55px 50px;
    grid-template-rows: 1fr;
    align-items: stretch;
    line-height: 1;
  }

  .stock-header {
    color: var(--secondary-text-color, gray);
    border-bottom: 1px solid rgba(255,255,255,0.08);
    padding: 2px 0;
  }

  .stock-row {
    box-shadow: inset 0 -1px 0 rgba(255,255,255,0.04);
    overflow: hidden;
  }

  .col-name {
    padding-left: 2px;
    letter-spacing: 0.05em;
    font-weight: bold;
    overflow: hidden;
    display: flex;
    align-items: center;
  }

  .col-prepost, .col-1d, .col-50d, .col-200d, .col-data, .col-price {
    padding: 0 2px;
    font-weight: bold;
    white-space: nowrap;
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  .stock-header .col-prepost,
  .stock-header .col-1d,
  .stock-header .col-50d,
  .stock-header .col-200d,
  .stock-header .col-data,
  .stock-header .col-price {
    font-weight: normal;
  }

  .col-price {
    padding: 0 1px;
  }
`;

const _STYLE_BLOCK = html`<style>${CARD_STYLES}</style>`;

/** One color per market state, used as price text and prepost background. User-overridable. */
export const DEFAULT_STATE_COLORS: StateColors = {
  UNKNOWN: "var(--secondary-text-color)",
  REGULAR: "var(--primary-text-color)",
  PREPRE: "lightblue",
  PRE: "khaki",
  POST: "plum",
  POSTPOST: "darkslateblue",
};

export const DATA_LABELS = ["PE", "FPE", "Div", "Vol"];

export function headerHtml(dataIndex = 0): TemplateResult {
  return html`<div class="stock-header">
    <div class="col-name"></div>
    <div class="col-prepost">Pre/Post</div>
    <div class="col-1d">1d%</div>
    <div class="col-50d">50d%</div>
    <div class="col-200d">200d%</div>
    <div class="col-data">${DATA_LABELS[dataIndex] ?? "PE"}</div>
    <div class="col-price">Price</div>
  </div>`;
}

export function stockRowHtml(
  stock: StockEntry,
  attrs: YahooFinanceAttributes | null,
  dataIndex: number,
  label: string,
  colors: StateColors = DEFAULT_STATE_COLORS
): TemplateResult {
  const phase = deriveMarketPhase(attrs);

  const stateColor = colors[phase.state];
  const bg1d = phase.isRegular ? stateColor : null;
  const prepostBg = phase.state !== "UNKNOWN" && !phase.isRegular ? stateColor : null;
  const nc = phase.isRegular ? rateColor(phase.activeChangePercent ?? 0) : null;
  const prepostColorValue = phase.isExtended ? rateColor(phase.activeChangePercent ?? 0) : "gray";
  const prepostTextValue = phase.isExtended ? formatRate(phase.activeChangePercent, 2) : "";
  const rowStyle = stock.mark ? `background-color:${stock.mark};` : undefined;

  return html`<div class="stock-row" style=${rowStyle ?? nothing}>
    <div class="col-name" style=${nc ? `color:${nc};` : nothing}>${label}</div>
    <div
      class="col-prepost"
      style="color:${prepostColorValue};${prepostBg ? `background-color:${prepostBg};` : ""}"
    >${prepostTextValue}</div>
    <div
      class="col-1d"
      style="color:${rateColor(attrs?.regularMarketChangePercent ?? 0)};${bg1d ? `background-color:${bg1d};` : ""}"
    >${formatRate(attrs?.regularMarketChangePercent, 2)}</div>
    <div class="col-50d" style="color:${rateColor(attrs?.fiftyDayAverageChangePercent ?? 0, 30)};"
    >${formatRate(attrs?.fiftyDayAverageChangePercent, 1)}</div>
    <div
      class="col-200d"
      style="color:${rateColor(attrs?.twoHundredDayAverageChangePercent ?? 0, 30)};"
    >${formatRate(attrs?.twoHundredDayAverageChangePercent, 1)}</div>
    <div class="col-data">${dataText(attrs, dataIndex)}</div>
    <div class="col-price" style="color:${stateColor};">${formatPrice(phase.activePrice)}</div>
  </div>`;
}

export function stockSectionHtml(
  stocks: StockEntry[],
  states: Record<string, { attributes: YahooFinanceAttributes } | undefined>,
  prefix: string,
  dataIndex: number,
  rowMeta: Map<string, string>,
  sort = false,
  colors: StateColors = DEFAULT_STATE_COLORS
): TemplateResult {
  const entries = stocks.map((stock) => ({
    stock,
    attrs: states[`${prefix}${stock.symbol}`]?.attributes ?? null,
  }));
  if (sort)
    entries.sort(
      (a, b) =>
        (b.attrs?.regularMarketChangePercent ?? 0) - (a.attrs?.regularMarketChangePercent ?? 0)
    );
  return html`${entries.map(({ stock, attrs }) => {
    const label = rowMeta.get(stock.symbol) ?? stock.name;
    return stockRowHtml(stock, attrs, dataIndex, label, colors);
  })}`;
}

export function buildCardView(
  config: CardConfig,
  hass: Hass,
  dataIndex: number,
  rowMeta: Map<string, string>
): CardView {
  const { pinned = [], sorted = [], debug, show_version, height } = config;
  const haCardStyle =
    (height ? `height:${height};min-height:${height};max-height:${height};` : "") +
      (debug || show_version ? "position:relative;" : "") || undefined;
  const states = hass.states;

  if (!pinned.length && !sorted.length) {
    return {
      kind: "error",
      message: "Add at least one stock to pinned or sorted in your card config.",
    };
  }

  const prefix = config.prefix ?? "sensor.yahoofinance_";
  const colors = {
    ...DEFAULT_STATE_COLORS,
    ...Object.fromEntries(
      Object.entries(config.colors ?? {}).map(([k, v]) => [k.toUpperCase(), v])
    ),
  };

  const template = html`
    ${_STYLE_BLOCK}
    <ha-card style=${haCardStyle ?? nothing}>
      ${
        debug
          ? html`<div
            id="yf-debug"
            style="position:absolute;bottom:0;left:0;right:0;z-index:10;background:rgba(0,0,0,0.5);color:#00e676;font-family:monospace;font-size:11px;line-height:1;padding:2px 6px;pointer-events:none;"
          ></div>`
          : nothing
      }
      ${
        show_version
          ? html`<div
            style="position:absolute;top:4px;left:6px;font-family:monospace;font-size:9px;color:#888;pointer-events:none;"
          >v${__CARD_VERSION__}</div>`
          : nothing
      }
      ${headerHtml(dataIndex)}
      ${pinned.length ? stockSectionHtml(pinned, states, prefix, dataIndex, rowMeta, false, colors) : nothing}
      ${sorted.length ? stockSectionHtml(sorted, states, prefix, dataIndex, rowMeta, true, colors) : nothing}
    </ha-card>
  `;

  return { kind: "ok", template };
}
