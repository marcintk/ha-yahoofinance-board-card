#!/usr/bin/env node
// Regenerates docs/demo.gif.
//
// Serves the repo root over HTTP, opens scripts/demo/record-harness.html in headless
// Chromium (Playwright), and samples page screenshots at a fixed cadence so the
// card's own transitions (data-column rotation, live re-sort, market-state color
// change) read as motion. Two-pass ffmpeg palette encode → docs/demo.gif.
//
// Read-only against the repo: never writes to src/, dist/ (rebuild with `npm run
// build`), or docs/* other than the output gif. See scripts/demo/record-demo.json
// for the full recipe.
//
// Usage:  npm run demo:record  [-- --out <gif-path>]
// Prereqs: `npm run build` (dist/card.js must be current); ffmpeg on PATH;
//          `npx playwright install chromium` once.

import { execFileSync } from "node:child_process";
import { createReadStream, existsSync, mkdtempSync, rmSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { chromium } from "playwright";

const ROOT = new URL("../..", import.meta.url).pathname;
const HARNESS_PATH = "/scripts/demo/record-harness.html";
const VIEW_WIDTH = 700;
const FPS = 10;
const OUT_WIDTH = 460; // final gif width; height follows the card's own box (more rows = taller)

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

function serveRoot() {
  const server = http.createServer((req, res) => {
    const filePath = join(ROOT, decodeURIComponent(req.url.split("?")[0]));
    if (!filePath.startsWith(ROOT) || !existsSync(filePath)) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[extname(filePath)] ?? "application/octet-stream" });
    createReadStream(filePath).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const FRAME_MS = 1000 / FPS;

function makeDriver(page, framesDir, clip) {
  let frame = 0;
  const shoot = () =>
    page.screenshot({ path: join(framesDir, `f${String(frame++).padStart(4, "0")}.png`), clip });
  // pace to the target FPS so wall-clock advances with the frame count — the data
  // column rotates on a real setInterval, so wall time needs to pass for it to fire
  // on camera
  const hold = async (n) => {
    for (let i = 0; i < n; i++) {
      const t = Date.now();
      await shoot();
      await sleep(Math.max(0, FRAME_MS - (Date.now() - t)));
    }
  };
  return { hold, frameCount: () => frame };
}

async function runScenario(page, d) {
  await d.hold(15); // rest on the initial render

  // four scripted market ticks (see TICKS in record-harness.html), each holding
  // long enough to read the price/rate changes and, on ticks 2 and 4, the sorted
  // section re-ranking live
  for (let i = 1; i <= 4; i++) {
    await page.evaluate((n) => window.__tick(n), i);
    await d.hold(15);
  }

  await d.hold(10); // resting frames before the loop point
}

async function main() {
  const outArg = process.argv.indexOf("--out");
  const outPath = outArg !== -1 ? process.argv[outArg + 1] : join(ROOT, "docs", "demo.gif");

  if (!existsSync(join(ROOT, "dist", "card.js"))) {
    throw new Error("dist/card.js missing — run `npm run build` first");
  }

  const framesDir = mkdtempSync(join(tmpdir(), "yfbc-demo-frames-"));
  const server = await serveRoot();
  const port = server.address().port;

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: VIEW_WIDTH, height: 800 },
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  try {
    await page.goto(`http://127.0.0.1:${port}${HARNESS_PATH}`);
    for (let i = 0; i < 40; i++) {
      if (await page.evaluate(() => window.__ready === true)) break;
      await sleep(250);
    }
    await sleep(300); // let web fonts settle

    const box = await page.evaluate(() =>
      document.getElementById("wrap").getBoundingClientRect().toJSON()
    );
    const clip = {
      x: Math.round(box.x),
      y: Math.round(box.y),
      // floor to an even number: rounding up can capture a 1px sliver of the
      // page background below the card's bottom edge (reads as a dark line)
      width: Math.floor(box.width / 2) * 2,
      height: Math.floor(box.height / 2) * 2,
    };
    console.log("clip", clip);

    const d = makeDriver(page, framesDir, clip);
    await runScenario(page, d);
    console.log("frames", d.frameCount());
  } finally {
    await context.close();
    await browser.close();
    server.close();
  }

  const palette = join(framesDir, "palette.png");
  execFileSync("ffmpeg", [
    "-y", "-loglevel", "error",
    "-framerate", String(FPS),
    "-i", join(framesDir, "f%04d.png"),
    "-vf", `scale=${OUT_WIDTH}:-2:flags=lanczos,palettegen=max_colors=128:stats_mode=diff`,
    palette,
  ]);
  execFileSync("ffmpeg", [
    "-y", "-loglevel", "error",
    "-framerate", String(FPS),
    "-i", join(framesDir, "f%04d.png"),
    "-i", palette,
    "-lavfi", `scale=${OUT_WIDTH}:-2:flags=lanczos[s];[s][1:v]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`,
    outPath,
  ]);

  rmSync(framesDir, { recursive: true, force: true });
  console.log(`wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
