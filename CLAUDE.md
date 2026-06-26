@package.json @TODO.md

# Development

```bash
npm install
npm run build          # bundle src/ → dist/card.js
npm run build:prod     # minified production build
npm run dev            # watch mode
npm test               # run tests
npm run test:coverage  # run tests with coverage report
npm run typecheck      # tsc --noEmit (type check only, no emit)
npm run check          # biome lint + format (src/ and test/)
npm run format:md      # prettier for markdown files
```

Source is in `src/`, built output is `dist/card.js`. The dist file is **not committed** — it is
built by CI on every release and attached as a GitHub Release asset that HACS downloads.

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
- **Always wait for GHA before closing a topic.** After a PR is merged (or a tag is pushed), run
  `gh run list --limit 5` and wait for all triggered workflows to complete. Do not declare a task
  done or move on until every run shows `✓`. If a run fails, investigate and fix before closing.
- **Release cadence.** After three to five merged PRs, recommend cutting a release. Never trigger
  the release workflow autonomously.

## TDD Workflow

For every fix or feature: **write the failing test first**, confirm it fails (`npm test`), then
implement the fix/feature until it passes.

## Releasing

Before tagging a release, verify `main` CI is green:

```bash
gh run list --branch main --limit 5   # all runs must show ✓
```

Then push a semver tag — the release workflow fires automatically:

```bash
git tag v1.0.0
git push origin v1.0.0
```

After pushing the tag, wait for the `Publish Release` workflow to complete before declaring the
release done (`gh run list --limit 5`).

The workflow runs `npm test`, builds `dist/card.js` with the version injected from the tag, and
publishes a GitHub Release with `dist/card.js` as an asset that HACS downloads.

`package.json` version is a permanent `0.0.0-dev` placeholder and is never changed. The tag is the
single source of truth for the version.
