import { cardBundle } from "ha-card-shared/rollup.base.mjs";

// ha-card-shared >= v2 names the bundle after the package. This card ships as
// dist/card.js (see hacs.json "filename" and the README resource URL), so pin it.
const config = cardBundle();
config.output.file = "dist/card.js";

export default config;
