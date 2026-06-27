export type MarketState = "PREPRE" | "PRE" | "REGULAR" | "POST" | "POSTPOST";

/** Per-state color. Shown as price text and prepost background; "UNKNOWN" covers missing state. */
export type StateColors = Record<MarketState | "UNKNOWN", string>;

export interface YahooFinanceAttributes {
  marketState?: MarketState;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  preMarketPrice?: number;
  preMarketChangePercent?: number;
  postMarketPrice?: number;
  postMarketChangePercent?: number;
  fiftyDayAverageChangePercent?: number;
  twoHundredDayAverageChangePercent?: number;
  trailingPE?: number;
  forwardPE?: number;
  dividendRate?: number;
  regularMarketVolume?: number;
}

export interface StockEntry {
  symbol: string;
  name: string;
  icon?: string;
  mark?: string;
}

export interface CardConfig {
  prefix?: string;
  pinned?: StockEntry[];
  sorted?: StockEntry[];
  height?: string | number;
  debug?: boolean;
  lazy_refresh?: number;
  fixed_refresh?: number;
  data_rotate_every?: number;
  icons?: "auto" | "none";
  colors?: Partial<StateColors>;
}

export interface Hass {
  connection: {
    subscribeEvents(
      callback: (event: { data: { entity_id: string } }) => void,
      eventType: string
    ): Promise<() => void>;
  };
  states: Record<string, { attributes: YahooFinanceAttributes } | undefined>;
}
