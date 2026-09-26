export interface RenderSchedulerStartOptions {
  fixedRefreshMs: number;
  onFixedTick: () => void;
  dataRotateMs: number;
  onDataTick: () => void;
  debugMs: number;
  onDebugTick: () => void;
}

export class RenderScheduler {
  private _fixedTimer: ReturnType<typeof setInterval> | null = null;
  private _dataTimer: ReturnType<typeof setInterval> | null = null;
  private _debugTimer: ReturnType<typeof setInterval> | null = null;
  private _renderTimer: ReturnType<typeof setTimeout> | null = null;

  start(options: RenderSchedulerStartOptions): void {
    const { fixedRefreshMs, onFixedTick, dataRotateMs, onDataTick, debugMs, onDebugTick } = options;

    if (this._fixedTimer !== null) {
      clearInterval(this._fixedTimer);
    }
    if (this._dataTimer !== null) {
      clearInterval(this._dataTimer);
    }
    if (this._debugTimer !== null) {
      clearInterval(this._debugTimer);
    }

    this._fixedTimer = fixedRefreshMs > 0 ? setInterval(onFixedTick, fixedRefreshMs) : null;
    this._dataTimer = dataRotateMs > 0 ? setInterval(onDataTick, dataRotateMs) : null;
    this._debugTimer = debugMs > 0 ? setInterval(onDebugTick, debugMs) : null;
  }

  scheduleRender(lazyMs: number, onRender: () => void): void {
    if (lazyMs === 0) {
      if (this._renderTimer !== null) {
        clearTimeout(this._renderTimer);
        this._renderTimer = null;
      }
      onRender();
      return;
    }

    if (this._renderTimer !== null) {
      return;
    }

    this._renderTimer = setTimeout(() => {
      this._renderTimer = null;
      onRender();
    }, lazyMs);
  }

  cancelPendingRender(): void {
    if (this._renderTimer !== null) {
      clearTimeout(this._renderTimer);
      this._renderTimer = null;
    }
  }

  stop(): void {
    if (this._fixedTimer !== null) {
      clearInterval(this._fixedTimer);
      this._fixedTimer = null;
    }
    if (this._dataTimer !== null) {
      clearInterval(this._dataTimer);
      this._dataTimer = null;
    }
    if (this._debugTimer !== null) {
      clearInterval(this._debugTimer);
      this._debugTimer = null;
    }
    this.cancelPendingRender();
  }
}
