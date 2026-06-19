# Yahoo Finance Board Card

[![HACS](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://hacs.xyz)
[![GitHub Release](https://img.shields.io/github/release/marcintk/ha-yahoofinance-board-card.svg)](https://github.com/marcintk/ha-yahoofinance-board-card/releases)
[![License](https://img.shields.io/github/license/marcintk/ha-yahoofinance-board-card.svg)](https://github.com/marcintk/ha-yahoofinance-board-card/blob/main/LICENSE)
[![Maintenance](https://img.shields.io/maintenance/yes/2026)](https://github.com/marcintk/ha-yahoofinance-board-card)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](https://github.com/marcintk/ha-yahoofinance-board-card/actions/workflows/build-and-test.yml)
[![CI](https://github.com/marcintk/ha-yahoofinance-board-card/actions/workflows/build-and-test.yml/badge.svg)](https://github.com/marcintk/ha-yahoofinance-board-card/actions/workflows/build-and-test.yml)

Home Assistant custom Lovelace card displaying a compact stock market board — price, pre/post market
change, 1d/50d/200d change percentages, and a rotating data column (PE, Forward PE, Dividend Rate,
Volume). Built on top of the [yahoofinance](https://github.com/iprak/yahoofinance) integration.

## Requirements

Requires the [yahoofinance](https://github.com/iprak/yahoofinance) integration (HACS Integration) —
it provides the `sensor.yahoofinance_<symbol>` entities this card reads. See
[docs/configuration-example.yaml](docs/configuration-example.yaml) for sensor setup.

The optional `refresh_signal` entity cycles the data column. Use an `input_number` helper (values
0–3) rotated by an automation on a schedule.

## Installation

### Via HACS (recommended)

1. In HACS → Frontend → click the three-dot menu → **Custom repositories**
   - Repository: `https://github.com/marcintk/ha-yahoofinance-board-card` (exact URL)
   - Category: **Dashboard**
2. Search **Yahoo Finance Board Card** → Install
3. Reload your browser
4. Add the card to your dashboard (see Configuration below)

### Manual

1. Download `card.js` from the
   [latest release](https://github.com/marcintk/ha-yahoofinance-board-card/releases/latest)
2. Copy it to `<config>/www/ha-yahoofinance-board-card/card.js` (create the folder if needed)
3. In Home Assistant → Settings → Dashboards → Resources → **Add resource**
   - URL: `/local/ha-yahoofinance-board-card/card.js`
   - Resource type: **JavaScript module**
4. Reload your browser

## Configuration

Add a **Manual card** to your dashboard and paste:

```yaml
type: custom:ha-yahoofinance-board-card
prefix: sensor.yahoofinance_
refresh_signal: sensor.stock_refresh_signal
pinned:
  - symbol: dji
    name: "DOW JONES"
  - symbol: gspc
    name: "S&P 500"
  - symbol: ixic
    name: "NASDAQ"
sorted:
  - symbol: aapl
    name: "Apple"
  - symbol: msft
    name: "Microsoft"
  - symbol: nvda
    name: "NVidia"
    special: true
  - symbol: tsla
    name: "Tesla"
    highlight: "gold"
```

See [docs/configuration-example.yaml](docs/configuration-example.yaml) for a full example with all
supported symbols.

### Card options

| Option           | Type   | Default                | Description                                                    |
| ---------------- | ------ | ---------------------- | -------------------------------------------------------------- |
| `prefix`         | string | `sensor.yahoofinance_` | Entity ID prefix for Yahoo Finance entities                    |
| `refresh_signal` | string | —                      | Entity whose state (0–3) cycles the data column                |
| `pinned`         | list   | `[]`                   | Stocks rendered in configured order (indices, commodities, FX) |
| `sorted`         | list   | `[]`                   | Stocks sorted by 1-day change descending (individual equities) |
| `height`         | string | auto                   | Card height (CSS value); omit to fit content                   |
| `lazyRefresh`    | number | `1`                    | Seconds to debounce after a state event; `0` = immediate       |
| `fixedRefresh`   | number | `60`                   | Re-render every N seconds regardless of events; `0` = disabled |
| `debug`          | boolean | `false`               | Enables debug overlay (event/filter/render counters) and version badge (top-left) |

### Stock entry options

| Field       | Type    | Default  | Description                                           |
| ----------- | ------- | -------- | ----------------------------------------------------- |
| `symbol`    | string  | required | Yahoo Finance symbol slug (lowercase, see note below) |
| `name`      | string  | required | Display name shown in the name column                 |
| `special`   | boolean | `false`  | Wraps the name in `--NAME--` for visual emphasis      |
| `highlight` | string  | —        | CSS color applied as the price column background      |

### Symbol naming

Entity IDs follow the pattern `sensor.yahoofinance_<slug>` where `<slug>` is derived from the Yahoo
Finance ticker:

| Ticker    | Slug      | Entity ID                     |
| --------- | --------- | ----------------------------- |
| `^DJI`    | `dji`     | `sensor.yahoofinance_dji`     |
| `BRK-A`   | `brk_a`   | `sensor.yahoofinance_brk_a`   |
| `GC=F`    | `gc_f`    | `sensor.yahoofinance_gc_f`    |
| `AMS.MC`  | `ams_mc`  | `sensor.yahoofinance_ams_mc`  |
| `BTC-USD` | `btc_usd` | `sensor.yahoofinance_btc_usd` |

### Columns

| Column   | Shows                                                                             |
| -------- | --------------------------------------------------------------------------------- |
| Name     | Stock name; colored by 1d change during `REGULAR` session, gray otherwise         |
| Pre/Post | Pre or post market change %; background color indicates session type              |
| 1d%      | Regular market change %; highlighted gray background during `REGULAR` session     |
| 50d%     | 50-day average change % (±30% threshold for color)                                |
| 200d%    | 200-day average change % (±30% threshold for color)                               |
| Data     | Cycles through PE / Forward PE / Dividend Rate / Volume based on `refresh_signal` |
| Price    | Current price: pre/post/regular market depending on session                       |

### Market states and colors

| State      | Pre/Post background | Name color     |
| ---------- | ------------------- | -------------- |
| `PREPRE`   | lightblue           | gray           |
| `PRE`      | khaki               | gray           |
| `REGULAR`  | — (none)            | by 1d change % |
| `POST`     | pink                | gray           |
| `POSTPOST` | indigo              | gray           |

### Data column signal values

| Signal state | Column shows   | Threshold |
| ------------ | -------------- | --------- |
| `0`          | Trailing PE    | >50 = red |
| `1`          | Forward PE     | >50 = red |
| `2`          | Dividend Rate  | — (gray)  |
| `3`          | Volume (K/M/G) | — (gray)  |

## Development

See [CLAUDE.md](CLAUDE.md) for build commands, contributing guidelines, and release instructions.
