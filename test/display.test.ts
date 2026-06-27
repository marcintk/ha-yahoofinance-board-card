import { describe, expect, it } from "vitest";
import { nameColor, prepostColor, rateColor } from "../src/display.js";

describe("rateColor", () => {
  it("returns lightseagreen above default threshold", () => {
    expect(rateColor(15)).toBe("lightseagreen");
  });

  it("returns seagreen for small positive", () => {
    expect(rateColor(5)).toBe("seagreen");
  });

  it("returns darkorange below negative default threshold", () => {
    expect(rateColor(-15)).toBe("darkorange");
  });

  it("returns indianred for small negative", () => {
    expect(rateColor(-5)).toBe("indianred");
  });

  it("returns gray for zero", () => {
    expect(rateColor(0)).toBe("gray");
  });

  it("uses custom threshold", () => {
    expect(rateColor(35, 30)).toBe("lightseagreen");
    expect(rateColor(25, 30)).toBe("seagreen");
    expect(rateColor(-35, 30)).toBe("darkorange");
    expect(rateColor(-25, 30)).toBe("indianred");
  });

  it("boundary: exactly at threshold is not above it", () => {
    expect(rateColor(10)).toBe("seagreen");
    expect(rateColor(-10)).toBe("indianred");
  });
});

describe("nameColor", () => {
  it("returns null for null attrs", () => {
    expect(nameColor(null)).toBeNull();
  });

  it("returns null for PRE state", () => {
    expect(nameColor({ marketState: "PRE", regularMarketChangePercent: 5 })).toBeNull();
  });

  it("returns null for POST state", () => {
    expect(nameColor({ marketState: "POST", regularMarketChangePercent: 5 })).toBeNull();
  });

  it("returns seagreen for REGULAR with positive change", () => {
    expect(nameColor({ marketState: "REGULAR", regularMarketChangePercent: 5 })).toBe("seagreen");
  });

  it("returns indianred for REGULAR with negative change", () => {
    expect(nameColor({ marketState: "REGULAR", regularMarketChangePercent: -5 })).toBe("indianred");
  });

  it("returns gray for REGULAR with zero change", () => {
    expect(nameColor({ marketState: "REGULAR", regularMarketChangePercent: 0 })).toBe("gray");
  });

  it("defaults regularMarketChangePercent to 0 when absent", () => {
    expect(nameColor({ marketState: "REGULAR" })).toBe("gray");
  });
});

describe("prepostColor", () => {
  it("returns gray for null attrs", () => {
    expect(prepostColor(null)).toBe("gray");
  });

  it("returns gray for REGULAR state", () => {
    expect(prepostColor({ marketState: "REGULAR", preMarketChangePercent: 5 })).toBe("gray");
  });

  it("uses preMarketChangePercent for PREPRE with positive", () => {
    expect(prepostColor({ marketState: "PREPRE", preMarketChangePercent: 5 })).toBe("seagreen");
  });

  it("uses preMarketChangePercent for PRE with negative", () => {
    expect(prepostColor({ marketState: "PRE", preMarketChangePercent: -5 })).toBe("indianred");
  });

  it("uses postMarketChangePercent for POST with positive", () => {
    expect(prepostColor({ marketState: "POST", postMarketChangePercent: 5 })).toBe("seagreen");
  });

  it("uses postMarketChangePercent for POSTPOST with negative", () => {
    expect(prepostColor({ marketState: "POSTPOST", postMarketChangePercent: -5 })).toBe(
      "indianred"
    );
  });

  it("defaults preMarketChangePercent to 0 when absent", () => {
    expect(prepostColor({ marketState: "PRE" })).toBe("gray");
  });

  it("defaults postMarketChangePercent to 0 when absent", () => {
    expect(prepostColor({ marketState: "POST" })).toBe("gray");
  });
});
