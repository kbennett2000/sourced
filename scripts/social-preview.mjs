// Renders docs/social-preview.html to a 1280x640 PNG (GitHub social preview).
//   node scripts/social-preview.mjs
import { chromium } from "playwright";
import { resolve } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { statSync } from "node:fs";
import sharp from "sharp";

const HTML = resolve("docs/social-preview.html");
const OUT = "docs/social-preview.png";
const MAX_BYTES = 250 * 1024;

let browser;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
} catch {
  browser = await chromium.launch({ headless: true });
}
const page = await browser.newPage({
  viewport: { width: 1280, height: 640 },
  deviceScaleFactor: 1,
});
await page.goto(`file://${HTML}`, { waitUntil: "load" });
await page.waitForTimeout(150);
await page.screenshot({ path: OUT });
await browser.close();

let meta = await sharp(OUT).metadata();
if (statSync(OUT).size > MAX_BYTES) {
  const buf = await sharp(await readFile(OUT)).png({ compressionLevel: 9, palette: true }).toBuffer();
  await writeFile(OUT, buf);
}
meta = await sharp(OUT).metadata();
const size = statSync(OUT).size;
console.log(`wrote ${OUT}: ${meta.width}x${meta.height}, ${(size / 1024).toFixed(0)}KB`);
if (meta.width !== 1280 || meta.height !== 640) {
  console.error("ERROR: expected exactly 1280x640");
  process.exit(1);
}
