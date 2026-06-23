# TODO

Open issues found during codebase audit. Each item should go through a branch + PR per the Contributing guidelines.

## Dead Code

- [x] `MARKET_STATES` in `src/utils.ts` is never imported by any source file — replaced with `isPreMarket`/`isPostMarket` helpers

## Duplication

- [x] Pre/post market state check pattern duplicated in `priceText`, `prepostText` (`src/format.ts`), and `prepostColor` (`src/display.ts`) — extracted `isPreMarket`/`isPostMarket` into `src/utils.ts` and all three callsites updated
- [x] Dash span `html<span style="color:gray;">-</span>` duplicated in `_dataVal` and `_volumeVal` (`src/format.ts`) — hoisted to module-level `_DASH` constant

## Coupling / Fragility

- [x] `% 4` modulus in `_startDataTimer` (`src/index.ts`) silently coupled to `DATA_LABELS.length` — `DATA_LABELS` now exported from `src/render.ts` and modulus derived from `.length`

## Minor Correctness

- [x] `SubscriptionManager._unsub` (`src/subscription.ts`) missing `private` — fixed
- [x] `dataText` (`src/format.ts`) returned empty template for unrecognised `signalState` — now returns `_DASH`

## Test Code Quality

- [x] `doc` warmup function (`test/format.test.ts`) existed only to suppress an import warning — removed along with `void doc` suppressor
