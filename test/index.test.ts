import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index.js";

const makeHass = (states = {}) => ({ states });
const makeState = (attrs = {}) => ({ attributes: attrs });

const baseAttrs = {
  marketState: "REGULAR",
  regularMarketChangePercent: 2.5,
  fiftyDayAverageChangePercent: 5,
  twoHundredDayAverageChangePercent: -3,
  regularMarketPrice: 175.5,
  trailingPE: 30,
  regularMarketVolume: 50000000,
};

const baseConfig = {
  prefix: "sensor.yahoofinance_",
  pinned: [{ symbol: "dji", name: "DOW JONES" }],
  sorted: [{ symbol: "aapl", name: "Apple" }],
};

function makeCard() {
  return document.createElement("ha-yahoofinance-board-card");
}

function makeHassWithConnection(states = {}) {
  const unsub = vi.fn();
  const connection = { subscribeEvents: vi.fn().mockResolvedValue(unsub) };
  return { hass: { states, connection }, unsub, connection };
}

describe("YahooFinanceBoardCard", () => {
  describe("registration", () => {
    it("registers as a custom element", () => {
      expect(customElements.get("ha-yahoofinance-board-card")).toBeDefined();
    });

    it("adds entry to window.customCards", () => {
      const entry = window.customCards?.find((c) => c.type === "ha-yahoofinance-board-card");
      expect(entry).toBeDefined();
      expect(entry.name).toBe("Yahoo Finance Board Card");
    });
  });

  describe("getStubConfig", () => {
    it("returns a valid default config shape", () => {
      const Cls = customElements.get("ha-yahoofinance-board-card");
      const config = Cls.getStubConfig();
      expect(Array.isArray(config.pinned)).toBe(true);
      expect(config.pinned.length).toBeGreaterThan(0);
      expect(Array.isArray(config.sorted)).toBe(true);
      expect(config.sorted.length).toBeGreaterThan(0);
      expect(config.prefix).toBe("sensor.yahoofinance_");
    });
  });

  describe("getCardSize", () => {
    it("calculates size from height string", () => {
      const card = makeCard();
      card._config = { height: "500px" };
      expect(card.getCardSize()).toBe(10);
    });

    it("rounds up fractional rows", () => {
      const card = makeCard();
      card._config = { height: "51px" };
      expect(card.getCardSize()).toBe(2);
    });

    it("calculates size from stock counts when height is absent", () => {
      const card = makeCard();
      card._config = {
        pinned: [{ symbol: "dji", name: "DOW" }],
        sorted: [
          { symbol: "aapl", name: "Apple" },
          { symbol: "msft", name: "MSFT" },
        ],
      };
      // 1 header + 1 pinned + 2 sorted = 4 rows * 22px = 88 / 50 = ceil(1.76) = 2
      expect(card.getCardSize()).toBe(2);
    });

    it("returns at least 1", () => {
      const card = makeCard();
      card._config = { pinned: [], sorted: [] };
      expect(card.getCardSize()).toBe(1);
    });

    it("returns 1 when config is null", () => {
      const card = makeCard();
      expect(card.getCardSize()).toBe(1);
    });

    it("falls back to stock-based size when height is non-numeric", () => {
      const card = makeCard();
      card._config = { height: "auto", pinned: [{ symbol: "dji", name: "DOW" }], sorted: [] };
      const size = card.getCardSize();
      expect(Number.isFinite(size)).toBe(true);
      expect(size).toBeGreaterThanOrEqual(1);
    });
  });

  describe("_buildTrackedIds", () => {
    it("builds tracked IDs from pinned and sorted symbols", () => {
      const card = makeCard();
      card._config = baseConfig;
      card._buildTrackedIds();
      expect(card._trackedIds.has("sensor.yahoofinance_dji")).toBe(true);
      expect(card._trackedIds.has("sensor.yahoofinance_aapl")).toBe(true);
    });

    it("produces empty set when config has no stocks", () => {
      const card = makeCard();
      card._config = {};
      card._buildTrackedIds();
      expect(card._trackedIds.size).toBe(0);
    });

    it("uses default prefix when prefix is not configured", () => {
      const card = makeCard();
      card._config = { pinned: [{ symbol: "dji", name: "DOW" }], sorted: [] };
      card._buildTrackedIds();
      expect(card._trackedIds.has("sensor.yahoofinance_dji")).toBe(true);
    });

    it("builds _rowMeta with display labels for all stocks", () => {
      const card = makeCard();
      card._config = { ...baseConfig, icons: "none" };
      card._buildTrackedIds();
      expect(card._rowMeta.get("dji")).toBe("DOW JONES");
      expect(card._rowMeta.get("aapl")).toBe("Apple");
    });

    it("includes auto-detected icon prefix in _rowMeta when icons is auto", () => {
      const card = makeCard();
      card._config = {
        prefix: "sensor.yahoofinance_",
        pinned: [{ symbol: "dji", name: "DOW JONES" }],
        icons: "auto",
      };
      card._buildTrackedIds();
      expect(card._rowMeta.get("dji")).toBe("△ DOW JONES");
    });

    it("appends a star suffix in _rowMeta when the stock entry has star: true", () => {
      const card = makeCard();
      card._config = {
        prefix: "sensor.yahoofinance_",
        pinned: [],
        sorted: [{ symbol: "nvda", name: "NVidia", star: true }],
        icons: "none",
      };
      card._buildTrackedIds();
      expect(card._rowMeta.get("nvda")).toBe("NVidia ★");
    });
  });

  describe("setConfig", () => {
    it("stores the provided config", () => {
      const card = makeCard();
      card.setConfig(baseConfig);
      expect(card._config).toBe(baseConfig);
    });

    it("renders immediately when hass is already set", () => {
      const card = makeCard();
      card._hass = makeHass({ "sensor.yahoofinance_dji": makeState(baseAttrs) });
      card.setConfig(baseConfig);
      expect(card.shadowRoot.innerHTML).toContain("ha-card");
    });

    it("does not render when hass is not yet set", () => {
      const card = makeCard();
      card.setConfig(baseConfig);
      expect(card.shadowRoot.innerHTML).toBe("");
    });

    it("resets _trackedIds to null before rebuild", () => {
      const card = makeCard();
      card._trackedIds = new Set(["old.entity"]);
      card.setConfig(baseConfig);
      // After setConfig without hass, _trackedIds stays null
      expect(card._trackedIds).toBeNull();
    });

    it("rebuilds _trackedIds and subscribes when hass is set", async () => {
      const card = makeCard();
      const { hass, connection } = makeHassWithConnection({
        "sensor.yahoofinance_dji": makeState(baseAttrs),
      });
      card._hass = hass;
      card.setConfig(baseConfig);
      await Promise.resolve();
      expect(connection.subscribeEvents).toHaveBeenCalled();
    });
  });

  describe("state colors", () => {
    it("renders default theme colors for REGULAR state", () => {
      const card = makeCard();
      card.setConfig(baseConfig);
      card.hass = makeHass({ "sensor.yahoofinance_dji": makeState(baseAttrs) });
      expect(card.shadowRoot.innerHTML).toContain("var(--primary-text-color)");
    });

    it("applies user color override from config", () => {
      const card = makeCard();
      card.setConfig({ ...baseConfig, colors: { REGULAR: "rebeccapurple" } });
      card.hass = makeHass({ "sensor.yahoofinance_dji": makeState(baseAttrs) });
      const html = card.shadowRoot.innerHTML;
      expect(html).toContain("rebeccapurple");
      // unspecified states keep their defaults
      expect(html).toContain("var(--secondary-text-color)");
    });

    it("accepts lowercase color keys from config", () => {
      const card = makeCard();
      // ponytail: cast needed — runtime normalises to uppercase, type expects uppercase
      card.setConfig({ ...baseConfig, colors: { regular: "goldenrod" } as never });
      card.hass = makeHass({ "sensor.yahoofinance_dji": makeState(baseAttrs) });
      expect(card.shadowRoot.innerHTML).toContain("goldenrod");
    });
  });

  describe("set hass", () => {
    it("renders on first hass assignment when config is set", () => {
      const card = makeCard();
      card.setConfig(baseConfig);
      card.hass = makeHass({ "sensor.yahoofinance_dji": makeState(baseAttrs) });
      expect(card.shadowRoot.innerHTML).toContain("ha-card");
    });

    it("does not render when config is not set", () => {
      const card = makeCard();
      card.hass = makeHass({ "sensor.yahoofinance_dji": makeState(baseAttrs) });
      expect(card.shadowRoot.innerHTML).toBe("");
    });

    it("builds _trackedIds on first assignment", () => {
      const card = makeCard();
      card.setConfig(baseConfig);
      card.hass = makeHass({ "sensor.yahoofinance_dji": makeState(baseAttrs) });
      expect(card._trackedIds).toBeInstanceOf(Set);
      expect(card._trackedIds.has("sensor.yahoofinance_dji")).toBe(true);
    });

    it("builds empty _trackedIds when no config on first assignment", () => {
      const card = makeCard();
      card.hass = makeHass({});
      expect(card._trackedIds).toBeInstanceOf(Set);
      expect(card._trackedIds.size).toBe(0);
    });

    it("skips render when no relevant entity changed (subscription active)", async () => {
      const card = makeCard();
      const stateObj = makeState(baseAttrs);
      card.setConfig({ ...baseConfig, lazy_refresh: 0 });
      const { hass } = makeHassWithConnection({
        "sensor.yahoofinance_dji": stateObj,
      });
      card.hass = hass;
      await Promise.resolve(); // let subscription resolve
      const renderSpy = vi.spyOn(card, "_render");
      card.hass = { ...hass, states: { "sensor.yahoofinance_dji": stateObj } };
      expect(renderSpy).not.toHaveBeenCalled();
    });

    it("re-renders when a relevant entity state changes (no subscription)", () => {
      const card = makeCard();
      card.setConfig({ ...baseConfig, lazy_refresh: 0 });
      card.hass = makeHass({ "sensor.yahoofinance_dji": makeState(baseAttrs) });
      const renderSpy = vi.spyOn(card, "_render");
      card.hass = makeHass({
        "sensor.yahoofinance_dji": makeState({ ...baseAttrs, regularMarketPrice: 180 }),
      });
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it("re-subscribes on connection change", async () => {
      const card = makeCard();
      card.setConfig(baseConfig);
      const { hass: hass1 } = makeHassWithConnection({});
      card.hass = hass1;
      await Promise.resolve();
      const { hass: hass2, connection: conn2 } = makeHassWithConnection({
        "sensor.yahoofinance_dji": makeState(baseAttrs),
      });
      card.hass = hass2;
      await Promise.resolve();
      expect(conn2.subscribeEvents).toHaveBeenCalled();
    });

    it("does not schedule render when no entity changed and no subscription", () => {
      const card = makeCard();
      card.setConfig({ ...baseConfig, lazy_refresh: 0 });
      const stateObj = makeState(baseAttrs);
      card.hass = makeHass({ "sensor.yahoofinance_dji": stateObj });
      const renderSpy = vi.spyOn(card, "_render");
      card.hass = makeHass({ "sensor.yahoofinance_dji": stateObj });
      expect(renderSpy).not.toHaveBeenCalled();
    });

    it("schedules render when subscription fires for a tracked entity", async () => {
      const card = makeCard();
      card.setConfig({ ...baseConfig, lazy_refresh: 0 });
      const { hass, connection } = makeHassWithConnection({
        "sensor.yahoofinance_dji": makeState(baseAttrs),
      });
      card.hass = hass;
      await Promise.resolve();
      const renderSpy = vi.spyOn(card, "_render");
      const cb = connection.subscribeEvents.mock.calls[0][0];
      cb({ data: { entity_id: "sensor.yahoofinance_dji" } });
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it("tracks events metric when debug:true and subscription fires", async () => {
      const card = makeCard();
      card.setConfig({ ...baseConfig, debug: true, lazy_refresh: 0 });
      const { hass, connection } = makeHassWithConnection({
        "sensor.yahoofinance_dji": makeState(baseAttrs),
      });
      card.hass = hass;
      await Promise.resolve();
      const trackSpy = vi.spyOn(card._debug, "track");
      const cb = connection.subscribeEvents.mock.calls[0][0];
      cb({ data: { entity_id: "sensor.yahoofinance_dji" } });
      expect(trackSpy).toHaveBeenCalledWith("events");
    });
  });

  describe("_hasRelevantChange", () => {
    it("returns true when prevHass is null", () => {
      const card = makeCard();
      card._config = baseConfig;
      card._trackedIds = new Set(["sensor.yahoofinance_dji"]);
      expect(card._hasRelevantChange(makeHass({}), null)).toBe(true);
    });

    it("returns true when a tracked entity changed", () => {
      const card = makeCard();
      card._config = baseConfig;
      card._trackedIds = new Set(["sensor.yahoofinance_dji"]);
      const prev = makeHass({ "sensor.yahoofinance_dji": makeState(baseAttrs) });
      const next = makeHass({
        "sensor.yahoofinance_dji": makeState({ ...baseAttrs, regularMarketPrice: 200 }),
      });
      expect(card._hasRelevantChange(next, prev)).toBe(true);
    });

    it("returns false when no tracked entity changed", () => {
      const card = makeCard();
      card._config = baseConfig;
      card._trackedIds = new Set(["sensor.yahoofinance_dji"]);
      const stateObj = makeState(baseAttrs);
      const hass = makeHass({ "sensor.yahoofinance_dji": stateObj });
      expect(card._hasRelevantChange(hass, hass)).toBe(false);
    });
  });

  describe("_scheduleRender", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("renders immediately when lazy_refresh is 0", () => {
      const card = makeCard();
      card._config = { ...baseConfig, lazy_refresh: 0 };
      card._hass = makeHass({ "sensor.yahoofinance_dji": makeState(baseAttrs) });
      card._trackedIds = new Set();
      const renderSpy = vi.spyOn(card, "_render");
      card._scheduleRender();
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it("debounces render with lazy_refresh > 0", () => {
      const card = makeCard();
      card._config = { ...baseConfig, lazy_refresh: 1 };
      card._hass = makeHass({ "sensor.yahoofinance_dji": makeState(baseAttrs) });
      card._trackedIds = new Set();
      const renderSpy = vi.spyOn(card, "_render");
      card._scheduleRender();
      expect(renderSpy).not.toHaveBeenCalled();
      vi.runAllTimers();
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it("does not render in timer callback when hass is null", () => {
      const card = makeCard();
      card._config = { ...baseConfig, lazy_refresh: 1 };
      card._hass = makeHass({});
      card._trackedIds = new Set();
      const renderSpy = vi.spyOn(card, "_render");
      card._scheduleRender();
      card._hass = null;
      vi.runAllTimers();
      expect(renderSpy).not.toHaveBeenCalled();
    });

    it("defaults lazy_refresh to 1 second when not configured", () => {
      const card = makeCard();
      card._config = { ...baseConfig }; // no lazy_refresh key
      card._hass = makeHass({ "sensor.yahoofinance_dji": makeState(baseAttrs) });
      card._trackedIds = new Set();
      const renderSpy = vi.spyOn(card, "_render");
      card._scheduleRender();
      expect(renderSpy).not.toHaveBeenCalled();
      vi.runAllTimers();
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it("tracks filtered metric when debug:true", () => {
      const card = makeCard();
      card._config = { ...baseConfig, debug: true, lazy_refresh: 1 };
      card._hass = makeHass({});
      card._trackedIds = new Set();
      const trackSpy = vi.spyOn(card._debug, "track");
      card._scheduleRender();
      expect(trackSpy).toHaveBeenCalledWith("filtered");
    });
  });

  describe("_clearSubscription (timer cancellation)", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("cancels a pending render timer", () => {
      const card = makeCard();
      card._config = { ...baseConfig, lazy_refresh: 1 };
      card._hass = makeHass({});
      card._trackedIds = new Set();
      const renderSpy = vi.spyOn(card, "_render");
      card._scheduleRender();
      card._clearSubscription();
      vi.runAllTimers();
      expect(renderSpy).not.toHaveBeenCalled();
    });

    it("does not throw when no timer is pending", () => {
      const card = makeCard();
      expect(() => card._clearSubscription()).not.toThrow();
    });
  });

  describe("fixed refresh timer (via setConfig/RenderScheduler)", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("fires a render on each fixed interval", () => {
      const card = makeCard();
      card._hass = makeHass({ "sensor.yahoofinance_dji": makeState(baseAttrs) });
      card.setConfig({ ...baseConfig, fixed_refresh: 1 });
      const renderSpy = vi.spyOn(card, "_render");
      vi.advanceTimersByTime(1000);
      expect(renderSpy).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(1000);
      expect(renderSpy).toHaveBeenCalledTimes(2);
      card.disconnectedCallback();
    });

    it("does not fire renders when fixed_refresh is 0", () => {
      const card = makeCard();
      card._hass = makeHass({ "sensor.yahoofinance_dji": makeState(baseAttrs) });
      card.setConfig({ ...baseConfig, fixed_refresh: 0 });
      const renderSpy = vi.spyOn(card, "_render");
      vi.advanceTimersByTime(5000);
      expect(renderSpy).not.toHaveBeenCalled();
      card.disconnectedCallback();
    });

    it("does not fire timer callback when hass is null", () => {
      const card = makeCard();
      card.setConfig({ ...baseConfig, fixed_refresh: 1 });
      const renderSpy = vi.spyOn(card, "_render");
      vi.advanceTimersByTime(1000);
      expect(renderSpy).not.toHaveBeenCalled();
      card.disconnectedCallback();
    });

    it("does not fire timer callback when config is cleared before tick", () => {
      const card = makeCard();
      card._hass = makeHass({ "sensor.yahoofinance_dji": makeState(baseAttrs) });
      card.setConfig({ ...baseConfig, fixed_refresh: 1 });
      const renderSpy = vi.spyOn(card, "_render");
      card._config = null;
      vi.advanceTimersByTime(1000);
      expect(renderSpy).not.toHaveBeenCalled();
      card.disconnectedCallback();
    });

    it("stops the timer when disconnected", () => {
      const card = makeCard();
      card._hass = makeHass({ "sensor.yahoofinance_dji": makeState(baseAttrs) });
      card.setConfig({ ...baseConfig, fixed_refresh: 1 });
      const renderSpy = vi.spyOn(card, "_render");
      card.disconnectedCallback();
      vi.advanceTimersByTime(2000);
      expect(renderSpy).not.toHaveBeenCalled();
    });
  });

  describe("debug overlay timer (via setConfig/RenderScheduler)", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("patches #yf-debug innerHTML without invoking _render", () => {
      const card = makeCard();
      card._hass = makeHass({ "sensor.yahoofinance_dji": makeState(baseAttrs) });
      card.setConfig({ ...baseConfig, debug: true });
      const renderSpy = vi.spyOn(card, "_render");
      const tableSpy = vi.spyOn(card._debug, "tableHtml");
      vi.advanceTimersByTime(1000);
      expect(renderSpy).not.toHaveBeenCalled();
      expect(tableSpy).toHaveBeenCalled();
      expect(card.shadowRoot.querySelector("#yf-debug")).not.toBeNull();
      card.disconnectedCallback();
    });

    it("skips overlay update when hass is null", () => {
      const card = makeCard();
      card.setConfig({ ...baseConfig, debug: true });
      const tableSpy = vi.spyOn(card._debug, "tableHtml");
      vi.advanceTimersByTime(1000);
      expect(tableSpy).not.toHaveBeenCalled();
      card.disconnectedCallback();
    });

    it("skips overlay update when config is cleared before tick", () => {
      const card = makeCard();
      card._hass = makeHass({ "sensor.yahoofinance_dji": makeState(baseAttrs) });
      card.setConfig({ ...baseConfig, debug: true });
      const tableSpy = vi.spyOn(card._debug, "tableHtml");
      card._config = null;
      vi.advanceTimersByTime(1000);
      expect(tableSpy).not.toHaveBeenCalled();
      card.disconnectedCallback();
    });

    it("skips innerHTML patch when #yf-debug is not in DOM", () => {
      const card = makeCard();
      card._hass = makeHass({});
      card.setConfig({ ...baseConfig, debug: true, pinned: [], sorted: [] });
      vi.advanceTimersByTime(1000);
      expect(card.shadowRoot.querySelector("#yf-debug")).toBeNull();
      card.disconnectedCallback();
    });

    it("does not start a debug timer when debug is not enabled", () => {
      const card = makeCard();
      card._hass = makeHass({ "sensor.yahoofinance_dji": makeState(baseAttrs) });
      card.setConfig(baseConfig);
      const tableSpy = vi.spyOn(card._debug, "tableHtml");
      vi.advanceTimersByTime(5000);
      expect(tableSpy).not.toHaveBeenCalled();
      card.disconnectedCallback();
    });
  });

  describe("data rotation timer (via setConfig/RenderScheduler)", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("increments _dataIndex and re-renders on each tick", () => {
      const card = makeCard();
      card._hass = makeHass({ "sensor.yahoofinance_dji": makeState(baseAttrs) });
      card.setConfig({ ...baseConfig, data_rotate_every: 10 });
      card._dataIndex = 0;
      const renderSpy = vi.spyOn(card, "_render");
      vi.advanceTimersByTime(10_000);
      expect(card._dataIndex).toBe(1);
      expect(renderSpy).toHaveBeenCalled();
      card.disconnectedCallback();
    });

    it("wraps _dataIndex back to 0 after 3", () => {
      const card = makeCard();
      card._hass = makeHass({ "sensor.yahoofinance_dji": makeState(baseAttrs) });
      card.setConfig({ ...baseConfig, data_rotate_every: 10 });
      card._dataIndex = 3;
      vi.advanceTimersByTime(10_000);
      expect(card._dataIndex).toBe(0);
      card.disconnectedCallback();
    });

    it("does not render when hass is null on tick", () => {
      const card = makeCard();
      card.setConfig({ ...baseConfig, data_rotate_every: 10 });
      const renderSpy = vi.spyOn(card, "_render");
      vi.advanceTimersByTime(10_000);
      expect(renderSpy).not.toHaveBeenCalled();
      card.disconnectedCallback();
    });

    it("does not render when config is null on tick", () => {
      const card = makeCard();
      card._hass = makeHass({});
      card.setConfig({ ...baseConfig, data_rotate_every: 10 });
      const renderSpy = vi.spyOn(card, "_render");
      card._config = null;
      vi.advanceTimersByTime(10_000);
      expect(renderSpy).not.toHaveBeenCalled();
      card.disconnectedCallback();
    });

    it("does not start a timer when data_rotate_every is 0", () => {
      const card = makeCard();
      card._hass = makeHass({ "sensor.yahoofinance_dji": makeState(baseAttrs) });
      card.setConfig({ ...baseConfig, data_rotate_every: 0 });
      card._dataIndex = 0;
      vi.advanceTimersByTime(60_000);
      expect(card._dataIndex).toBe(0);
      card.disconnectedCallback();
    });

    it("setConfig resets _dataIndex to 0", () => {
      const card = makeCard();
      card._dataIndex = 2;
      card.setConfig(baseConfig);
      expect(card._dataIndex).toBe(0);
      card.disconnectedCallback();
    });
  });

  describe("disconnectedCallback", () => {
    it("clears the subscription", () => {
      const card = makeCard();
      card._config = baseConfig;
      const clearSpy = vi.spyOn(card._subscription, "clear");
      card.disconnectedCallback();
      expect(clearSpy).toHaveBeenCalled();
    });

    it("stops all scheduler timers so nothing fires afterwards", () => {
      vi.useFakeTimers();
      const card = makeCard();
      card._hass = makeHass({ "sensor.yahoofinance_dji": makeState(baseAttrs) });
      card.setConfig({
        ...baseConfig,
        fixed_refresh: 1,
        data_rotate_every: 1,
        debug: true,
      });
      card.disconnectedCallback();
      const renderSpy = vi.spyOn(card, "_render");
      const tableSpy = vi.spyOn(card._debug, "tableHtml");
      vi.advanceTimersByTime(5000);
      expect(renderSpy).not.toHaveBeenCalled();
      expect(tableSpy).not.toHaveBeenCalled();
      vi.useRealTimers();
    });

    it("cancels a pending render timer on disconnect", () => {
      vi.useFakeTimers();
      const card = makeCard();
      card.setConfig({ ...baseConfig, lazy_refresh: 10 });
      card.hass = makeHass({ "sensor.yahoofinance_dji": makeState(baseAttrs) });
      const renderSpy = vi.spyOn(card, "_render");
      card._scheduleRender();
      card.disconnectedCallback();
      vi.runAllTimers();
      expect(renderSpy).not.toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe("_render", () => {
    it("commits a successful view into the shadow root", () => {
      const card = makeCard();
      card._config = baseConfig;
      card._hass = makeHass({ "sensor.yahoofinance_dji": makeState(baseAttrs) });
      card._trackedIds = new Set();
      card._render();
      expect(card.shadowRoot.innerHTML).toContain("ha-card");
      expect(card.shadowRoot.innerHTML).toContain("DOW JONES");
    });

    it("shows error when both pinned and sorted are empty", () => {
      const card = makeCard();
      card._config = { pinned: [], sorted: [] };
      card._hass = makeHass({});
      card._trackedIds = new Set();
      card._render();
      expect(card.shadowRoot.innerHTML).toContain("error");
    });

    it("shows error when render throws internally", () => {
      const card = makeCard();
      card._config = baseConfig;
      card._hass = null;
      card._trackedIds = new Set();
      card._render();
      expect(card.shadowRoot.innerHTML).toContain("error");
    });

    it("tracks rendered metric when debug:true", () => {
      const card = makeCard();
      card._config = { ...baseConfig, debug: true };
      card._hass = makeHass({ "sensor.yahoofinance_dji": makeState(baseAttrs) });
      card._trackedIds = new Set();
      const trackSpy = vi.spyOn(card._debug, "track");
      card._render();
      expect(trackSpy).toHaveBeenCalledWith("rendered");
    });

    it("produces identical DOM on repeated renders with unchanged data", () => {
      const card = makeCard();
      card._config = baseConfig;
      card._hass = makeHass({ "sensor.yahoofinance_dji": makeState(baseAttrs) });
      card._trackedIds = new Set();
      card._render();
      const first = card.shadowRoot.innerHTML;
      card._render();
      expect(card.shadowRoot.innerHTML).toBe(first);
    });
  });

  describe("debug overlay", () => {
    it("re-rendering updates the debug overlay content", () => {
      const card = makeCard();
      card._config = { ...baseConfig, debug: true };
      card._hass = makeHass({ "sensor.yahoofinance_dji": makeState(baseAttrs) });
      card._trackedIds = new Set();
      card._render();
      const overlay = card.shadowRoot.querySelector("#yf-debug");
      expect(overlay).not.toBeNull();
      expect(overlay.innerHTML).toContain("events");
    });
  });

  describe("_showError", () => {
    it("renders an error message in ha-card", () => {
      const card = makeCard();
      card._showError("Something went wrong");
      expect(card.shadowRoot.innerHTML).toContain("ha-card");
      expect(card.shadowRoot.innerHTML).toContain("Something went wrong");
    });

    it("escapes the error message", () => {
      const card = makeCard();
      card._showError("<script>evil</script>");
      expect(card.shadowRoot.innerHTML).not.toContain("<script>");
      expect(card.shadowRoot.innerHTML).toContain("&lt;script&gt;");
    });
  });
});
