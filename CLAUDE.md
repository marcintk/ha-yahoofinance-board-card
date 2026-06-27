@node_modules/ha-shared/CLAUDE-SHARED.md @package.json @TODO.md

# ha-yahoofinance-board-card

## Module Map

Every `src/*.ts` module has a corresponding `test/*.test.ts`. New source files must ship with their
test file. Shared interfaces and types live in `src/types.ts`; global declarations
(`__CARD_VERSION__`, `Window.customCards`) are in `src/global.d.ts`. `src/types.ts` is the one
exception — it has no test file.

## Architecture Notes

- **Shadow DOM rendering**: `render()` targets the `ShadowRoot` stored at construction. Only the
  dynamic parts of the template are patched on each render — static structure is cloned from a
  cached template.
- **WebSocket subscription**: card subscribes to `state_changed` events on first `set hass`;
  callback calls `_scheduleRender()`, which arms a debounce timer (`_renderTimer`). Rendering always
  uses `_hass.states`, not the event payload.
- **Entity tracking**: `_trackedIds` (Set) is built from `pinned` and `sorted` symbol lists. Rebuilt
  on `setConfig` and first `set hass`.
- **Pinned vs sorted sections**: `pinned` stocks are rendered in configured order; `sorted` stocks
  are sorted by `regularMarketChangePercent` descending (top gainers at the top).
- **Data column cycling**: the `data` column rotates through PE/FPE/DivRate/Volume via an internal
  `_dataTimer` that increments `_dataIndex` (0–3) every `data_rotate_every` seconds (default 60).
- **Market states**: `PREPRE`, `PRE`, `REGULAR`, `POST`, `POSTPOST` — each drives different price
  source, prepost column color/background, and name color.
- **Security**: user-supplied values are bound via DOM APIs (attribute sets, text nodes) — not
  string-concatenated into HTML — so special characters cannot break out of their context regardless
  of content.
