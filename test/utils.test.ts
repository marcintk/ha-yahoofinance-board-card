import { describe, expect, it } from "vitest";
import { isPostMarket, isPreMarket, timeAgo } from "../src/utils.js";

describe("isPreMarket", () => {
  it.each(["PREPRE", "PRE"] as const)("returns true for %s", (s) => {
    expect(isPreMarket(s)).toBe(true);
  });
  it.each(["REGULAR", "POST", "POSTPOST", null, undefined])("returns false for %s", (s) => {
    expect(isPreMarket(s)).toBe(false);
  });
});

describe("isPostMarket", () => {
  it.each(["POST", "POSTPOST"] as const)("returns true for %s", (s) => {
    expect(isPostMarket(s)).toBe(true);
  });
  it.each(["REGULAR", "PRE", "PREPRE", null, undefined])("returns false for %s", (s) => {
    expect(isPostMarket(s)).toBe(false);
  });
});

describe("timeAgo", () => {
  it("formats seconds for sub-minute durations", () => {
    expect(timeAgo(30_000)).toBe("30s");
  });

  it("formats minutes for sub-hour durations", () => {
    expect(timeAgo(120_000)).toBe("2m");
  });

  it("formats hours for longer durations", () => {
    expect(timeAgo(7_200_000)).toBe("2h");
  });
});
