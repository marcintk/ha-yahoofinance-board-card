/// <reference path="../node_modules/ha-card-shared/globals.d.ts" />
import { html, nothing, render } from "lit";
import { DebugMetrics } from "./debug.js";
import { resolveIcon } from "./icons.js";
import { DATA_LABELS, DEFAULT_STATE_COLORS, headerHtml, stockSectionHtml } from "./render.js";
import { SubscriptionManager } from "./subscription.js";
import type { CardConfig, Hass, StockEntry } from "./types.js";

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

class YahooFinanceBoardCard extends HTMLElement {
  private readonly _root: ShadowRoot;
  private _config: CardConfig | null;
  private _hass: Hass | null;
  private _fixedTimer: ReturnType<typeof setInterval> | null;
  private _dataTimer: ReturnType<typeof setInterval> | null;
  private _debugTimer: ReturnType<typeof setInterval> | null;
  private _renderTimer: ReturnType<typeof setTimeout> | null;
  private _trackedIds: Set<string> | null;
  private _rowMeta: Map<string, string>;
  private _dataIndex: number;
  private _subscription: SubscriptionManager;
  private _debug: DebugMetrics;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._fixedTimer = null;
    this._dataTimer = null;
    this._debugTimer = null;
    this._renderTimer = null;
    this._trackedIds = null;
    this._rowMeta = new Map();
    this._dataIndex = 0;
    this._subscription = new SubscriptionManager();
    this._debug = new DebugMetrics();
  }

  setConfig(config: CardConfig): void {
    this._config = config;
    this._clearSubscription();
    this._trackedIds = null;
    this._dataIndex = 0;
    this._startFixedTimer();
    this._startDataTimer();
    this._startDebugTimer();
    if (this._hass) {
      this._buildTrackedIds();
      this._render();
      this._subscribe();
    }
  }

  set hass(hass: Hass) {
    const isFirstCall = !this._trackedIds;
    const connectionChanged = !isFirstCall && this._hass?.connection !== hass.connection;
    const prevHass = this._hass;
    this._hass = hass;

    if (isFirstCall || connectionChanged) {
      if (connectionChanged) this._clearSubscription();
      this._buildTrackedIds();
      if (this._config) this._render();
      this._subscribe();
      return;
    }

    if (!this._subscription.active && this._hasRelevantChange(hass, prevHass) && this._config) {
      this._scheduleRender();
    }
  }

  private get _prefix(): string {
    return this._config?.prefix ?? "sensor.yahoofinance_";
  }

  private _buildTrackedIds(): void {
    const prefix = this._prefix;
    const pinned: StockEntry[] = this._config?.pinned ?? [];
    const sorted: StockEntry[] = this._config?.sorted ?? [];
    this._trackedIds = new Set([
      ...pinned.map((s) => `${prefix}${s.symbol}`),
      ...sorted.map((s) => `${prefix}${s.symbol}`),
    ]);
    const iconsMode = this._config?.icons ?? "none";
    const allStocks = [...pinned, ...sorted];
    this._rowMeta = new Map(
      allStocks.map((s) => {
        const icon = resolveIcon(s.symbol, s.icon, iconsMode);
        return [s.symbol, icon ? `${icon} ${s.name}` : s.name];
      })
    );
  }

  private _hasRelevantChange(newHass: Hass, prevHass: Hass | null): boolean {
    if (!prevHass || !this._trackedIds) return true;
    for (const id of this._trackedIds) {
      if (newHass.states[id] !== prevHass.states[id]) return true;
    }
    return false;
  }

  private _scheduleRender(): void {
    if (this._renderTimer) return;
    if (this._config?.debug) this._debug.track("filtered");
    const lazyMs = (this._config?.lazy_refresh ?? 1) * 1000;
    if (lazyMs === 0) {
      this._render();
      return;
    }
    this._renderTimer = setTimeout(() => {
      this._renderTimer = null;
      if (this._hass && this._config) this._render();
    }, lazyMs);
  }

  private _subscribe(): void {
    if (!this._config || !this._hass?.connection) return;
    this._subscription.subscribe(this._hass.connection, this._trackedIds, () => {
      if (this._config?.debug) this._debug.track("events");
      this._scheduleRender();
    });
  }

  private _clearSubscription(): void {
    this._subscription.clear();
    if (this._renderTimer) {
      clearTimeout(this._renderTimer);
      this._renderTimer = null;
    }
  }

  private _resetInterval(
    handle: ReturnType<typeof setInterval> | null,
    ms: number,
    fn?: () => void
  ): ReturnType<typeof setInterval> | null {
    if (handle) clearInterval(handle);
    return ms > 0 && fn ? setInterval(fn, ms) : null;
  }

  private _startFixedTimer(): void {
    const ms = (this._config?.fixed_refresh ?? 60) * 1000;
    this._fixedTimer = this._resetInterval(this._fixedTimer, ms, () => {
      if (this._hass && this._config) this._render();
    });
  }

  private _startDebugTimer(): void {
    const ms = this._config?.debug ? 1000 : 0;
    this._debugTimer = this._resetInterval(this._debugTimer, ms, () => {
      if (this._hass && this._config) {
        const el = this._root.querySelector("#yf-debug");
        if (el) el.innerHTML = this._debug.tableHtml();
      }
    });
  }

  private _startDataTimer(): void {
    const ms = (this._config?.data_rotate_every ?? 60) * 1000;
    this._dataTimer = this._resetInterval(this._dataTimer, ms, () => {
      this._dataIndex = (this._dataIndex + 1) % DATA_LABELS.length;
      if (this._hass && this._config) this._render();
    });
  }

  disconnectedCallback(): void {
    this._fixedTimer = this._resetInterval(this._fixedTimer, 0);
    this._dataTimer = this._resetInterval(this._dataTimer, 0);
    this._debugTimer = this._resetInterval(this._debugTimer, 0);
    this._clearSubscription();
  }

  private _render(): void {
    try {
      if (!this._config || !this._hass) throw new Error("render called before config/hass set");
      const { pinned = [], sorted = [], debug, show_version, height } = this._config;
      const haCardStyle =
        (height ? `height:${height};min-height:${height};max-height:${height};` : "") +
          (debug || show_version ? "position:relative;" : "") || undefined;
      const states = this._hass.states;

      if (!pinned.length && !sorted.length) {
        this._showError("Add at least one stock to pinned or sorted in your card config.");
        return;
      }

      const prefix = this._prefix;
      const rowMeta = this._rowMeta;
      const colors = {
        ...DEFAULT_STATE_COLORS,
        ...Object.fromEntries(
          Object.entries(this._config.colors ?? {}).map(([k, v]) => [k.toUpperCase(), v])
        ),
      };

      if (debug) this._debug.track("rendered");

      render(
        html`
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
                  style="position:absolute;top:2px;left:4px;font-family:monospace;font-size:9px;color:#888;pointer-events:none;"
                >v${__CARD_VERSION__}</div>`
                : nothing
            }
            ${headerHtml(this._dataIndex)}
            ${
              pinned.length
                ? stockSectionHtml(pinned, states, prefix, this._dataIndex, rowMeta, false, colors)
                : nothing
            }
            ${
              sorted.length
                ? stockSectionHtml(sorted, states, prefix, this._dataIndex, rowMeta, true, colors)
                : nothing
            }
          </ha-card>
        `,
        this._root
      );
      if (debug) {
        // biome-ignore lint/style/noNonNullAssertion: Lit just rendered #yf-debug above
        this._root.querySelector("#yf-debug")!.innerHTML = this._debug.tableHtml();
      }
    } catch (e) {
      this._showError((e as Error).message);
      // biome-ignore lint/suspicious/noConsole: intentional render error logging
      console.error("ha-yahoofinance-board-card render error:", e);
    }
  }

  private _showError(msg: string): void {
    render(
      html`<ha-card>
        <div style="padding:12px;color:var(--error-color,red);font-size:13px;">
          <b>ha-yahoofinance-board-card error:</b><br />${msg}
        </div>
      </ha-card>`,
      this._root
    );
  }

  getCardSize(): number {
    if (this._config?.height) {
      const px = parseInt(String(this._config.height), 10);
      if (Number.isFinite(px)) return Math.ceil(px / 50);
    }
    const pinned = this._config?.pinned?.length ?? 0;
    const sorted = this._config?.sorted?.length ?? 0;
    const rows = 1 + pinned + sorted;
    return Math.max(1, Math.ceil((rows * 22) / 50));
  }

  static getStubConfig(): CardConfig {
    return {
      prefix: "sensor.yahoofinance_",
      pinned: [
        { symbol: "dji", name: "DOW JONES" },
        { symbol: "gspc", name: "S&P 500" },
        { symbol: "ixic", name: "NASDAQ" },
      ],
      sorted: [
        { symbol: "aapl", name: "Apple" },
        { symbol: "msft", name: "Microsoft" },
        { symbol: "nvda", name: "NVidia" },
      ],
    };
  }
}

customElements.define("ha-yahoofinance-board-card", YahooFinanceBoardCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "ha-yahoofinance-board-card",
  name: "Yahoo Finance Board Card",
  description: "Compact stock market board powered by Yahoo Finance integration",
  preview: false,
});
