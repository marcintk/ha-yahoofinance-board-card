# Yahoo Finance Board Card

[![Yahoo Finance Board Card][demo-img]][repo]

Home Assistant custom Lovelace card displaying a compact stock market board — price, pre/post market
change, 1d/50d/200d change percentages, and a rotating data column (PE, Forward PE, Dividend Rate,
Volume). Built on top of the [yahoofinance](https://github.com/iprak/yahoofinance) integration.

[![hacs_badge][hacs-shield]][hacs] [![GitHub Release][releases-shield]][releases]
[![License][license-shield]][license] [![Downloads][downloads-shield]][releases]
[![Issues][issues-shield]][issues] [![PRs][prs-shield]][prs]
[![Last Commit][last-commit-shield]][commits]

[![Build and Test][ci-shield]][ci] [![Coverage][coverage-shield]][ci]
[![CodeQL][codeql-shield]][codeql] [![OpenSSF][scorecard-shield]][scorecard]
[![Socket.dev][socket-shield]][socket]

Bug or feature request? [Open an issue][new-issue]. Idea, question, or setup to share? [Start a
discussion][discussions].

## Requirements

Requires the [yahoofinance](https://github.com/iprak/yahoofinance) integration (HACS Integration) —
it provides the `sensor.yahoofinance_<symbol>` entities this card reads. See
[docs/configuration-example.yaml](docs/configuration-example.yaml) for sensor setup.

## Installation

### Via HACS (recommended)

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=marcintk&repository=ha-yahoofinance-board-card&category=plugin)

Click the badge to open this card in your own HACS, or find it manually: HACS → Frontend → search
**Yahoo Finance Board Card**. Then Install, reload your browser, and add the card to your dashboard
(see Configuration below).

### Manual

Drop `card.js` from the
[latest release](https://github.com/marcintk/ha-yahoofinance-board-card/releases/latest) into
`<config>/www/ha-yahoofinance-board-card/`, then register
`/local/ha-yahoofinance-board-card/card.js` as a **JavaScript Module** under Settings → Dashboards →
Resources.

## Usage

Add a **Manual card** to your dashboard and paste:

```yaml
type: custom:ha-yahoofinance-board-card
prefix: sensor.yahoofinance_
icons: auto
pinned:
  - symbol: dji
    name: "DOW JONES"
  - symbol: gspc
    name: "S&P 500"
  - symbol: ixic
    name: "NASDAQ"
  - symbol: gc_f
    name: "Gold"
  - symbol: usdpln_x
    name: "USD/PLN"
sorted:
  - symbol: aapl
    name: "Apple"
  - symbol: msft
    name: "Microsoft"
  - symbol: nvda
    name: "NVidia"
    mark: "gold"
  - symbol: tsla
    name: "Tesla"
    icon: "★"
```

## Display

`pinned` stocks render in configured order; `sorted` stocks are ranked by 1-day change percentage
descending (top gainers first). Each row cycles through the columns below.

| Column   | Shows                                                                                     |
| -------- | ----------------------------------------------------------------------------------------- |
| Name     | Stock name; colored by 1d% during `REGULAR` session, theme secondary color otherwise      |
| Pre/Post | Pre or post market change %; background color indicates session type                      |
| 1d%      | Regular market change %; highlighted gray background during `REGULAR` session             |
| 50d%     | 50-day average change % (±30% threshold for color)                                        |
| 200d%    | 200-day average change % (±30% threshold for color)                                       |
| Data     | Cycles through PE / Forward PE / Dividend Rate / Volume every `data_rotate_every` seconds |
| Price    | Current price: pre/post/regular market depending on session                               |

## Configuration

### Card

| Option              | Type             | Default                | Description                                                                                      |
| ------------------- | ---------------- | ---------------------- | ------------------------------------------------------------------------------------------------ |
| `prefix`            | string           | `sensor.yahoofinance_` | Entity ID prefix for Yahoo Finance entities                                                      |
| `pinned`            | list             | `[]`                   | Stocks rendered in configured order (indices, commodities, FX) — see [Stock entry](#stock-entry) |
| `sorted`            | list             | `[]`                   | Stocks sorted by 1-day change descending (individual equities) — see [Stock entry](#stock-entry) |
| `icons`             | `auto` \| `none` | `none`                 | `auto` — prefix each row with a type icon detected from the symbol slug; `none` — no icons       |
| `data_rotate_every` | number           | `60`                   | Seconds between data column cycles (PE → FPE → Div → Vol); `0` = disabled                        |
| `colors`            | map              | —                      | Per-state color overrides — see [Colors](#colors)                                                |
| `height`            | string           | auto                   | Card height (CSS value); omit to fit content                                                     |
| `show_version`      | boolean          | `false`                | Shows card version badge (top-left corner)                                                       |
| `debug`             | boolean          | `false`                | Enables debug overlay (event/filter/render counters)                                             |

### Refresh

The card subscribes to Home Assistant state changes and re-renders when a tracked sensor updates.

| Option          | Type   | Default | Description                                                                                                                         |
| --------------- | ------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `lazy_refresh`  | number | `1`     | Seconds to wait before re-rendering after a state change; resets if another event arrives during the wait; `0` = render immediately |
| `fixed_refresh` | number | `60`    | Re-render every N seconds regardless of events; `0` = disabled                                                                      |

### Stock entry

| Field    | Type    | Default  | Description                                                                                         |
| -------- | ------- | -------- | --------------------------------------------------------------------------------------------------- |
| `symbol` | string  | required | Yahoo Finance symbol slug (lowercase, see [Symbol naming](#symbol-naming))                          |
| `name`   | string  | required | Display name shown in the name column                                                               |
| `icon`   | string  | —        | Icon character shown before the name; overrides `icons: auto` detection or adds an icon when `none` |
| `mark`   | string  | —        | CSS color applied as the row background (e.g. `"gold"`, `"#1a1a2e"`)                                |
| `star`   | boolean | `false`  | Appends a fixed `★` suffix after the name (independent of `icon`/`mark`)                            |

#### Auto icon detection (`icons: auto`)

| Symbol pattern    | Examples                                                   | Icon | Type      |
| ----------------- | ---------------------------------------------------------- | ---- | --------- |
| ends `_f`         | `gc_f`, `bz_f`, `cl_f`, `ng_f`                             | `◆`  | Commodity |
| ends `_x`         | `usdpln_x`, `usdjpy_x`                                     | `¤`  | FX pair   |
| known index list  | `dji`, `gspc`, `ixic`, `dax`, `ftse`, `n225`, `tnx`, `vix` | `△`  | Index     |
| known crypto base | `btc_usd`, `eth_usd`, `sol_usd`                            | `⬢`  | Crypto    |
| everything else   | `aapl`, `tsla`, `brk_a`                                    | —    | Equity    |

### Colors

The card uses one color per market state, applied as the **Price** text color, the **Pre/Post**
column background during pre/post sessions, and the **1d%** column background during regular hours.

```yaml
type: custom:ha-yahoofinance-board-card
colors:
  pre: "#d4af37"
  postpost: indigo
```

| `colors:` key | When                                | Default                          |
| ------------- | ----------------------------------- | -------------------------------- |
| `prepre`      | Pre-pre market                      | lightblue                        |
| `pre`         | Pre-market                          | khaki                            |
| `regular`     | Normal trading hours                | `--primary-text-color` (theme)   |
| `post`        | Post-market                         | plum                             |
| `postpost`    | Post-post market                    | darkslateblue                    |
| `unknown`     | Entity unavailable or state missing | `--secondary-text-color` (theme) |

## Symbol naming

Entity IDs follow the pattern `sensor.yahoofinance_<slug>` where `<slug>` is derived from the Yahoo
Finance ticker:

| Ticker    | Slug      | Entity ID                     |
| --------- | --------- | ----------------------------- |
| `^DJI`    | `dji`     | `sensor.yahoofinance_dji`     |
| `BRK-A`   | `brk_a`   | `sensor.yahoofinance_brk_a`   |
| `GC=F`    | `gc_f`    | `sensor.yahoofinance_gc_f`    |
| `AMS.MC`  | `ams_mc`  | `sensor.yahoofinance_ams_mc`  |
| `BTC-USD` | `btc_usd` | `sensor.yahoofinance_btc_usd` |

<!-- Reference links -->

[ci]:
  https://github.com/marcintk/ha-yahoofinance-board-card/actions/workflows/card-build-and-test.yml
[ci-shield]:
  https://img.shields.io/github/actions/workflow/status/marcintk/ha-yahoofinance-board-card/card-build-and-test.yml?branch=main&label=Build%20and%20Test
[codeql]: https://github.com/marcintk/ha-yahoofinance-board-card/security/code-scanning
[codeql-shield]:
  https://img.shields.io/github/actions/workflow/status/marcintk/ha-yahoofinance-board-card/codeql-analysis.yml?branch=main&label=CodeQL
[commits]: https://github.com/marcintk/ha-yahoofinance-board-card/commits/main
[coverage-shield]: https://img.shields.io/badge/coverage-100%25-brightgreen
[demo-img]: https://raw.githubusercontent.com/marcintk/ha-yahoofinance-board-card/main/docs/demo.gif
[discussions]: https://github.com/marcintk/ha-yahoofinance-board-card/discussions
[downloads-shield]:
  https://img.shields.io/github/downloads/marcintk/ha-yahoofinance-board-card/total?label=downloads
[hacs]: https://hacs.xyz
[hacs-shield]: https://img.shields.io/badge/HACS-Default-41BDF5.svg
[issues]: https://github.com/marcintk/ha-yahoofinance-board-card/issues
[issues-shield]: https://img.shields.io/github/issues/marcintk/ha-yahoofinance-board-card
[last-commit-shield]: https://img.shields.io/github/last-commit/marcintk/ha-yahoofinance-board-card
[license]: https://github.com/marcintk/ha-yahoofinance-board-card/blob/main/LICENSE
[license-shield]: https://img.shields.io/github/license/marcintk/ha-yahoofinance-board-card.svg
[new-issue]: https://github.com/marcintk/ha-yahoofinance-board-card/issues/new
[prs]: https://github.com/marcintk/ha-yahoofinance-board-card/pulls
[prs-shield]: https://img.shields.io/github/issues-pr/marcintk/ha-yahoofinance-board-card
[releases]: https://github.com/marcintk/ha-yahoofinance-board-card/releases
[releases-shield]: https://img.shields.io/github/release/marcintk/ha-yahoofinance-board-card.svg
[repo]: https://github.com/marcintk/ha-yahoofinance-board-card
[scorecard]:
  https://securityscorecards.dev/viewer/?uri=github.com/marcintk/ha-yahoofinance-board-card
[scorecard-shield]:
  https://img.shields.io/ossf-scorecard/github.com/marcintk/ha-yahoofinance-board-card?label=OpenSSF&style=flat
[socket]: https://github.com/marcintk/ha-yahoofinance-board-card/blob/main/socket.yml
[socket-shield]: https://img.shields.io/badge/Socket.dev-Firewall%20%2B%20Scanning-fb3387.svg
