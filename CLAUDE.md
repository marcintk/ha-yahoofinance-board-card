# Development

```bash
npm install
npm run build          # bundle src/ → dist/card.js
npm run build:prod     # minified production build
npm run dev            # watch mode
npm test               # run tests
npm run test:coverage  # run tests with coverage report
npm run check          # biome lint + format (src/ and test/)
npm run format:md      # prettier for markdown files
```

Source is in `src/`, built output is `dist/card.js`. The dist file is **not committed** — it is
built by CI on every release and attached as a GitHub Release asset that HACS downloads.

## Module Map

Every `src/*.js` module has a corresponding `test/*.test.js`. New source files must ship with their
test file.

| Source file           | Test file                   | Responsibility                                                                                  |
| --------------------- | --------------------------- | ----------------------------------------------------------------------------------------------- |
| `src/index.js`        | `test/index.test.js`        | Custom element class, HA lifecycle hooks, entity cache, render orchestration                    |
| `src/debug.js`        | `test/debug.test.js`        | `DebugMetrics` — event/filter/render counters with time-window bucketing; debug overlay HTML    |
| `src/subscription.js` | `test/subscription.test.js` | `SubscriptionManager` — WebSocket subscribe/unsubscribe with stale-gen guard                    |
| `src/render.js`       | `test/render.test.js`       | `headerHtml()`, `stockRowHtml()`, `pinnedHtml()`, `sortedHtml()` — HTML generation              |
| `src/display.js`      | `test/display.test.js`      | Pure color helpers: `rateColor()`, `nameColor()`, `prepostColor()`, `prepostBg()`, `changeBg()` |
| `src/format.js`       | `test/format.test.js`       | Text formatters: `formatRate()`, `formatPrice()`, `priceText()`, `prepostText()`, `dataText()`  |
| `src/styles.js`       | `test/styles.test.js`       | CSS string exported as `CARD_STYLES`, injected into Shadow DOM on each render                   |
| `src/utils.js`        | `test/utils.test.js`        | `esc()` — HTML escaping, `MARKET_STATES` — valid market state set                               |

## Architecture Notes

- **Shadow DOM / full replacement**: `shadowRoot.innerHTML` is fully replaced on every render — no
  diffing. Fast enough for ~40 rows max.
- **WebSocket subscription**: card subscribes to `state_changed` events on first `set hass`;
  callback calls `_scheduleRender()`, which arms a debounce timer (`_renderTimer`). Rendering always
  uses `_hass.states`, not the event payload.
- **Entity tracking**: `_trackedIds` (Set) is built from `pinned` and `sorted` symbol lists plus the
  `refresh_signal` entity. Rebuilt on `setConfig` and first `set hass`.
- **Pinned vs sorted sections**: `pinned` stocks are rendered in configured order; `sorted` stocks
  are sorted by `regularMarketChangePercent` descending (top gainers at the top).
- **Data column cycling**: the `data` column shows rotating content (PE/FPE/DivRate/Volume)
  controlled by the `refresh_signal` entity state (0-3).
- **Market states**: `PREPRE`, `PRE`, `REGULAR`, `POST`, `POSTPOST` — each drives different price
  source, prepost column color/background, and name color.
- **Security**: all user-supplied strings go through `esc()` before HTML insertion.

## Contributing

> **Never commit directly to `main`.** Every change — features, bug fixes, docs, config — must go
> through a pull request. Create a branch first, then open a PR against `main`.

```bash
git checkout -b feat/my-feature   # or fix/, docs/, chore/ as appropriate
# ... make changes ...
git push -u origin feat/my-feature
gh pr create
```

CI runs build, lint, and tests automatically on every PR.

Every new feature or bug fix must include associated tests. Coverage thresholds are enforced at 100%
for statements, branches, functions, and lines — `npm run test:coverage` will fail (and block CI) if
coverage drops below that.

### PR discipline

- **One concern per PR.** A refactor PR must not bundle feature changes; a feature PR must not
  include unrelated refactors.
- **Never push or merge without explicit permission.** Do not run `git push`, `gh pr create`, or
  merge a PR unless the user explicitly asks.
- **Verify docs before every PR.** Check that `README.md` and `CLAUDE.md` reflect any behavior
  changes — updated option defaults, new config keys, changed architecture.
- **Release cadence.** After three to five merged PRs, recommend cutting a release. Never trigger
  the release workflow autonomously.

## TDD Workflow

For every fix or feature: **write the failing test first**, confirm it fails (`npm test`), then
implement the fix/feature until it passes.

## Releasing

Push a semver tag — the release workflow fires automatically:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow runs `npm test`, builds `dist/card.js` with the version injected from the tag, and
publishes a GitHub Release with `dist/card.js` as an asset that HACS downloads.

`package.json` version is a permanent `0.0.0-dev` placeholder and is never changed. The tag is the
single source of truth for the version.
