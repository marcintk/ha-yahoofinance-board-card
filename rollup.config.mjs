import { cardBundle } from "ha-card-shared/rollup.base.mjs";

const config = cardBundle();
config.output.file = "dist/ha-yahoofinance-board-card.js";

export default config;
