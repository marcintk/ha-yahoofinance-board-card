import { render, type TemplateResult } from "lit";
import { describe, expect, it } from "vitest";
import { buildCardView } from "../src/render.js";
import type { CardConfig, Hass } from "../src/types.js";
import { snapHtml } from "./helpers.js";

function doc(template: TemplateResult): string {
  const el = document.createElement("div");
  render(template, el);
  return snapHtml(el.innerHTML);
}

const baseAttrs = {
  marketState: "REGULAR" as const,
  regularMarketChangePercent: 2.5,
  fiftyDayAverageChangePercent: 5,
  twoHundredDayAverageChangePercent: -3,
  regularMarketPrice: 175.5,
  trailingPE: 30,
  regularMarketVolume: 50000000,
};

const makeHass = (states: Hass["states"] = {}): Hass => ({
  connection: { subscribeEvents: async () => () => {} },
  states,
});

const baseConfig: CardConfig = {
  prefix: "sensor.yahoofinance_",
  pinned: [{ symbol: "dji", name: "DOW JONES" }],
  sorted: [{ symbol: "aapl", name: "Apple" }],
};

const emptyRowMeta = new Map<string, string>();

describe("buildCardView", () => {
  it("returns an error view when both pinned and sorted stock lists are empty", () => {
    const config: CardConfig = { pinned: [], sorted: [] };
    const hass: Hass = {
      connection: { subscribeEvents: async () => () => {} },
      states: {},
    };
    const rowMeta = new Map<string, string>();

    const view = buildCardView(config, hass, 0, rowMeta);

    expect(view.kind).toBe("error");
    if (view.kind === "error") {
      expect(view.message.length).toBeGreaterThan(0);
    }
  });

  it("renders ha-card with stock rows when entities exist", () => {
    const hass = makeHass({ "sensor.yahoofinance_dji": { attributes: baseAttrs } });
    const view = buildCardView(baseConfig, hass, 0, emptyRowMeta);
    expect(view.kind).toBe("ok");
    if (view.kind === "ok") {
      const html = doc(view.template);
      expect(html).toContain("ha-card");
      expect(html).toContain("DOW JONES");
    }
  });

  it("renders even when entities are missing (shows - for data)", () => {
    const hass = makeHass({});
    const view = buildCardView(baseConfig, hass, 0, emptyRowMeta);
    expect(view.kind).toBe("ok");
    if (view.kind === "ok") {
      expect(doc(view.template)).toContain("ha-card");
    }
  });

  it("applies custom height style", () => {
    const config = { ...baseConfig, height: "400px" };
    const hass = makeHass({ "sensor.yahoofinance_dji": { attributes: baseAttrs } });
    const view = buildCardView(config, hass, 0, emptyRowMeta);
    expect(view.kind).toBe("ok");
    if (view.kind === "ok") {
      expect(doc(view.template)).toContain("400px");
    }
  });

  it("includes position:relative in height style when debug is also enabled", () => {
    const config = { ...baseConfig, height: "400px", debug: true };
    const hass = makeHass({ "sensor.yahoofinance_dji": { attributes: baseAttrs } });
    const view = buildCardView(config, hass, 0, emptyRowMeta);
    expect(view.kind).toBe("ok");
    if (view.kind === "ok") {
      const el = document.createElement("div");
      render(view.template, el);
      const haCard = el.querySelector("ha-card");
      expect(haCard?.getAttribute("style")).toContain("400px");
      expect(haCard?.getAttribute("style")).toContain("position:relative");
    }
  });

  it("does not create rogue elements from < > in height value", () => {
    const config = { ...baseConfig, height: "100px<script>" };
    const hass = makeHass({ "sensor.yahoofinance_dji": { attributes: baseAttrs } });
    const view = buildCardView(config, hass, 0, emptyRowMeta);
    expect(view.kind).toBe("ok");
    if (view.kind === "ok") {
      const el = document.createElement("div");
      render(view.template, el);
      expect(el.querySelector("script")).toBeNull();
    }
  });

  it("renders sorted-only config (empty pinned) using default prefix", () => {
    const config: CardConfig = { sorted: [{ symbol: "aapl", name: "Apple" }] };
    const hass = makeHass({ "sensor.yahoofinance_aapl": { attributes: baseAttrs } });
    const view = buildCardView(config, hass, 0, emptyRowMeta);
    expect(view.kind).toBe("ok");
    if (view.kind === "ok") {
      expect(doc(view.template)).toContain("Apple");
    }
  });

  it("renders pinned-only config (empty sorted)", () => {
    const config: CardConfig = { pinned: [{ symbol: "dji", name: "DOW" }], sorted: [] };
    const hass = makeHass({ "sensor.yahoofinance_dji": { attributes: baseAttrs } });
    const view = buildCardView(config, hass, 0, emptyRowMeta);
    expect(view.kind).toBe("ok");
    if (view.kind === "ok") {
      expect(doc(view.template)).toContain("DOW");
    }
  });

  it("renders debug overlay when debug:true", () => {
    const config = { ...baseConfig, debug: true };
    const hass = makeHass({ "sensor.yahoofinance_dji": { attributes: baseAttrs } });
    const view = buildCardView(config, hass, 0, emptyRowMeta);
    expect(view.kind).toBe("ok");
    if (view.kind === "ok") {
      const html = doc(view.template);
      expect(html).toContain('id="yf-debug"');
      expect(html).toContain("position:relative");
      const el = document.createElement("div");
      render(view.template, el);
      expect(el.textContent).not.toContain("vtest");
    }
  });

  it("renders version badge without debug overlay when show_version:true", () => {
    const config = { ...baseConfig, show_version: true };
    const hass = makeHass({ "sensor.yahoofinance_dji": { attributes: baseAttrs } });
    const view = buildCardView(config, hass, 0, emptyRowMeta);
    expect(view.kind).toBe("ok");
    if (view.kind === "ok") {
      const html = doc(view.template);
      expect(html).not.toContain('id="yf-debug"');
      expect(html).toContain("position:relative");
      const el = document.createElement("div");
      render(view.template, el);
      expect(el.textContent).toContain("vtest");
    }
  });
});
