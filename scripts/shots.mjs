// Visual QA + README screenshots: every station at laptop and phone width,
// plus a hero shot of The Line with a gap station's detail panel open.
// Fresh browser contexts have empty storage, so every shot is the seeded demo.
//   node scripts/shots.mjs [outDir]     (default: docs/screenshots)
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = process.argv[2] ?? "docs/screenshots";

const ROUTES = [
  ["boarding-pass", "/boarding-pass"],
  ["line", "/line"],
  ["timetable", "/timetable"],
  ["project-depot", "/project-depot"],
  ["interview-booth", "/interview-booth"],
  ["departures", "/departures"],
];

const SIZES = [
  ["laptop", { width: 1440, height: 900 }],
  ["phone", { width: 390, height: 844 }],
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

for (const [sizeName, viewport] of SIZES) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  for (const [name, route] of ROUTES) {
    await page.goto(BASE + route, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200); // let fonts settle and transitions finish
    if (name === "boarding-pass") {
      // The seeded ticket sits below the empty-state card; bring it into frame.
      await page.getByText("Sam Okafor").first().scrollIntoViewIfNeeded();
      await page.getByText("Sam Okafor").first().evaluate((el) => el.scrollIntoView({ block: "start" }));
      await page.waitForTimeout(900);
    }
    if (name === "timetable") {
      await page.getByText("Script to service").first().evaluate((el) => el.scrollIntoView({ block: "start" }));
      await page.waitForTimeout(900);
    }
    await page.screenshot({ path: `${OUT}/${sizeName}-${name}.png` });
    console.log(`${sizeName}-${name}.png`);
  }
  await ctx.close();
}

// Hero: The Line with the RAG pipelines station open.
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(BASE + "/line", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: /^RAG pipelines, gap/ }).first().click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/hero-line-gap-detail.png` });
  console.log("hero-line-gap-detail.png");
  await ctx.close();
}

await browser.close();
