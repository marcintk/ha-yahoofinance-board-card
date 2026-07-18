import { snapHtml } from "ha-card-shared/test-utils";
import { render, type TemplateResult } from "lit";
import { describe, expect, it } from "vitest";
import { CARD_STYLES } from "../src/index.js";
import { DEFAULT_STATE_COLORS, headerHtml, stockRowHtml, stockSectionHtml } from "../src/render.js";

function doc(template: TemplateResult): string {
  const el = document.createElement("div");
  render(template, el);
  return snapHtml(el.innerHTML);
}

const baseAttrs = {
  regularMarketPrice: 175.5,
  regularMarketChangePercent: 2.5,
  preMarketPrice: 178.0,
  preMarketChangePercent: 0.8,
  postMarketPrice: 174.0,
  postMarketChangePercent: -0.5,
  fiftyDayAverageChangePercent: 5.0,
  twoHundredDayAverageChangePercent: -3.0,
  trailingPE: 30,
  forwardPE: 25,
  dividendRate: 0.92,
  regularMarketVolume: 75_000_000,
};

const stock = { symbol: "aapl", name: "Apple" };

describe("CARD_STYLES", () => {
  it("matches snapshot", () => {
    expect(CARD_STYLES).toMatchSnapshot();
  });
});

describe("stockRowHtml per market state", () => {
  it("UNKNOWN (null attrs)", () => {
    expect(doc(stockRowHtml(stock, null, 0, "Apple"))).toMatchSnapshot();
  });

  it("REGULAR", () => {
    expect(
      doc(stockRowHtml(stock, { ...baseAttrs, marketState: "REGULAR" }, 0, "Apple"))
    ).toMatchSnapshot();
  });

  it("PREPRE", () => {
    expect(
      doc(stockRowHtml(stock, { ...baseAttrs, marketState: "PREPRE" }, 0, "Apple"))
    ).toMatchSnapshot();
  });

  it("PRE", () => {
    expect(
      doc(stockRowHtml(stock, { ...baseAttrs, marketState: "PRE" }, 0, "Apple"))
    ).toMatchSnapshot();
  });

  it("POST", () => {
    expect(
      doc(stockRowHtml(stock, { ...baseAttrs, marketState: "POST" }, 0, "Apple"))
    ).toMatchSnapshot();
  });

  it("POSTPOST", () => {
    expect(
      doc(stockRowHtml(stock, { ...baseAttrs, marketState: "POSTPOST" }, 0, "Apple"))
    ).toMatchSnapshot();
  });

  it("REGULAR with mark", () => {
    expect(
      doc(
        stockRowHtml(
          { ...stock, mark: "gold" },
          { ...baseAttrs, marketState: "REGULAR" },
          0,
          "Apple"
        )
      )
    ).toMatchSnapshot();
  });

  it("PRE with colors override", () => {
    expect(
      doc(
        stockRowHtml(stock, { ...baseAttrs, marketState: "PRE" }, 0, "Apple", {
          ...DEFAULT_STATE_COLORS,
          PRE: "#d4af37",
        })
      )
    ).toMatchSnapshot();
  });
});

describe("headerHtml per dataIndex", () => {
  it("dataIndex 0 (PE)", () => {
    expect(doc(headerHtml(0))).toMatchSnapshot();
  });

  it("dataIndex 1 (FPE)", () => {
    expect(doc(headerHtml(1))).toMatchSnapshot();
  });

  it("dataIndex 2 (Div)", () => {
    expect(doc(headerHtml(2))).toMatchSnapshot();
  });

  it("dataIndex 3 (Vol)", () => {
    expect(doc(headerHtml(3))).toMatchSnapshot();
  });
});

describe("stockSectionHtml", () => {
  const stocks = [
    { symbol: "msft", name: "Microsoft" },
    { symbol: "aapl", name: "Apple" },
  ];
  const states = {
    "sensor.msft": {
      attributes: { ...baseAttrs, marketState: "PRE" as const, regularMarketChangePercent: -1.0 },
    },
    "sensor.aapl": { attributes: { ...baseAttrs, marketState: "REGULAR" as const } },
  };
  const rowMeta = new Map([
    ["msft", "Microsoft"],
    ["aapl", "Apple"],
  ]);

  it("unsorted preserves input order", () => {
    expect(doc(stockSectionHtml(stocks, states, "sensor.", 0, rowMeta, false))).toMatchSnapshot();
  });

  it("sorted puts highest changePercent first", () => {
    expect(doc(stockSectionHtml(stocks, states, "sensor.", 0, rowMeta, true))).toMatchSnapshot();
  });

  it("null attrs (no matching states)", () => {
    expect(doc(stockSectionHtml(stocks, {}, "sensor.", 0, rowMeta, false))).toMatchSnapshot();
  });
});
