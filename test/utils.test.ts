import { describe, expect, it } from "vitest";
import { isPostMarket, isPreMarket } from "../src/utils.js";

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
