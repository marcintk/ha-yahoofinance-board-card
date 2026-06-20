import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DebugMetrics } from '../src/debug.js';

describe('DebugMetrics', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('track', () => {
    it('records timestamps for valid keys', () => {
      const d = new DebugMetrics();
      vi.setSystemTime(1000);
      d.track('events');
      expect(d.counts('events').hour3).toBe(1);
    });

    it('accumulates multiple entries', () => {
      const d = new DebugMetrics();
      vi.setSystemTime(1000);
      d.track('events');
      d.track('events');
      d.track('events');
      expect(d.counts('events').hour3).toBe(3);
    });

    it('prunes entries older than 3 hours', () => {
      const d = new DebugMetrics();
      vi.setSystemTime(0);
      d.track('rendered');
      vi.setSystemTime(10_800_001);
      d.track('rendered');
      expect(d.counts('rendered').hour3).toBe(1);
    });

    it('tracks filtered and rendered independently', () => {
      const d = new DebugMetrics();
      vi.setSystemTime(1000);
      d.track('filtered');
      d.track('filtered');
      d.track('rendered');
      expect(d.counts('filtered').hour3).toBe(2);
      expect(d.counts('rendered').hour3).toBe(1);
      expect(d.counts('events').hour3).toBe(0);
    });
  });

  describe('counts', () => {
    it('returns zero counts when empty', () => {
      const d = new DebugMetrics();
      const c = d.counts('events');
      expect(c).toEqual({ min1: 0, min5: 0, min15: 0, min30: 0, hour1: 0, hour3: 0 });
    });

    it('counts entries within each time window', () => {
      const d = new DebugMetrics();
      const now = 3_600_000;
      vi.setSystemTime(now - 30_000);
      d.track('events'); // 30s ago → in 1m
      vi.setSystemTime(now - 200_000);
      d.track('events'); // ~3m ago → in 5m
      vi.setSystemTime(now - 800_000);
      d.track('events'); // ~13m ago → in 15m
      vi.setSystemTime(now - 1_700_000);
      d.track('events'); // ~28m ago → in 30m
      vi.setSystemTime(now - 3_500_000);
      d.track('events'); // ~58m ago → in 1h
      vi.setSystemTime(now);
      const c = d.counts('events');
      expect(c.min1).toBe(1);
      expect(c.min5).toBe(2);
      expect(c.min15).toBe(3);
      expect(c.min30).toBe(4);
      expect(c.hour1).toBe(5);
      expect(c.hour3).toBe(5);
    });

    it('stops scanning at entries older than 1 hour', () => {
      const d = new DebugMetrics();
      const now = 7_200_000;
      vi.setSystemTime(now - 3_700_000);
      d.track('events'); // >1h ago but <3h → in arr but not counted by loop
      vi.setSystemTime(now);
      const c = d.counts('events');
      expect(c.hour1).toBe(0);
      expect(c.hour3).toBe(1); // arr.length still counts it
    });
  });

  describe('tableHtml', () => {
    it('returns a non-empty string', () => {
      const d = new DebugMetrics();
      expect(typeof d.tableHtml()).toBe('string');
      expect(d.tableHtml().length).toBeGreaterThan(0);
    });

    it('contains a table element', () => {
      const d = new DebugMetrics();
      expect(d.tableHtml()).toContain('<table');
    });

    it('contains rows for events, filtered, rendered', () => {
      const d = new DebugMetrics();
      const html = d.tableHtml();
      expect(html).toContain('events');
      expect(html).toContain('filtered');
      expect(html).toContain('rendered');
    });

    it('shows -- when no renders have occurred', () => {
      const d = new DebugMetrics();
      expect(d.tableHtml()).toContain('--');
    });

    it('shows last render timestamp when rendered has entries', () => {
      const d = new DebugMetrics();
      vi.setSystemTime(new Date('2024-01-01T12:34:56.789Z').getTime());
      d.track('rendered');
      const html = d.tableHtml();
      expect(html).not.toContain('--');
      expect(html).toContain('ago');
    });
  });

  describe('html', () => {
    it('returns overlay div with yf-debug id', () => {
      const d = new DebugMetrics();
      const html = d.html();
      expect(html).toContain('id="yf-debug"');
    });

    it('contains tableHtml output', () => {
      const d = new DebugMetrics();
      expect(d.html()).toContain(d.tableHtml());
    });

    it('has position:absolute styling', () => {
      const d = new DebugMetrics();
      expect(d.html()).toContain('position:absolute');
    });
  });

  describe('_timeAgo', () => {
    it('formats seconds for sub-minute durations', () => {
      const d = new DebugMetrics();
      expect(d._timeAgo(30_000)).toBe('30s');
    });

    it('formats minutes for sub-hour durations', () => {
      const d = new DebugMetrics();
      expect(d._timeAgo(120_000)).toBe('2m');
    });

    it('formats hours for longer durations', () => {
      const d = new DebugMetrics();
      expect(d._timeAgo(7_200_000)).toBe('2h');
    });
  });
});
