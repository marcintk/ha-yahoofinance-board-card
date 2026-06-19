import { DebugMetrics } from './debug.js';
import { headerHtml, pinnedHtml, sortedHtml } from './render.js';
import { CARD_STYLES } from './styles.js';
import { SubscriptionManager } from './subscription.js';
import { esc } from './utils.js';

class YahooFinanceBoardCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = null;
    this._hass = null;
    this._fixedTimer = null;
    this._dataTimer = null;
    this._debugTimer = null;
    this._renderTimer = null;
    this._trackedIds = null;
    this._lastBody = null;
    this._dataIndex = 0;
    this._subscription = new SubscriptionManager();
    this._debug = new DebugMetrics();
  }

  setConfig(config) {
    this._config = config;
    this._clearSubscription();
    this._trackedIds = null;
    this._lastBody = null;
    this._dataIndex = 0;
    this._startFixedTimer();
    this._startDataTimer();
    if (this._hass) {
      this._buildTrackedIds();
      this._render();
      this._subscribe();
    }
  }

  set hass(hass) {
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

  _getPrefix() {
    return this._config?.prefix ?? 'sensor.yahoofinance_';
  }

  _buildTrackedIds() {
    const prefix = this._getPrefix();
    const pinned = this._config?.pinned ?? [];
    const sorted = this._config?.sorted ?? [];
    this._trackedIds = new Set([
      ...pinned.map((s) => `${prefix}${s.symbol}`),
      ...sorted.map((s) => `${prefix}${s.symbol}`),
    ]);
  }

  _hasRelevantChange(newHass, prevHass) {
    if (!prevHass || !this._config) return true;
    for (const id of this._trackedIds) {
      if (newHass.states[id] !== prevHass.states[id]) return true;
    }
    return false;
  }

  _scheduleRender() {
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

  _cancelRenderTimer() {
    if (this._renderTimer) {
      clearTimeout(this._renderTimer);
      this._renderTimer = null;
    }
  }

  _subscribe() {
    if (!this._config || !this._hass?.connection) return;
    this._subscription.subscribe(this._hass.connection, this._trackedIds, () => {
      if (this._config?.debug) this._debug.track('events');
      this._scheduleRender();
    });
  }

  _clearSubscription() {
    this._subscription.clear();
    this._cancelRenderTimer();
  }

  _updateDebugOverlay() {
    const overlay = this.shadowRoot?.querySelector('#yf-debug');
    if (overlay) overlay.innerHTML = this._debug.tableHtml();
  }

  _startFixedTimer() {
    this._stopFixedTimer();
    const fixedMs = (this._config?.fixed_refresh ?? 60) * 1000;
    if (fixedMs > 0) {
      this._fixedTimer = setInterval(() => {
        if (this._hass && this._config) this._render();
      }, fixedMs);
    }
    if (this._config?.debug) {
      this._debugTimer = setInterval(() => this._updateDebugOverlay(), 5000);
    }
  }

  _stopFixedTimer() {
    if (this._fixedTimer) {
      clearInterval(this._fixedTimer);
      this._fixedTimer = null;
    }
    if (this._debugTimer) {
      clearInterval(this._debugTimer);
      this._debugTimer = null;
    }
  }

  _startDataTimer() {
    this._stopDataTimer();
    const intervalMs = (this._config?.data_rotate_every ?? 60) * 1000;
    if (intervalMs > 0) {
      this._dataTimer = setInterval(() => {
        this._dataIndex = (this._dataIndex + 1) % 4;
        if (this._hass && this._config) this._render();
      }, intervalMs);
    }
  }

  _stopDataTimer() {
    if (this._dataTimer) {
      clearInterval(this._dataTimer);
      this._dataTimer = null;
    }
  }

  disconnectedCallback() {
    this._stopFixedTimer();
    this._stopDataTimer();
    this._clearSubscription();
  }

  _render() {
    try {
      const { prefix, pinned = [], sorted = [], height, debug } = this._config;
      const states = this._hass.states;

      if (!pinned.length && !sorted.length) {
        this._showError('Add at least one stock to pinned or sorted in your card config.');
        return;
      }

      const resolvedPrefix = prefix ?? 'sensor.yahoofinance_';

      const body =
        headerHtml(this._dataIndex) +
        (pinned.length ? pinnedHtml(pinned, states, resolvedPrefix, this._dataIndex) : '') +
        (sorted.length ? sortedHtml(sorted, states, resolvedPrefix, this._dataIndex) : '');

      if (body === this._lastBody) return;
      this._lastBody = body;

      if (debug) this._debug.track('rendered');
      const heightStyle = height
        ? `height:${esc(String(height))};min-height:${esc(String(height))};max-height:${esc(String(height))};`
        : '';

      this.shadowRoot.innerHTML = `
        <style>${CARD_STYLES}</style>
        <ha-card style="${heightStyle}${debug ? 'position:relative;' : ''}">
          ${debug ? this._debug.html() : ''}
          ${debug ? `<div style="position:absolute;top:2px;left:4px;font-family:monospace;font-size:9px;color:#888;pointer-events:none;">v${__CARD_VERSION__}</div>` : ''}
          ${body}
        </ha-card>
      `;
    } catch (e) {
      this._showError(e.message);
      // biome-ignore lint/suspicious/noConsole: intentional render error logging
      console.error('ha-yahoofinance-board-card render error:', e);
    }
  }

  _showError(msg) {
    this.shadowRoot.innerHTML = `
      <ha-card>
        <div style="padding:12px;color:var(--error-color,red);font-size:13px;">
          <b>ha-yahoofinance-board-card error:</b><br>${esc(msg)}
        </div>
      </ha-card>
    `;
  }

  getCardSize() {
    if (this._config?.height) {
      const px = parseInt(this._config.height, 10);
      if (Number.isFinite(px)) return Math.ceil(px / 50);
    }
    const pinned = this._config?.pinned?.length ?? 0;
    const sorted = this._config?.sorted?.length ?? 0;
    const rows = 1 + pinned + sorted;
    return Math.max(1, Math.ceil((rows * 22) / 50));
  }

  static getStubConfig() {
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
