@node_modules/ha-card-shared/CLAUDE-SHARED.md

# ha-yahoofinance-board-card

## Design Invariants

Durable visual/UX constraints. Preserve unless the user explicitly changes them.

- Pinned stocks always render in user-configured order — never auto-sorted
- Sorted stocks always rank by `regularMarketChangePercent` descending (top gainers first)
- Data column cycles in fixed order: PE → FPE → DivRate → Volume
- Market state (PREPRE/PRE/REGULAR/POST/POSTPOST) drives price source, prepost column
  color/background, and name color — all three change together
- User-supplied values bound via DOM APIs only — never string-concatenated into HTML

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
