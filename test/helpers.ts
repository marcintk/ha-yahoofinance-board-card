import { afterEach, beforeEach, vi } from 'vitest';

export function withFakeTimers() {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
}
