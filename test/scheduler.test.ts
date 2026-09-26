import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RenderScheduler } from "../src/scheduler.js";

describe("RenderScheduler", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  describe("scheduleRender", () => {
    it("ignores calls while a render is already pending: fires once, timed from the first call", () => {
      const scheduler = new RenderScheduler();
      const onRenderFirst = vi.fn();
      const onRenderSecond = vi.fn();

      scheduler.scheduleRender(100, onRenderFirst);
      vi.advanceTimersByTime(60);
      scheduler.scheduleRender(100, onRenderSecond);

      // The second call must not stack a new timer or reset the window: the
      // pending render still fires 100ms after the *first* call (i.e. 40ms
      // from here), not 100ms after the second.
      vi.advanceTimersByTime(40);
      expect(onRenderFirst).toHaveBeenCalledTimes(1);
      expect(onRenderSecond).not.toHaveBeenCalled();

      vi.advanceTimersByTime(60);
      expect(onRenderFirst).toHaveBeenCalledTimes(1);
      expect(onRenderSecond).not.toHaveBeenCalled();
    });

    it("schedules a new render once the previous one has fired", () => {
      const scheduler = new RenderScheduler();
      const onRenderFirst = vi.fn();
      const onRenderSecond = vi.fn();

      scheduler.scheduleRender(100, onRenderFirst);
      vi.advanceTimersByTime(100);
      expect(onRenderFirst).toHaveBeenCalledTimes(1);

      scheduler.scheduleRender(100, onRenderSecond);
      vi.advanceTimersByTime(100);
      expect(onRenderSecond).toHaveBeenCalledTimes(1);
    });

    it("fires onRender immediately when lazyMs is 0, without scheduling a timer", () => {
      const scheduler = new RenderScheduler();
      const onRender = vi.fn();

      scheduler.scheduleRender(0, onRender);
      expect(onRender).toHaveBeenCalledTimes(1);

      // Nothing left pending: advancing time further must not fire it again.
      vi.advanceTimersByTime(10_000);
      expect(onRender).toHaveBeenCalledTimes(1);
    });

    it("an immediate (lazyMs=0) call cancels a pending debounced render instead of also firing it later", () => {
      const scheduler = new RenderScheduler();
      const onRenderPending = vi.fn();
      const onRenderImmediate = vi.fn();

      scheduler.scheduleRender(100, onRenderPending);
      scheduler.scheduleRender(0, onRenderImmediate);
      expect(onRenderImmediate).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(200);
      expect(onRenderPending).not.toHaveBeenCalled();
      expect(onRenderImmediate).toHaveBeenCalledTimes(1);
    });
  });

  describe("cancelPendingRender", () => {
    it("cancels a pending debounced render", () => {
      const scheduler = new RenderScheduler();
      const onRender = vi.fn();

      scheduler.scheduleRender(100, onRender);
      scheduler.cancelPendingRender();
      vi.advanceTimersByTime(200);
      expect(onRender).not.toHaveBeenCalled();
    });

    it("does not throw when nothing is pending", () => {
      const scheduler = new RenderScheduler();
      expect(() => scheduler.cancelPendingRender()).not.toThrow();
    });
  });

  describe("start", () => {
    it("starts the fixed, data and debug interval timers", () => {
      const scheduler = new RenderScheduler();
      const onFixedTick = vi.fn();
      const onDataTick = vi.fn();
      const onDebugTick = vi.fn();

      scheduler.start({
        fixedRefreshMs: 100,
        onFixedTick,
        dataRotateMs: 200,
        onDataTick,
        debugMs: 50,
        onDebugTick,
      });

      vi.advanceTimersByTime(200);
      expect(onFixedTick).toHaveBeenCalledTimes(2);
      expect(onDataTick).toHaveBeenCalledTimes(1);
      expect(onDebugTick).toHaveBeenCalledTimes(4);

      scheduler.stop();
    });

    it("does not start a timer kind whose interval is 0", () => {
      const scheduler = new RenderScheduler();
      const onFixedTick = vi.fn();
      const onDataTick = vi.fn();
      const onDebugTick = vi.fn();

      scheduler.start({
        fixedRefreshMs: 0,
        onFixedTick,
        dataRotateMs: 0,
        onDataTick,
        debugMs: 0,
        onDebugTick,
      });

      vi.advanceTimersByTime(10_000);
      expect(onFixedTick).not.toHaveBeenCalled();
      expect(onDataTick).not.toHaveBeenCalled();
      expect(onDebugTick).not.toHaveBeenCalled();

      scheduler.stop();
    });

    it("restarting clears the previously running fixed/data/debug timers", () => {
      const scheduler = new RenderScheduler();
      const onFixedTickFirst = vi.fn();
      const onDataTickFirst = vi.fn();
      const onDebugTickFirst = vi.fn();
      const onFixedTickSecond = vi.fn();
      const onDataTickSecond = vi.fn();
      const onDebugTickSecond = vi.fn();

      scheduler.start({
        fixedRefreshMs: 100,
        onFixedTick: onFixedTickFirst,
        dataRotateMs: 100,
        onDataTick: onDataTickFirst,
        debugMs: 100,
        onDebugTick: onDebugTickFirst,
      });

      scheduler.start({
        fixedRefreshMs: 100,
        onFixedTick: onFixedTickSecond,
        dataRotateMs: 100,
        onDataTick: onDataTickSecond,
        debugMs: 100,
        onDebugTick: onDebugTickSecond,
      });

      vi.advanceTimersByTime(100);
      expect(onFixedTickFirst).not.toHaveBeenCalled();
      expect(onDataTickFirst).not.toHaveBeenCalled();
      expect(onDebugTickFirst).not.toHaveBeenCalled();
      expect(onFixedTickSecond).toHaveBeenCalledTimes(1);
      expect(onDataTickSecond).toHaveBeenCalledTimes(1);
      expect(onDebugTickSecond).toHaveBeenCalledTimes(1);

      scheduler.stop();
    });
  });

  describe("stop", () => {
    it("clears all four timer kinds", () => {
      const scheduler = new RenderScheduler();
      const onFixedTick = vi.fn();
      const onDataTick = vi.fn();
      const onDebugTick = vi.fn();
      const onRender = vi.fn();

      scheduler.start({
        fixedRefreshMs: 100,
        onFixedTick,
        dataRotateMs: 100,
        onDataTick,
        debugMs: 100,
        onDebugTick,
      });
      scheduler.scheduleRender(100, onRender);

      scheduler.stop();
      vi.advanceTimersByTime(10_000);

      expect(onFixedTick).not.toHaveBeenCalled();
      expect(onDataTick).not.toHaveBeenCalled();
      expect(onDebugTick).not.toHaveBeenCalled();
      expect(onRender).not.toHaveBeenCalled();
    });

    it("does not throw when nothing was ever started", () => {
      const scheduler = new RenderScheduler();
      expect(() => scheduler.stop()).not.toThrow();
    });
  });
});
