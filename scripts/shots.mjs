// Visual QA: screenshot every station at laptop and phone width.
//   node scripts/shots.mjs [outDir]
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = process.argv[2] ?? "shots";

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
    await page.screenshot({ path: `${OUT}/${sizeName}-${name}.png` });
    console.log(`${sizeName}-${name}.png`);
  }
  await ctx.close();
}

await browser.close();
