import { render, type TemplateResult } from "lit";
import { describe, expect, it } from "vitest";
import { CARD_STYLES } from "../src/index.js";
import { DEFAULT_STATE_COLORS, stockRowHtml } from "../src/render.js";

function doc(template: TemplateResult): string {
  const el = document.createElement("div");
  render(template, el);
  // Lit embeds non-deterministic instance IDs in HTML comments — normalize them.
  return el.innerHTML.replace(/<!--\?lit\$\d+\$-->/g, "<!--?-->");
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
