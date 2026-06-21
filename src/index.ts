import { html, nothing, render } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { DebugMetrics } from './debug.js';
import { headerHtml, pinnedHtml, sortedHtml } from './render.js';
import { CARD_STYLES } from './styles.js';
import { SubscriptionManager } from './subscription.js';
import type { CardConfig, Hass, StockEntry } from './types.js';

const _STYLE_BLOCK = unsafeHTML(`<style>${CARD_STYLES}</style>`);

class YahooFinanceBoardCard extends HTMLElement {
  private readonly _root: ShadowRoot;
  private _config: CardConfig | null;
  private _hass: Hass | null;
  private _fixedTimer: ReturnType<typeof setInterval> | null;
  private _dataTimer: ReturnType<typeof setInterval> | null;
  private _debugTimer: ReturnType<typeof setInterval> | null;
  private _renderTimer: ReturnType<typeof setTimeout> | null;
  private _trackedIds: Set<string> | null;
  private _dataIndex: number;
  private _subscription: SubscriptionManager;
  private _debug: DebugMetrics;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
    this._config = null;
    this._hass = null;
    this._fixedTimer = null;
    this._dataTimer = null;
    this._debugTimer = null;
    this._renderTimer = null;
    this._trackedIds = null;
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

    if (!this._subscription._unsub && this._hasRelevantChange(hass, prevHass) && this._config) {
      this._scheduleRender();
    }
  }

  private _getPrefix(): string {
    return this._config?.prefix ?? 'sensor.yahoofinance_';
  }

  private _buildTrackedIds(): void {
    const prefix = this._getPrefix();
    const pinned: StockEntry[] = this._config?.pinned ?? [];
    const sorted: StockEntry[] = this._config?.sorted ?? [];
    this._trackedIds = new Set([
      ...pinned.map((s) => `${prefix}${s.symbol}`),
      ...sorted.map((s) => `${prefix}${s.symbol}`),
    ]);
  }

  private _hasRelevantChange(newHass: Hass, prevHass: Hass | null): boolean {
    if (!prevHass || !this._config || !this._trackedIds) return true;
    for (const id of this._trackedIds) {
      if (newHass.states[id] !== prevHass.states[id]) return true;
    }
    return false;
  }

  private _scheduleRender(): void {
    if (this._renderTimer) return;
    if (this._config?.debug) this._debug.track('filtered');
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

  private _cancelRenderTimer(): void {
    if (this._renderTimer) {
      clearTimeout(this._renderTimer);
      this._renderTimer = null;
    }
  }

  private _subscribe(): void {
    if (!this._config || !this._hass?.connection) return;
    this._subscription.subscribe(this._hass.connection, this._trackedIds, () => {
      if (this._config?.debug) this._debug.track('events');
      this._scheduleRender();
    });
  }

  private _clearSubscription(): void {
    this._subscription.clear();
    this._cancelRenderTimer();
  }

  private _startFixedTimer(): void {
    this._stopFixedTimer();
    const fixedMs = (this._config?.fixed_refresh ?? 60) * 1000;
    if (fixedMs > 0) {
      this._fixedTimer = setInterval(() => {
        if (this._hass && this._config) this._render();
      }, fixedMs);
    }
    if (this._config?.debug) {
      this._debugTimer = setInterval(() => {
        if (this._hass && this._config) this._render();
      }, 5000);
    }
  }

  private _stopFixedTimer(): void {
    if (this._fixedTimer) {
      clearInterval(this._fixedTimer);
      this._fixedTimer = null;
    }
    if (this._debugTimer) {
      clearInterval(this._debugTimer);
      this._debugTimer = null;
    }
  }

  private _startDataTimer(): void {
    this._stopDataTimer();
    const intervalMs = (this._config?.data_rotate_every ?? 60) * 1000;
    if (intervalMs > 0) {
      this._dataTimer = setInterval(() => {
        this._dataIndex = (this._dataIndex + 1) % 4;
        if (this._hass && this._config) this._render();
      }, intervalMs);
    }
  }

  private _stopDataTimer(): void {
    if (this._dataTimer) {
      clearInterval(this._dataTimer);
      this._dataTimer = null;
    }
  }

  disconnectedCallback(): void {
    this._stopFixedTimer();
    this._stopDataTimer();
    this._clearSubscription();
  }

  private _render(): void {
    try {
      if (!this._config || !this._hass) throw new Error('render called before config/hass set');
      const { prefix, pinned = [], sorted = [], height, debug, icons = 'none' } = this._config;
      const states = this._hass.states;

      if (!pinned.length && !sorted.length) {
        this._showError('Add at least one stock to pinned or sorted in your card config.');
        return;
      }

      const resolvedPrefix = prefix ?? 'sensor.yahoofinance_';

      if (debug) this._debug.track('rendered');

      const haCardStyle = height
        ? `height:${height};min-height:${height};max-height:${height};${debug ? 'position:relative;' : ''}`
        : debug
          ? 'position:relative;'
          : undefined;

      render(
        html`
          ${_STYLE_BLOCK}
          <ha-card style=${haCardStyle ?? nothing}>
            ${debug ? unsafeHTML(this._debug.html()) : nothing}
            ${
              debug
                ? html`<div
                  style="position:absolute;top:2px;left:4px;font-family:monospace;font-size:9px;color:#888;pointer-events:none;"
                >v${__CARD_VERSION__}</div>`
                : nothing
            }
            ${headerHtml(this._dataIndex)}
            ${
              pinned.length
                ? pinnedHtml(pinned, states, resolvedPrefix, this._dataIndex, icons)
                : nothing
            }
            ${
              sorted.length
                ? sortedHtml(sorted, states, resolvedPrefix, this._dataIndex, icons)
                : nothing
            }
          </ha-card>
        `,
        this._root
      );
    } catch (e) {
      this._showError((e as Error).message);
      // biome-ignore lint/suspicious/noConsole: intentional render error logging
      console.error('ha-yahoofinance-board-card render error:', e);
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
      prefix: 'sensor.yahoofinance_',
      pinned: [
        { symbol: 'dji', name: 'DOW JONES' },
        { symbol: 'gspc', name: 'S&P 500' },
        { symbol: 'ixic', name: 'NASDAQ' },
      ],
      sorted: [
        { symbol: 'aapl', name: 'Apple' },
        { symbol: 'msft', name: 'Microsoft' },
        { symbol: 'nvda', name: 'NVidia' },
      ],
    };
  }
}

customElements.define('ha-yahoofinance-board-card', YahooFinanceBoardCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'ha-yahoofinance-board-card',
  name: 'Yahoo Finance Board Card',
  description: 'Compact stock market board powered by Yahoo Finance integration',
  preview: false,
});
