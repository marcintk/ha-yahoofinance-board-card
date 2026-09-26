import { describe, expect, it } from "vitest";
import { deriveMarketPhase, rateColor } from "../src/market-phase.js";

describe("deriveMarketPhase", () => {
  it("returns REGULAR phase with regularMarketPrice/ChangePercent as active values", () => {
    const attrs = {
      marketState: "REGULAR" as const,
      regularMarketPrice: 100.5,
      regularMarketChangePercent: 1.25,
    };

    expect(deriveMarketPhase(attrs)).toEqual({
      state: "REGULAR",
      isRegular: true,
      isExtended: false,
      activePrice: 100.5,
      activeChangePercent: 1.25,
    });
  });

  it.each(["PREPRE", "PRE"] as const)(
    "returns %s phase using preMarketPrice/ChangePercent as active values",
    (state) => {
      const attrs = {
        marketState: state,
        preMarketPrice: 120.0,
        preMarketChangePercent: 5,
        regularMarketPrice: 100.0,
        regularMarketChangePercent: 1,
      };

      expect(deriveMarketPhase(attrs)).toEqual({
        state,
        isRegular: false,
        isExtended: true,
        activePrice: 120.0,
        activeChangePercent: 5,
      });
    }
  );

  it.each(["POST", "POSTPOST"] as const)(
    "returns %s phase using postMarketPrice/ChangePercent as active values",
    (state) => {
      const attrs = {
        marketState: state,
        postMarketPrice: 130.0,
        postMarketChangePercent: -3,
        regularMarketPrice: 100.0,
        regularMarketChangePercent: 1,
      };

      expect(deriveMarketPhase(attrs)).toEqual({
        state,
        isRegular: false,
        isExtended: true,
        activePrice: 130.0,
        activeChangePercent: -3,
      });
    }
  );

  it("falls back to regularMarketPrice when preMarketPrice is 0, but keeps preMarketChangePercent as-is", () => {
    const attrs = {
      marketState: "PRE" as const,
      preMarketPrice: 0,
      preMarketChangePercent: 0,
      regularMarketPrice: 100.0,
      regularMarketChangePercent: 1,
    };

    expect(deriveMarketPhase(attrs)).toEqual({
      state: "PRE",
      isRegular: false,
      isExtended: true,
      activePrice: 100.0,
      activeChangePercent: 0,
    });
  });

  it("falls back to regularMarketPrice when postMarketPrice is 0, but keeps postMarketChangePercent as-is", () => {
    const attrs = {
      marketState: "POST" as const,
      postMarketPrice: 0,
      postMarketChangePercent: 0,
      regularMarketPrice: 100.0,
      regularMarketChangePercent: 1,
    };

    expect(deriveMarketPhase(attrs)).toEqual({
      state: "POST",
      isRegular: false,
      isExtended: true,
      activePrice: 100.0,
      activeChangePercent: 0,
    });
  });

  it("does not fall back to regularMarketChangePercent when preMarketChangePercent is missing", () => {
    const attrs = {
      marketState: "PRE" as const,
      regularMarketPrice: 100.0,
      regularMarketChangePercent: 2.5,
    };

    expect(deriveMarketPhase(attrs).activeChangePercent).toBeUndefined();
  });

  it("does not fall back to regularMarketChangePercent when postMarketChangePercent is missing", () => {
    const attrs = {
      marketState: "POST" as const,
      regularMarketPrice: 100.0,
      regularMarketChangePercent: 2.5,
    };

    expect(deriveMarketPhase(attrs).activeChangePercent).toBeUndefined();
  });

  it("returns UNKNOWN phase for null attrs, using regularMarketPrice/ChangePercent (both undefined)", () => {
    expect(deriveMarketPhase(null)).toEqual({
      state: "UNKNOWN",
      isRegular: false,
      isExtended: false,
      activePrice: undefined,
      activeChangePercent: undefined,
    });
  });

  it("returns UNKNOWN phase when marketState is missing", () => {
    const attrs = { regularMarketPrice: 100.0, regularMarketChangePercent: 1 };

    expect(deriveMarketPhase(attrs)).toEqual({
      state: "UNKNOWN",
      isRegular: false,
      isExtended: false,
      activePrice: 100.0,
      activeChangePercent: 1,
    });
  });
});

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
