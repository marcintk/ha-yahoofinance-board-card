/// <reference path="../globals.d.ts" />
import { html, render } from "lit";
import { DebugMetrics } from "./debug.js";
import { resolveIcon } from "./icons.js";
import { buildCardView, CARD_STYLES, DATA_LABELS } from "./render.js";
import { RenderScheduler } from "./scheduler.js";
import { SubscriptionManager } from "./subscription.js";
import type { CardConfig, Hass, StockEntry } from "./types.js";

export { CARD_STYLES };

class YahooFinanceBoardCard extends HTMLElement {
  private readonly _root: ShadowRoot;
  private _config: CardConfig | null;
  private _hass: Hass | null;
  private readonly _scheduler: RenderScheduler;
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
    this._scheduler = new RenderScheduler();
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
    this._scheduler.start({
      fixedRefreshMs: (this._config?.fixed_refresh ?? 60) * 1000,
      onFixedTick: () => {
        if (this._hass && this._config) this._render();
      },
      dataRotateMs: (this._config?.data_rotate_every ?? 60) * 1000,
      onDataTick: () => {
        this._dataIndex = (this._dataIndex + 1) % DATA_LABELS.length;
        if (this._hass && this._config) this._render();
      },
      debugMs: this._config?.debug ? 1000 : 0,
      onDebugTick: () => {
        if (this._hass && this._config) {
          const el = this._root.querySelector("#yf-debug");
          if (el) el.innerHTML = this._debug.tableHtml();
        }
      },
    });
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
        const base = icon ? `${icon} ${s.name}` : s.name;
        const label = s.star ? `${base} ★` : base;
        return [s.symbol, label];
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
    if (this._config?.debug) this._debug.track("filtered");
    const lazyMs = (this._config?.lazy_refresh ?? 1) * 1000;
    this._scheduler.scheduleRender(lazyMs, () => {
      if (this._hass && this._config) this._render();
    });
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
    this._scheduler.cancelPendingRender();
  }

  disconnectedCallback(): void {
    this._scheduler.stop();
    this._clearSubscription();
  }

  private _render(): void {
    try {
      if (!this._config || !this._hass) throw new Error("render called before config/hass set");

      const view = buildCardView(this._config, this._hass, this._dataIndex, this._rowMeta);
      if (view.kind === "error") {
        this._showError(view.message);
        return;
      }

      if (this._config.debug) this._debug.track("rendered");

      render(view.template, this._root);

      if (this._config.debug) {
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
