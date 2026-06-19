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
    this._renderTimer = null;
    this._trackedIds = null;
    this._lastBody = null;
    this._subscription = new SubscriptionManager();
  }

  setConfig(config) {
    this._config = config;
    this._clearSubscription();
    this._trackedIds = null;
    this._lastBody = null;
    this._startFixedTimer();
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
    const signal = this._config?.refresh_signal;
    if (signal) this._trackedIds.add(signal);
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
    const lazyMs = (this._config?.lazyRefresh ?? 1) * 1000;
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
      this._scheduleRender();
    });
  }

  _clearSubscription() {
    this._subscription.clear();
    this._cancelRenderTimer();
  }

  _startFixedTimer() {
    this._stopFixedTimer();
    const fixedMs = (this._config?.fixedRefresh ?? 60) * 1000;
    if (fixedMs > 0) {
      this._fixedTimer = setInterval(() => {
        if (this._hass && this._config) this._render();
      }, fixedMs);
    }
  }

  _stopFixedTimer() {
    if (this._fixedTimer) {
      clearInterval(this._fixedTimer);
      this._fixedTimer = null;
    }
  }

  disconnectedCallback() {
    this._stopFixedTimer();
    this._clearSubscription();
  }

  _render() {
    try {
      const { prefix, refresh_signal, pinned = [], sorted = [], height } = this._config;
      const states = this._hass.states;

      if (!pinned.length && !sorted.length) {
        this._showError('Add at least one stock to pinned or sorted in your card config.');
        return;
      }

      const resolvedPrefix = prefix ?? 'sensor.yahoofinance_';
      const signalState = refresh_signal ? (states[refresh_signal]?.state ?? '0') : '0';

      const body =
        headerHtml() +
        (pinned.length ? pinnedHtml(pinned, states, resolvedPrefix, signalState) : '') +
        (sorted.length ? sortedHtml(sorted, states, resolvedPrefix, signalState) : '');

      if (body === this._lastBody) return;
      this._lastBody = body;

      const heightStyle = height
        ? `height:${esc(String(height))};min-height:${esc(String(height))};max-height:${esc(String(height))};`
        : '';

      this.shadowRoot.innerHTML = `
        <style>${CARD_STYLES}</style>
        <ha-card style="${heightStyle}">
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
      refresh_signal: 'sensor.stock_refresh_signal',
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
