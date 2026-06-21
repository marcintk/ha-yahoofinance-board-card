import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../src/index.js';

const makeHass = (states = {}) => ({ states });
const makeState = (attrs = {}) => ({ attributes: attrs });

const baseAttrs = {
  marketState: 'REGULAR',
  regularMarketChangePercent: 2.5,
  fiftyDayAverageChangePercent: 5,
  twoHundredDayAverageChangePercent: -3,
  regularMarketPrice: 175.5,
  trailingPE: 30,
  regularMarketVolume: 50000000,
};

const baseConfig = {
  prefix: 'sensor.yahoofinance_',
  pinned: [{ symbol: 'dji', name: 'DOW JONES' }],
  sorted: [{ symbol: 'aapl', name: 'Apple' }],
};

function makeCard() {
  return document.createElement('ha-yahoofinance-board-card');
}

function makeHassWithConnection(states = {}) {
  const unsub = vi.fn();
  const connection = { subscribeEvents: vi.fn().mockResolvedValue(unsub) };
  return { hass: { states, connection }, unsub, connection };
}

describe('YahooFinanceBoardCard', () => {
  describe('registration', () => {
    it('registers as a custom element', () => {
      expect(customElements.get('ha-yahoofinance-board-card')).toBeDefined();
    });

    it('adds entry to window.customCards', () => {
      const entry = window.customCards?.find((c) => c.type === 'ha-yahoofinance-board-card');
      expect(entry).toBeDefined();
      expect(entry.name).toBe('Yahoo Finance Board Card');
    });
  });

  describe('getStubConfig', () => {
    it('returns a valid default config shape', () => {
      const Cls = customElements.get('ha-yahoofinance-board-card');
      const config = Cls.getStubConfig();
      expect(Array.isArray(config.pinned)).toBe(true);
      expect(config.pinned.length).toBeGreaterThan(0);
      expect(Array.isArray(config.sorted)).toBe(true);
      expect(config.sorted.length).toBeGreaterThan(0);
      expect(config.prefix).toBe('sensor.yahoofinance_');
    });
  });

  describe('getCardSize', () => {
    it('calculates size from height string', () => {
      const card = makeCard();
      card._config = { height: '500px' };
      expect(card.getCardSize()).toBe(10);
    });

    it('rounds up fractional rows', () => {
      const card = makeCard();
      card._config = { height: '51px' };
      expect(card.getCardSize()).toBe(2);
    });

    it('calculates size from stock counts when height is absent', () => {
      const card = makeCard();
      card._config = {
        pinned: [{ symbol: 'dji', name: 'DOW' }],
        sorted: [
          { symbol: 'aapl', name: 'Apple' },
          { symbol: 'msft', name: 'MSFT' },
        ],
      };
      // 1 header + 1 pinned + 2 sorted = 4 rows * 22px = 88 / 50 = ceil(1.76) = 2
      expect(card.getCardSize()).toBe(2);
    });

    it('returns at least 1', () => {
      const card = makeCard();
      card._config = { pinned: [], sorted: [] };
      expect(card.getCardSize()).toBe(1);
    });

    it('returns 1 when config is null', () => {
      const card = makeCard();
      expect(card.getCardSize()).toBe(1);
    });

    it('falls back to stock-based size when height is non-numeric', () => {
      const card = makeCard();
      card._config = { height: 'auto', pinned: [{ symbol: 'dji', name: 'DOW' }], sorted: [] };
      const size = card.getCardSize();
      expect(Number.isFinite(size)).toBe(true);
      expect(size).toBeGreaterThanOrEqual(1);
    });
  });

  describe('_buildTrackedIds', () => {
    it('builds tracked IDs from pinned and sorted symbols', () => {
      const card = makeCard();
      card._config = baseConfig;
      card._buildTrackedIds();
      expect(card._trackedIds.has('sensor.yahoofinance_dji')).toBe(true);
      expect(card._trackedIds.has('sensor.yahoofinance_aapl')).toBe(true);
    });

    it('produces empty set when config has no stocks', () => {
      const card = makeCard();
      card._config = {};
      card._buildTrackedIds();
      expect(card._trackedIds.size).toBe(0);
    });

    it('uses default prefix when prefix is not configured', () => {
      const card = makeCard();
      card._config = { pinned: [{ symbol: 'dji', name: 'DOW' }], sorted: [] };
      card._buildTrackedIds();
      expect(card._trackedIds.has('sensor.yahoofinance_dji')).toBe(true);
    });
  });

  describe('setConfig', () => {
    it('stores the provided config', () => {
      const card = makeCard();
      card.setConfig(baseConfig);
      expect(card._config).toBe(baseConfig);
    });

    it('renders immediately when hass is already set', () => {
      const card = makeCard();
      card._hass = makeHass({ 'sensor.yahoofinance_dji': makeState(baseAttrs) });
      card.setConfig(baseConfig);
      expect(card.shadowRoot.innerHTML).toContain('ha-card');
    });

    it('does not render when hass is not yet set', () => {
      const card = makeCard();
      card.setConfig(baseConfig);
      expect(card.shadowRoot.innerHTML).toBe('');
    });

    it('resets _trackedIds to null before rebuild', () => {
      const card = makeCard();
      card._trackedIds = new Set(['old.entity']);
      card.setConfig(baseConfig);
      // After setConfig without hass, _trackedIds stays null
      expect(card._trackedIds).toBeNull();
    });

    it('rebuilds _trackedIds and subscribes when hass is set', async () => {
      const card = makeCard();
      const { hass, connection } = makeHassWithConnection({
        'sensor.yahoofinance_dji': makeState(baseAttrs),
      });
      card._hass = hass;
      card.setConfig(baseConfig);
      await Promise.resolve();
      expect(connection.subscribeEvents).toHaveBeenCalled();
    });
  });

  describe('set hass', () => {
    it('renders on first hass assignment when config is set', () => {
      const card = makeCard();
      card.setConfig(baseConfig);
      card.hass = makeHass({ 'sensor.yahoofinance_dji': makeState(baseAttrs) });
      expect(card.shadowRoot.innerHTML).toContain('ha-card');
    });

    it('does not render when config is not set', () => {
      const card = makeCard();
      card.hass = makeHass({ 'sensor.yahoofinance_dji': makeState(baseAttrs) });
      expect(card.shadowRoot.innerHTML).toBe('');
    });

    it('builds _trackedIds on first assignment', () => {
      const card = makeCard();
      card.setConfig(baseConfig);
      card.hass = makeHass({ 'sensor.yahoofinance_dji': makeState(baseAttrs) });
      expect(card._trackedIds).toBeInstanceOf(Set);
      expect(card._trackedIds.has('sensor.yahoofinance_dji')).toBe(true);
    });

    it('builds empty _trackedIds when no config on first assignment', () => {
      const card = makeCard();
      card.hass = makeHass({});
      expect(card._trackedIds).toBeInstanceOf(Set);
      expect(card._trackedIds.size).toBe(0);
    });

    it('skips render when no relevant entity changed (subscription active)', async () => {
      const card = makeCard();
      const stateObj = makeState(baseAttrs);
      card.setConfig({ ...baseConfig, lazy_refresh: 0 });
      const { hass } = makeHassWithConnection({
        'sensor.yahoofinance_dji': stateObj,
      });
      card.hass = hass;
      await Promise.resolve(); // let subscription resolve
      const renderSpy = vi.spyOn(card, '_render');
      card.hass = { ...hass, states: { 'sensor.yahoofinance_dji': stateObj } };
      expect(renderSpy).not.toHaveBeenCalled();
    });

    it('re-renders when a relevant entity state changes (no subscription)', () => {
      const card = makeCard();
      card.setConfig({ ...baseConfig, lazy_refresh: 0 });
      card.hass = makeHass({ 'sensor.yahoofinance_dji': makeState(baseAttrs) });
      const renderSpy = vi.spyOn(card, '_render');
      card.hass = makeHass({
        'sensor.yahoofinance_dji': makeState({ ...baseAttrs, regularMarketPrice: 180 }),
      });
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('re-subscribes on connection change', async () => {
      const card = makeCard();
      card.setConfig(baseConfig);
      const { hass: hass1 } = makeHassWithConnection({});
      card.hass = hass1;
      await Promise.resolve();
      const { hass: hass2, connection: conn2 } = makeHassWithConnection({
        'sensor.yahoofinance_dji': makeState(baseAttrs),
      });
      card.hass = hass2;
      await Promise.resolve();
      expect(conn2.subscribeEvents).toHaveBeenCalled();
    });

    it('does not schedule render when no entity changed and no subscription', () => {
      const card = makeCard();
      card.setConfig({ ...baseConfig, lazy_refresh: 0 });
      const stateObj = makeState(baseAttrs);
      card.hass = makeHass({ 'sensor.yahoofinance_dji': stateObj });
      const renderSpy = vi.spyOn(card, '_render');
      card.hass = makeHass({ 'sensor.yahoofinance_dji': stateObj });
      expect(renderSpy).not.toHaveBeenCalled();
    });

    it('schedules render when subscription fires for a tracked entity', async () => {
      const card = makeCard();
      card.setConfig({ ...baseConfig, lazy_refresh: 0 });
      const { hass, connection } = makeHassWithConnection({
        'sensor.yahoofinance_dji': makeState(baseAttrs),
      });
      card.hass = hass;
      await Promise.resolve();
      const renderSpy = vi.spyOn(card, '_render');
      const cb = connection.subscribeEvents.mock.calls[0][0];
      cb({ data: { entity_id: 'sensor.yahoofinance_dji' } });
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('tracks events metric when debug:true and subscription fires', async () => {
      const card = makeCard();
      card.setConfig({ ...baseConfig, debug: true, lazy_refresh: 0 });
      const { hass, connection } = makeHassWithConnection({
        'sensor.yahoofinance_dji': makeState(baseAttrs),
      });
      card.hass = hass;
      await Promise.resolve();
      const trackSpy = vi.spyOn(card._debug, 'track');
      const cb = connection.subscribeEvents.mock.calls[0][0];
      cb({ data: { entity_id: 'sensor.yahoofinance_dji' } });
      expect(trackSpy).toHaveBeenCalledWith('events');
    });
  });

  describe('_hasRelevantChange', () => {
    it('returns true when prevHass is null', () => {
      const card = makeCard();
      card._config = baseConfig;
      card._trackedIds = new Set(['sensor.yahoofinance_dji']);
      expect(card._hasRelevantChange(makeHass({}), null)).toBe(true);
    });

    it('returns true when config is null', () => {
      const card = makeCard();
      card._config = null;
      card._trackedIds = new Set(['sensor.yahoofinance_dji']);
      const hass = makeHass({ 'sensor.yahoofinance_dji': makeState(baseAttrs) });
      expect(card._hasRelevantChange(hass, hass)).toBe(true);
    });

    it('returns true when a tracked entity changed', () => {
      const card = makeCard();
      card._config = baseConfig;
      card._trackedIds = new Set(['sensor.yahoofinance_dji']);
      const prev = makeHass({ 'sensor.yahoofinance_dji': makeState(baseAttrs) });
      const next = makeHass({
        'sensor.yahoofinance_dji': makeState({ ...baseAttrs, regularMarketPrice: 200 }),
      });
      expect(card._hasRelevantChange(next, prev)).toBe(true);
    });

    it('returns false when no tracked entity changed', () => {
      const card = makeCard();
      card._config = baseConfig;
      card._trackedIds = new Set(['sensor.yahoofinance_dji']);
      const stateObj = makeState(baseAttrs);
      const hass = makeHass({ 'sensor.yahoofinance_dji': stateObj });
      expect(card._hasRelevantChange(hass, hass)).toBe(false);
    });
  });

  describe('_scheduleRender', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('renders immediately when lazy_refresh is 0', () => {
      const card = makeCard();
      card._config = { ...baseConfig, lazy_refresh: 0 };
      card._hass = makeHass({ 'sensor.yahoofinance_dji': makeState(baseAttrs) });
      card._trackedIds = new Set();
      const renderSpy = vi.spyOn(card, '_render');
      card._scheduleRender();
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('debounces render with lazy_refresh > 0', () => {
      const card = makeCard();
      card._config = { ...baseConfig, lazy_refresh: 1 };
      card._hass = makeHass({ 'sensor.yahoofinance_dji': makeState(baseAttrs) });
      card._trackedIds = new Set();
      const renderSpy = vi.spyOn(card, '_render');
      card._scheduleRender();
      expect(renderSpy).not.toHaveBeenCalled();
      vi.runAllTimers();
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('does not schedule a second timer when one is pending', () => {
      const card = makeCard();
      card._config = { ...baseConfig, lazy_refresh: 1 };
      card._hass = makeHass({});
      card._trackedIds = new Set();
      card._scheduleRender();
      const firstTimer = card._renderTimer;
      card._scheduleRender();
      expect(card._renderTimer).toBe(firstTimer);
    });

    it('clears the timer reference after it fires', () => {
      const card = makeCard();
      card._config = { ...baseConfig, lazy_refresh: 1 };
      card._hass = makeHass({ 'sensor.yahoofinance_dji': makeState(baseAttrs) });
      card._trackedIds = new Set();
      card._scheduleRender();
      vi.runAllTimers();
      expect(card._renderTimer).toBeNull();
    });

    it('does not render in timer callback when hass is null', () => {
      const card = makeCard();
      card._config = { ...baseConfig, lazy_refresh: 1 };
      card._hass = makeHass({});
      card._trackedIds = new Set();
      const renderSpy = vi.spyOn(card, '_render');
      card._scheduleRender();
      card._hass = null;
      vi.runAllTimers();
      expect(renderSpy).not.toHaveBeenCalled();
    });

    it('defaults lazy_refresh to 1 second when not configured', () => {
      const card = makeCard();
      card._config = { ...baseConfig }; // no lazy_refresh key
      card._hass = makeHass({ 'sensor.yahoofinance_dji': makeState(baseAttrs) });
      card._trackedIds = new Set();
      const renderSpy = vi.spyOn(card, '_render');
      card._scheduleRender();
      expect(renderSpy).not.toHaveBeenCalled();
      vi.runAllTimers();
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('tracks filtered metric when debug:true', () => {
      const card = makeCard();
      card._config = { ...baseConfig, debug: true, lazy_refresh: 1 };
      card._hass = makeHass({});
      card._trackedIds = new Set();
      const trackSpy = vi.spyOn(card._debug, 'track');
      card._scheduleRender();
      expect(trackSpy).toHaveBeenCalledWith('filtered');
    });
  });

  describe('_cancelRenderTimer', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('cancels a pending render timer', () => {
      const card = makeCard();
      card._config = { ...baseConfig, lazy_refresh: 1 };
      card._hass = makeHass({});
      card._trackedIds = new Set();
      const renderSpy = vi.spyOn(card, '_render');
      card._scheduleRender();
      card._cancelRenderTimer();
      vi.runAllTimers();
      expect(renderSpy).not.toHaveBeenCalled();
      expect(card._renderTimer).toBeNull();
    });

    it('does not throw when no timer is pending', () => {
      const card = makeCard();
      expect(() => card._cancelRenderTimer()).not.toThrow();
    });
  });

  describe('_startFixedTimer / _stopFixedTimer', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('fires a render on each fixed interval', () => {
      const card = makeCard();
      card._config = { ...baseConfig, fixed_refresh: 1 };
      card._hass = makeHass({ 'sensor.yahoofinance_dji': makeState(baseAttrs) });
      card._trackedIds = new Set();
      const renderSpy = vi.spyOn(card, '_render');
      card._startFixedTimer();
      vi.advanceTimersByTime(1000);
      expect(renderSpy).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(1000);
      expect(renderSpy).toHaveBeenCalledTimes(2);
      card._stopFixedTimer();
    });

    it('does not start a timer when fixed_refresh is 0', () => {
      const card = makeCard();
      card._config = { ...baseConfig, fixed_refresh: 0 };
      card._startFixedTimer();
      expect(card._fixedTimer).toBeNull();
    });

    it('does not fire timer callback when hass is null', () => {
      const card = makeCard();
      card._config = { ...baseConfig, fixed_refresh: 1 };
      card._hass = null;
      card._trackedIds = new Set();
      const renderSpy = vi.spyOn(card, '_render');
      card._startFixedTimer();
      vi.advanceTimersByTime(1000);
      expect(renderSpy).not.toHaveBeenCalled();
      card._stopFixedTimer();
    });

    it('stops the timer on _stopFixedTimer', () => {
      const card = makeCard();
      card._config = { ...baseConfig, fixed_refresh: 1 };
      card._hass = makeHass({ 'sensor.yahoofinance_dji': makeState(baseAttrs) });
      card._trackedIds = new Set();
      const renderSpy = vi.spyOn(card, '_render');
      card._startFixedTimer();
      card._stopFixedTimer();
      vi.advanceTimersByTime(2000);
      expect(renderSpy).not.toHaveBeenCalled();
      expect(card._fixedTimer).toBeNull();
    });

    it('_stopFixedTimer does not throw when no timer is running', () => {
      const card = makeCard();
      expect(() => card._stopFixedTimer()).not.toThrow();
    });

    it('_startFixedTimer stops any existing timer first', () => {
      const card = makeCard();
      card._config = { ...baseConfig, fixed_refresh: 1 };
      card._hass = makeHass({ 'sensor.yahoofinance_dji': makeState(baseAttrs) });
      card._trackedIds = new Set();
      card._startFixedTimer();
      const firstTimer = card._fixedTimer;
      card._startFixedTimer();
      expect(card._fixedTimer).not.toBe(firstTimer);
      card._stopFixedTimer();
    });

    it('starts debug timer when debug:true', () => {
      const card = makeCard();
      card._config = { ...baseConfig, debug: true };
      card._startFixedTimer();
      expect(card._debugTimer).not.toBeNull();
      card._stopFixedTimer();
    });

    it('clears debug timer on _stopFixedTimer', () => {
      const card = makeCard();
      card._config = { ...baseConfig, debug: true };
      card._startFixedTimer();
      card._stopFixedTimer();
      expect(card._debugTimer).toBeNull();
    });

    it('debug timer calls _render', () => {
      const card = makeCard();
      card._config = { ...baseConfig, debug: true };
      card._hass = makeHass({});
      card._trackedIds = new Set();
      const renderSpy = vi.spyOn(card, '_render');
      card._startFixedTimer();
      vi.advanceTimersByTime(5000);
      expect(renderSpy).toHaveBeenCalled();
      card._stopFixedTimer();
    });

    it('debug timer does not call _render when hass is null', () => {
      const card = makeCard();
      card._config = { ...baseConfig, debug: true };
      card._hass = null;
      card._trackedIds = new Set();
      const renderSpy = vi.spyOn(card, '_render');
      card._startFixedTimer();
      vi.advanceTimersByTime(5000);
      expect(renderSpy).not.toHaveBeenCalled();
      card._stopFixedTimer();
    });
  });

  describe('_startDataTimer / _stopDataTimer', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('starts a timer with default interval of 60s', () => {
      const card = makeCard();
      card._config = { ...baseConfig };
      card._startDataTimer();
      expect(card._dataTimer).not.toBeNull();
      card._stopDataTimer();
    });

    it('does not start a timer when data_rotate_every is 0', () => {
      const card = makeCard();
      card._config = { ...baseConfig, data_rotate_every: 0 };
      card._startDataTimer();
      expect(card._dataTimer).toBeNull();
    });

    it('increments _dataIndex and re-renders on each tick', () => {
      const card = makeCard();
      card._config = { ...baseConfig, data_rotate_every: 10 };
      card._hass = makeHass({ 'sensor.yahoofinance_dji': makeState(baseAttrs) });
      card._trackedIds = new Set();
      card._dataIndex = 0;
      const renderSpy = vi.spyOn(card, '_render');
      card._startDataTimer();
      vi.advanceTimersByTime(10_000);
      expect(card._dataIndex).toBe(1);
      expect(renderSpy).toHaveBeenCalled();
      card._stopDataTimer();
    });

    it('wraps _dataIndex back to 0 after 3', () => {
      const card = makeCard();
      card._config = { ...baseConfig, data_rotate_every: 10 };
      card._hass = makeHass({ 'sensor.yahoofinance_dji': makeState(baseAttrs) });
      card._trackedIds = new Set();
      card._dataIndex = 3;
      card._startDataTimer();
      vi.advanceTimersByTime(10_000);
      expect(card._dataIndex).toBe(0);
      card._stopDataTimer();
    });

    it('stops the timer on _stopDataTimer', () => {
      const card = makeCard();
      card._config = { ...baseConfig, data_rotate_every: 10 };
      card._hass = makeHass({});
      card._trackedIds = new Set();
      const renderSpy = vi.spyOn(card, '_render');
      card._startDataTimer();
      card._stopDataTimer();
      vi.advanceTimersByTime(10_000);
      expect(renderSpy).not.toHaveBeenCalled();
      expect(card._dataTimer).toBeNull();
    });

    it('_stopDataTimer does not throw when no timer is running', () => {
      const card = makeCard();
      expect(() => card._stopDataTimer()).not.toThrow();
    });

    it('does not render when hass is null on tick', () => {
      const card = makeCard();
      card._config = { ...baseConfig, data_rotate_every: 10 };
      card._hass = null;
      card._trackedIds = new Set();
      const renderSpy = vi.spyOn(card, '_render');
      card._startDataTimer();
      vi.advanceTimersByTime(10_000);
      expect(renderSpy).not.toHaveBeenCalled();
      card._stopDataTimer();
    });

    it('does not render when config is null on tick', () => {
      const card = makeCard();
      card._config = { ...baseConfig, data_rotate_every: 10 };
      card._hass = makeHass({});
      card._trackedIds = new Set();
      const renderSpy = vi.spyOn(card, '_render');
      card._startDataTimer();
      card._config = null;
      vi.advanceTimersByTime(10_000);
      expect(renderSpy).not.toHaveBeenCalled();
      card._stopDataTimer();
    });

    it('setConfig resets _dataIndex to 0', () => {
      const card = makeCard();
      card._dataIndex = 2;
      card.setConfig(baseConfig);
      expect(card._dataIndex).toBe(0);
    });
  });

  describe('disconnectedCallback', () => {
    it('stops fixed timer and clears subscription', () => {
      const card = makeCard();
      card._config = baseConfig;
      card._fixedTimer = setInterval(() => {}, 1000);
      const clearSpy = vi.spyOn(card._subscription, 'clear');
      card.disconnectedCallback();
      expect(card._fixedTimer).toBeNull();
      expect(clearSpy).toHaveBeenCalled();
    });

    it('stops data timer on disconnect', () => {
      const card = makeCard();
      card._config = { ...baseConfig, data_rotate_every: 10 };
      card._startDataTimer();
      expect(card._dataTimer).not.toBeNull();
      card.disconnectedCallback();
      expect(card._dataTimer).toBeNull();
    });
  });

  describe('_render', () => {
    it('renders ha-card with stock rows when entities exist', () => {
      const card = makeCard();
      card._config = baseConfig;
      card._hass = makeHass({ 'sensor.yahoofinance_dji': makeState(baseAttrs) });
      card._trackedIds = new Set();
      card._render();
      expect(card.shadowRoot.innerHTML).toContain('ha-card');
      expect(card.shadowRoot.innerHTML).toContain('DOW JONES');
    });

    it('renders even when entities are missing (shows - for data)', () => {
      const card = makeCard();
      card._config = baseConfig;
      card._hass = makeHass({});
      card._trackedIds = new Set();
      card._render();
      expect(card.shadowRoot.innerHTML).toContain('ha-card');
    });

    it('shows error when both pinned and sorted are empty', () => {
      const card = makeCard();
      card._config = { pinned: [], sorted: [] };
      card._hass = makeHass({});
      card._trackedIds = new Set();
      card._render();
      expect(card.shadowRoot.innerHTML).toContain('error');
    });

    it('shows error when render throws internally', () => {
      const card = makeCard();
      card._config = baseConfig;
      card._hass = null;
      card._trackedIds = new Set();
      card._render();
      expect(card.shadowRoot.innerHTML).toContain('error');
    });

    it('applies custom height style', () => {
      const card = makeCard();
      card._config = { ...baseConfig, height: '400px' };
      card._hass = makeHass({ 'sensor.yahoofinance_dji': makeState(baseAttrs) });
      card._trackedIds = new Set();
      card._render();
      expect(card.shadowRoot.innerHTML).toContain('400px');
    });

    it('includes position:relative in height style when debug is also enabled', () => {
      const card = makeCard();
      card._config = { ...baseConfig, height: '400px', debug: true };
      card._hass = makeHass({ 'sensor.yahoofinance_dji': makeState(baseAttrs) });
      card._trackedIds = new Set();
      card._render();
      const haCard = card.shadowRoot.querySelector('ha-card');
      expect(haCard?.getAttribute('style')).toContain('400px');
      expect(haCard?.getAttribute('style')).toContain('position:relative');
    });

    it('produces identical DOM on repeated renders with same data', () => {
      const card = makeCard();
      card._config = baseConfig;
      const stateObj = makeState(baseAttrs);
      card._hass = makeHass({ 'sensor.yahoofinance_dji': stateObj });
      card._trackedIds = new Set();
      card._render();
      const firstHtml = card.shadowRoot.innerHTML;
      card._render();
      expect(card.shadowRoot.innerHTML).toBe(firstHtml);
    });

    it('uses _dataIndex to determine data column', () => {
      const card = makeCard();
      card._config = baseConfig;
      card._hass = makeHass({ 'sensor.yahoofinance_dji': makeState(baseAttrs) });
      card._trackedIds = new Set();
      card._dataIndex = 0;
      card._render();
      expect(card.shadowRoot.innerHTML).toContain('ha-card');
    });

    it('does not create rogue elements from < > in height value', () => {
      const card = makeCard();
      card._config = { ...baseConfig, height: '100px<script>' };
      card._hass = makeHass({ 'sensor.yahoofinance_dji': makeState(baseAttrs) });
      card._trackedIds = new Set();
      card._render();
      expect(card.shadowRoot.querySelector('script')).toBeNull();
    });

    it('renders sorted-only config (empty pinned) using default prefix', () => {
      const card = makeCard();
      card._config = { sorted: [{ symbol: 'aapl', name: 'Apple' }] }; // no prefix, no pinned
      card._hass = makeHass({ 'sensor.yahoofinance_aapl': makeState(baseAttrs) });
      card._trackedIds = new Set();
      card._render();
      expect(card.shadowRoot.innerHTML).toContain('Apple');
    });

    it('renders pinned-only config (empty sorted)', () => {
      const card = makeCard();
      card._config = { pinned: [{ symbol: 'dji', name: 'DOW' }], sorted: [] };
      card._hass = makeHass({ 'sensor.yahoofinance_dji': makeState(baseAttrs) });
      card._trackedIds = new Set();
      card._render();
      expect(card.shadowRoot.innerHTML).toContain('DOW');
    });

    it('renders debug overlay and version badge when debug:true', () => {
      const card = makeCard();
      card._config = { ...baseConfig, debug: true };
      card._hass = makeHass({ 'sensor.yahoofinance_dji': makeState(baseAttrs) });
      card._trackedIds = new Set();
      card._render();
      expect(card.shadowRoot.innerHTML).toContain('id="yf-debug"');
      expect(card.shadowRoot.innerHTML).toContain('position:relative');
      expect(card.shadowRoot.textContent).toContain('vtest');
    });

    it('tracks rendered metric when debug:true', () => {
      const card = makeCard();
      card._config = { ...baseConfig, debug: true };
      card._hass = makeHass({ 'sensor.yahoofinance_dji': makeState(baseAttrs) });
      card._trackedIds = new Set();
      const trackSpy = vi.spyOn(card._debug, 'track');
      card._render();
      expect(trackSpy).toHaveBeenCalledWith('rendered');
    });
  });

  describe('debug overlay', () => {
    it('re-rendering updates the debug overlay content', () => {
      const card = makeCard();
      card._config = { ...baseConfig, debug: true };
      card._hass = makeHass({ 'sensor.yahoofinance_dji': makeState(baseAttrs) });
      card._trackedIds = new Set();
      card._render();
      const overlay = card.shadowRoot.querySelector('#yf-debug');
      expect(overlay).not.toBeNull();
      expect(overlay.innerHTML).toContain('events');
    });
  });

  describe('_showError', () => {
    it('renders an error message in ha-card', () => {
      const card = makeCard();
      card._showError('Something went wrong');
      expect(card.shadowRoot.innerHTML).toContain('ha-card');
      expect(card.shadowRoot.innerHTML).toContain('Something went wrong');
    });

    it('escapes the error message', () => {
      const card = makeCard();
      card._showError('<script>evil</script>');
      expect(card.shadowRoot.innerHTML).not.toContain('<script>');
      expect(card.shadowRoot.innerHTML).toContain('&lt;script&gt;');
    });
  });
});
